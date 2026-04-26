# 🚀 Simple Crew Builder

![Simple Crew Builder](images/simple-crew-builder.png)

[![Coverage](https://img.shields.io/badge/Coverage->88%25-brightgreen)](#-quality--testing-elite-standards)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Simple Crew Builder** is a premium, open-source visual orchestrator for **CrewAI and LangGraph**. It empowers developers and AI enthusiasts to design, configure, and execute complex Multi-Agent systems through a stunning, intuitive drag-and-drop interface.

> "The best way to predict the future is to invent it." — Alan Kay

---

## ✨ Enterprise Features (v0.0.7+)

Simple Crew Builder has evolved into a robust multi-framework orchestration platform with advanced observability, RAG intelligence, and integration capabilities:

- **🔄 Multi-Framework Orchestration**: Create, run, and export workspaces leveraging either **CrewAI** (sequential/hierarchical) or **LangGraph** (cyclic, state-based routing) dynamically from a single interface.
- **🧠 Agent Skill Library & Smart Graph RAG**: Import specialized Markdown skills directly from **[skills.sh](https://skills.sh/)**. Our Dual-Ingestion engine automatically chunks and vectorizes knowledge into Neo4j, allowing agents to semantically search their "Skill Library" at runtime without blowing up context windows.
- **🛠️ MCP & Custom Tooling**: Native integration with the Model Context Protocol (MCP) servers and safe local file-system (FS) tools for powerful agent actions.
- **🔗 Dynamic Webhook & Chat Triggers**: Direct integration with UI chats or automation tools like n8n/Make. Configure custom paths with automatic sluggification and real-time mapping of incoming JSON payloads to Graph States.
- **👁️ Execution Observability & Time Machine**: A dedicated dashboard to monitor every run. Includes visual snapshots of the graph state, logs, and a **One-click Re-run Snapshot** to hydrate the workspace from any historical execution.
- **🎨 Visual & Architecture Export**: Dagre auto-layout for messy workflows, interactive node state feedback during execution, and native **Mermaid Diagram (PNG/SVG) export** for documentation.

---

> [!CAUTION]
> ### ⚠️ Migration & Data Safety (v0.0.6 → v0.0.7)
> 
> Before upgrading to `v0.0.7`, please **backup your Workflows and databases**. If deployment discrepancies appear or if you encounter issues pulling the latest image, you may need to run `docker compose down -v` to clear previous volume caches, but **this will permanently delete all local data**. Only perform this action if your data is safely backed up.

---

## 🚀 Quick Start (Zero Friction)

Experience the power of Simple Crew Builder in less than 2 minutes using Docker Hub images.

### 1. Download the orchestration file
Save the [docker-compose.yml](docker-compose.yml) to a folder on your machine.

### 2. Launch the stack
```bash
docker compose up -d
```
*Note: No .env file is required for local testing. The system uses secure defaults.*

### 3. Access & Gear Up
Open http://localhost:8080 and go to Settings -> Models to add your `OPENAI_API_KEY`.

---

## 🛠 Local Development (Manual Setup)
For developers looking to contribute or customize the core engine, follow these steps to run the environment locally.

### 1. External Dependencies (Databases)
The easiest way to run Postgres and Neo4j for local development is using our dev-ready compose file:

```bash
docker compose -f docker-compose.dev.yml up -d db neo4j
```

### 2. Backend Setup (Python via uv)
```bash
cd simple-crew-backend
# Create & activate virtualenv
uv venv
source .venv/bin/activate  # Linux/macOS
# .\.venv\Scripts\activate  # Windows

# Install dependencies
uv sync

# Run server with hot reload
uv run uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (React)
```bash
cd simple-crew-front
npm install --legacy-peer-deps
npm run dev
```
The frontend will be available at http://localhost:5173.

---

## 🏆 Quality & Testing (Elite Standards)
We maintain high architectural standards to ensure stability in complex AI workflows.

### Coverage & Reliability
We follow an Elite Coverage (>80%) standard for all new components and logic slices, achieving a 100% pass rate on our critical E2E flows.

*Frontend Tests:* Powered by Vitest, React Testing Library, and Playwright (E2E).

*Coverage Command:*
```bash
cd simple-crew-front
npm run test:coverage
```

---

## 🧰 Tech Stack
*   **Orchestration:** CrewAI & LangGraph
*   **Frontend Architecture:** React 19 + Zustand (Slices Pattern) + Vite + Tailwind CSS v4
*   **Backend:** FastAPI (Python 3.12) + Pydantic v2
*   **Testing:** Vitest + Playwright (E2E)
*   **Persistence:** PostgreSQL 15 + Neo4j 5.23 (Vector Graph RAG)
*   **Visuals:** React Flow + Mermaid.js + Dagre

## 🐳 Docker Architecture

```mermaid
graph TD
    User([User Browser]) -- port 8080 --> Frontend[Frontend - Nginx Proxy]
    Frontend -- /api/* --> Backend[Backend - FastAPI]
    Backend -- SQL --> DB[(PostgreSQL)]
    Backend -- Vector/Graph --> Neo4j[(Neo4j DB)]
```

---

## 🤝 Contributing
This is an Open Source project and we ❤️ contributions!

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch.
5. Open a Pull Request.

## 👨💻 Author
Created with ❤️ by Gleison Souza

## 📜 License
Distributed under the MIT License. See LICENSE for more information.

*Let your imagination run wild and build the future of AI agents today!*
