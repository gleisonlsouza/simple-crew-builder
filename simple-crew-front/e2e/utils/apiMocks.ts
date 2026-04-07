import { Page } from '@playwright/test';

/**
 * Common API mocks for SimpleCrew E2E tests.
 * Centralizing routes avoids duplication and eases updates.
 */
export async function setupBaseApiMocks(page: Page, mockDataOverrides: any = {}) {
  // 1. Core Projects List
  const baseProject = {
    id: 'smoke-test-id',
    name: 'Smoke Test Project',
    description: 'A project for E2E testing',
    updated_at: new Date().toISOString(),
    canvas_data: {
      nodes: [
        {
          id: 'agent-1',
          type: 'agent',
          position: { x: 100, y: 100 },
          data: {
            name: 'Test Agent',
            role: 'Tester',
            goal: 'Wait for nodes',
            backstory: 'Expert in synchronization',
            temperature: 0.7,
            code_execution_mode: 'disabled'
          }
        },
        {
          id: 'task-1',
          type: 'task',
          position: { x: 400, y: 100 },
          data: {
            name: 'Test Task',
            description: 'Verify node presence',
            expected_output: 'Success'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'agent-1', target: 'task-1', type: 'deletable', sourceHandle: 'right-source', targetHandle: 'left-target' }
      ],
      customTools: [],
      mcpServers: [],
      version: '1.0'
    }
  };

  const project = { ...baseProject, ...mockDataOverrides.project };
  const projects = mockDataOverrides.projects !== undefined ? mockDataOverrides.projects : [project];

  // Mock project list and creation
  await page.route('**/api/v1/projects', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: projects });
    } else if (method === 'POST') {
      const payload = route.request().postDataJSON();
      await route.fulfill({ 
        status: 201,
        json: { 
          id: 'test-mock-id-123', 
          name: payload?.name || 'Mocked Workflow',
          description: payload?.description || '',
          updated_at: new Date().toISOString(),
          canvas_data: { nodes: [], edges: [], customTools: [], mcpServers: [], version: '1.0' }
        } 
      });
    } else {
      await route.continue();
    }
  });

  // Mock specific project load (matches any UUID-like or test ID)
  await page.route(/\/api\/v1\/projects\/[a-zA-Z0-9_-]+$/, async (route) => {
    // Return either the base project or a fresh one if it's the newly created one
    const isNew = route.request().url().includes('test-mock-id-123');
    await route.fulfill({ 
      json: isNew ? { ...project, id: 'test-mock-id-123', canvas_data: { nodes: [], edges: [], customTools: [], mcpServers: [], version: '1.0' } } : project 
    });
  });

  // Mock secondary dependencies
  await page.route('**/api/v1/models', async (route) => {
    await route.fulfill({ json: [{ id: 'gpt-4', name: 'GPT-4', isDefault: true, provider: 'openai' }] });
  });

  const defaultEmptyRoutes = [
    '**/api/v1/workspaces',
    '**/api/v1/credentials',
    '**/api/v1/mcp-servers',
    '**/api/v1/custom-tools',
  ];

  for (const routePath of defaultEmptyRoutes) {
    await page.route(routePath, async (route) => {
      await route.fulfill({ json: [] });
    });
  }

  // Mock settings (e.g. theme)
  await page.route('**/api/v1/settings', async (route) => {
    await route.fulfill({ json: { theme: 'dark', ...mockDataOverrides.settings } });
  });

  return { project };
}

/**
 * Mocks the /api/v1/run-crew SSE stream to simulate a successful execution.
 * It dynamically extracts node IDs from the request payload to ensure
 * the frontend state (Zustand) is updated correctly.
 */
export async function mockRunCrewSuccess(page: Page, delay: number = 0) {
  // Use regex to match the endpoint regardless of baseUrl
  await page.route(/\/run-crew$/, async (route) => {
    // 1. Parse the request to get dynamic node IDs
    const payload = route.request().postDataJSON();
    const nodes = payload?.nodes || [];
    const agentNode = nodes.find((n: any) => n.type === 'agent');
    const taskNode = nodes.find((n: any) => n.type === 'task');

    // 2. Build the SSE stream with specific events that trigger UI changes
    const sseEvents = [
      JSON.stringify({ type: 'log', data: '🚀 Starting workflow execution...\n' }),
    ];

    if (agentNode) {
      sseEvents.push(JSON.stringify({ type: 'status', nodeId: agentNode.id, status: 'running' }));
      sseEvents.push(JSON.stringify({ type: 'log', data: `Agent "${agentNode.data?.name || 'AI'}" is now working...\n` }));
    }

    if (taskNode) {
      sseEvents.push(JSON.stringify({ type: 'status', nodeId: taskNode.id, status: 'running' }));
      sseEvents.push(JSON.stringify({ type: 'log', data: `Processing task: ${taskNode.data?.name || 'Task'}...\n` }));
      // This is the critical event that marks the task as done in the UI (0/1 -> 1/1)
      sseEvents.push(JSON.stringify({ type: 'task_completed', task_id: taskNode.id }));
      sseEvents.push(JSON.stringify({ type: 'status', nodeId: taskNode.id, status: 'success' }));
      sseEvents.push(JSON.stringify({ type: 'log', data: '✅ Task completed successfully.\n' }));
    }

    sseEvents.push(JSON.stringify({ type: 'final_result', result: 'Mission Accomplished: All tests passed with flying colors.' }));
    sseEvents.push(JSON.stringify({ type: 'done' }));

    // SSE requires specific headers
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // We fulfill with a raw NDJSON stream - the frontend implementation uses JSON.parse(line) on raw lines
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: sseEvents.join('\n') + '\n',
    });
  });
}
