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

  // Mock project list
  await page.route('**/api/v1/projects', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [project] });
    } else {
      await route.continue();
    }
  });

  // Mock specific project load
  await page.route(`**/api/v1/projects/${project.id}`, async (route) => {
    await route.fulfill({ json: project });
  });

  // Mock secondary dependencies (empty lists by default)
  const defaultEmptyRoutes = [
    '**/api/v1/models',
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
