import { test, expect } from '@playwright/test';

test('Frontend Smoke Test - Core Flow', async ({ page }) => {
  // 1. Mock API calls to ensure consistent data and avoid dependency on backend
  const mockProject = {
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

  // Mock project list
  await page.route('**/api/v1/projects', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [mockProject] });
    } else {
      await route.continue();
    }
  });

  // Mock specific project load
  await page.route(`**/api/v1/projects/${mockProject.id}`, async (route) => {
    await route.fulfill({ json: mockProject });
  });

  // Mock models and other dependencies to avoid 404s
  await page.route('**/api/v1/models', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/workspaces', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/credentials', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/mcp-servers', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/custom-tools', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/settings', async (route) => {
    await route.fulfill({ json: { theme: 'dark' } });
  });

  // 2. Access the main URL
  await page.goto('/');

  // 3. Verify Dashboard loaded
  await expect(page.getByText('My Workflows')).toBeVisible({ timeout: 15000 });

  // 4. Click the mocked project
  const firstProject = page.locator('.grid h3', { hasText: mockProject.name }).first();
  await expect(firstProject).toBeVisible({ timeout: 10000 });
  await firstProject.click();

  // 5. Verify Builder page elements (Workspace Explorer / React Flow)
  // Wait for the project title to appear in the header (signals loadProject finished)
  await expect(page.locator('header h1', { hasText: mockProject.name })).toBeVisible({ timeout: 15000 });
  
  // Wait for React Flow container
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
  
  // 6. Ensure the node is visible and clickable
  const firstNode = page.locator('.react-flow__node').first();
  await expect(firstNode).toBeVisible({ timeout: 15000 });
  
  // Hover to make buttons visible (they have opacity-0 group-hover:opacity-100)
  await firstNode.hover();
  
  // Click the Config button instead of the node itself
  const configButton = firstNode.getByRole('button', { name: /Config/i });
  await expect(configButton).toBeVisible({ timeout: 5000 });
  await configButton.click();

  // 7. Verify the NodeConfigDrawer is visible
  await expect(page.getByRole('heading', { name: /Configuration/i })).toBeVisible({ timeout: 5000 });
  
  // 8. Verify "Done" button is present to close the drawer
  const doneButton = page.getByRole('button', { name: /Done/i });
  await expect(doneButton).toBeVisible();

  // 9. Close the drawer
  await doneButton.click();
  await expect(page.getByText('Configuration')).not.toBeVisible();
});
