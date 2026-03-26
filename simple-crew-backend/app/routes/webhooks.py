import copy
import hmac
import json as _json
import os
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlmodel import Session, select

from ..crew_builder import run_crew_sync
from ..database import engine, get_session
from ..models import CrewProject, ExecutionStatus, TriggerType, WebhookConfig, Execution
from ..schemas import (
    GraphData,
    WebhookConfigCreate,
    WebhookConfigRead,
    WebhookConfigUpdate,
    ExecutionRead,
)

router = APIRouter(prefix="/api/v1", tags=["webhooks"])

HOST = os.getenv("HOST", "http://localhost:8000")


def _build_config_response(config: WebhookConfig) -> WebhookConfigRead:
    secret_masked: Optional[str] = None
    if config.secret:
        secret_masked = "••••••••"
    return WebhookConfigRead(
        id=str(config.id),
        project_id=str(config.project_id),
        webhook_id=config.webhook_id,
        url=f"{HOST}/api/v1/trigger/{config.webhook_id}",
        secret=secret_masked,
        field_mappings=config.field_mappings or {},
        is_active=config.is_active,
        wait_for_result=config.wait_for_result,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("/webhooks", response_model=WebhookConfigRead)
def provision_webhook(body: WebhookConfigCreate, session: Session = Depends(get_session)):
    """Provision (idempotent) a webhook config for a project."""
    project_id = uuid.UUID(str(body.project_id))
    project = session.get(CrewProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = session.exec(
        select(WebhookConfig).where(WebhookConfig.project_id == project_id)
    ).first()
    if existing:
        return _build_config_response(existing)

    config = WebhookConfig(
        project_id=project_id,
        webhook_id=uuid.uuid4().hex,
        field_mappings={},
    )
    session.add(config)
    session.commit()
    session.refresh(config)
    return _build_config_response(config)


@router.get("/webhooks/{project_id}", response_model=WebhookConfigRead)
def get_webhook_config(project_id: str, session: Session = Depends(get_session)):
    pid = uuid.UUID(project_id)
    config = session.exec(
        select(WebhookConfig).where(WebhookConfig.project_id == pid)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook config not found")
    return _build_config_response(config)


@router.patch("/webhooks/{project_id}", response_model=WebhookConfigRead)
def update_webhook_config(
    project_id: str, body: WebhookConfigUpdate, session: Session = Depends(get_session)
):
    pid = uuid.UUID(project_id)
    config = session.exec(
        select(WebhookConfig).where(WebhookConfig.project_id == pid)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook config not found")

    if body.field_mappings is not None:
        config.field_mappings = body.field_mappings
    if body.secret is not None:
        config.secret = body.secret
    if body.is_active is not None:
        config.is_active = body.is_active
    if body.wait_for_result is not None:
        config.wait_for_result = body.wait_for_result

    session.add(config)
    session.commit()
    session.refresh(config)
    return _build_config_response(config)


@router.post("/webhooks/{project_id}/rotate-secret")
def rotate_webhook_secret(project_id: str, session: Session = Depends(get_session)):
    """Generate a new HMAC secret and return it once (raw)."""
    pid = uuid.UUID(project_id)
    config = session.exec(
        select(WebhookConfig).where(WebhookConfig.project_id == pid)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook config not found")

    new_secret = uuid.uuid4().hex + uuid.uuid4().hex
    config.secret = new_secret
    session.add(config)
    session.commit()
    return {"secret": new_secret}


def _resolve_dot_path(data: dict, path: str):
    """Resolve 'payload.data.topic' in a nested dict."""
    for key in path.split("."):
        if not isinstance(data, dict) or key not in data:
            return None
        data = data[key]
    return data


def _try_parse_json(value: Optional[str]) -> Any:
    if not value:
        return value
    try:
        return _json.loads(value)
    except Exception:
        return value


def _map_payload_to_inputs(payload: dict, field_mappings: dict) -> dict:
    return {
        crew_var: _resolve_dot_path(payload, path)
        for crew_var, path in field_mappings.items()
    }


def _run_background_task(execution_id: str, graph_data: GraphData, workspace_id: Optional[str]):
    with Session(engine) as session:
        execution = session.get(Execution, uuid.UUID(execution_id))
        if not execution:
            return

        execution.status = ExecutionStatus.RUNNING
        execution.started_at = datetime.now(timezone.utc)
        session.add(execution)
        session.commit()

        try:
            result = run_crew_sync(graph_data, workspace_id)
            execution.result = str(result)
            execution.status = ExecutionStatus.SUCCESS
        except Exception as e:
            execution.error = f"{str(e)}\n{traceback.format_exc()}"
            execution.status = ExecutionStatus.ERROR
        finally:
            execution.finished_at = datetime.now(timezone.utc)
            session.add(execution)
            session.commit()


@router.post("/trigger/{webhook_id}")
async def trigger_webhook(
    webhook_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    config = session.exec(
        select(WebhookConfig).where(WebhookConfig.webhook_id == webhook_id)
    ).first()

    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="Webhook not found or inactive")

    # Token validation
    if config.secret:
        token = request.headers.get("X-Webhook-Token", "")
        if not hmac.compare_digest(config.secret, token):
            execution = Execution(
                trigger_type=TriggerType.WEBHOOK,
                webhook_id=webhook_id,
                project_id=config.project_id,
                status=ExecutionStatus.ERROR,
                error="Invalid webhook token",
                started_at=datetime.now(timezone.utc),
                finished_at=datetime.now(timezone.utc),
            )
            session.add(execution)
            session.commit()
            raise HTTPException(status_code=401, detail="Invalid webhook token")

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    resolved_inputs = _map_payload_to_inputs(payload, config.field_mappings or {})

    project = session.get(CrewProject, config.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Inject resolved inputs into canvas_data crew node inputs
    canvas_data = copy.deepcopy(project.canvas_data)
    nodes = list(canvas_data.get("nodes", []))
    for node in nodes:
        if isinstance(node, dict) and node.get("type") == "crew":
            existing_inputs = node.get("data", {}).get("inputs", {}) or {}
            merged = {**existing_inputs, **resolved_inputs}
            node.setdefault("data", {})["inputs"] = merged
    canvas_data["nodes"] = nodes

    graph_data = GraphData(**canvas_data)

    execution = Execution(
        trigger_type=TriggerType.WEBHOOK,
        webhook_id=webhook_id,
        project_id=config.project_id,
        status=ExecutionStatus.PENDING,
        inputs_received=resolved_inputs,
        raw_payload=payload if payload else None,
        field_mappings_used=dict(config.field_mappings) if config.field_mappings else None,
        wait_for_result=config.wait_for_result,
    )
    session.add(execution)
    session.commit()
    session.refresh(execution)

    execution_id = str(execution.id)
    workspace_id = str(project.workspace_id) if project.workspace_id else None

    if config.wait_for_result:
        # Synchronous mode: execute inline and return result
        execution.status = ExecutionStatus.RUNNING
        execution.started_at = datetime.now(timezone.utc)
        session.add(execution)
        session.commit()

        try:
            result = run_crew_sync(graph_data, workspace_id)
            execution.result = str(result)
            execution.status = ExecutionStatus.SUCCESS
        except Exception as e:
            execution.error = f"{str(e)}\n{traceback.format_exc()}"
            execution.status = ExecutionStatus.ERROR
        finally:
            execution.finished_at = datetime.now(timezone.utc)
            session.add(execution)
            session.commit()

        return {
            "execution_id": execution_id,
            "status": execution.status.value,
            "result": _try_parse_json(execution.result),
            "error": execution.error,
        }

    # Async mode: fire and forget
    background_tasks.add_task(
        _run_background_task, execution_id, graph_data, workspace_id
    )
    return {"execution_id": execution_id, "status": "pending"}


@router.get("/executions/{execution_id}", response_model=ExecutionRead)
def get_execution(execution_id: str, session: Session = Depends(get_session)):
    execution = session.get(Execution, uuid.UUID(execution_id))
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.get("/executions", response_model=List[ExecutionRead])
def list_executions(
    project_id: Optional[str] = Query(default=None),
    webhook_id: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(Execution)
    if project_id:
        query = query.where(Execution.project_id == uuid.UUID(project_id))
    elif webhook_id:
        query = query.where(Execution.webhook_id == webhook_id)
    return session.exec(query.order_by(Execution.created_at.desc())).all()
