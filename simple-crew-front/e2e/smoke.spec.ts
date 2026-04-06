import { test } from '@playwright/test';
import { setupBaseApiMocks } from './utils/apiMocks';
import { DashboardPage } from './pages/DashboardPage';
import { BuilderPage } from './pages/BuilderPage';

test('Frontend Smoke Test - Core Flow (POM Refactored)', async ({ page }) => {
  // 1. Setup API Mocks
  const { project } = await setupBaseApiMocks(page);

  // 2. Initialize Page Objects
  const dashboard = new DashboardPage(page);
  const builder = new BuilderPage(page);

  // 3. Navigate and Verify Dashboard
  await dashboard.goto();
  await dashboard.expectLoaded();

  // 4. Open the Mocked Project
  await dashboard.openProject(project.name);

  // 5. Verify Builder and Nodes
  await builder.expectLoaded(project.name);
  
  // 6. Interaction: Open Node Configuration
  await builder.openNodeConfig(0); // Agent Node
  await builder.expectConfigDrawerOpen();

  // 7. Interaction: Close Configuration Drawer
  await builder.closeConfigDrawer();
});
