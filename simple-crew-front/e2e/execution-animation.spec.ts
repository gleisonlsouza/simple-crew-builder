import { test, expect } from './utils/fixtures';
import { setupBaseApiMocks, mockRunCrewSuccess } from './utils/apiMocks';
import { DashboardPage } from './pages/DashboardPage';
import { BuilderPage } from './pages/BuilderPage';
import { AnimationPage } from './pages/AnimationPage';

test.describe('Execution Animation (CT10)', () => {
  test('Execution Animation (CT10) - should show accomplishment modal on success', async ({ page }) => {
  // Use a longer timeout for the whole test due to animation and mock stream sequences
  test.setTimeout(60000);
    // 1. Setup - Mock basic API and SSE success
    // 1. Setup - Mock empty projects to test the full "Add Workflow" journey
    await setupBaseApiMocks(page, { projects: [] });
    await mockRunCrewSuccess(page, 1000);

    const dashboard = new DashboardPage(page);
    const builder = new BuilderPage(page);
    const animation = new AnimationPage(page);

    // 2. Journey: Create New Workflow
    await dashboard.goto();
    await dashboard.createWorkflow('Animation Journey', 'Simulation with LangGraph', 'langgraph');

    await builder.expectLoaded('Animation Journey');

    // 3. Journey: Build Graph
    await builder.addNode('crew');
    await builder.addNode('agent');
    await builder.addNode('task');
    
    // In LangGraph, ensure State node exists (might be added by mock, but let's be sure)
    const stateNode = page.locator('[data-testid^="node-state"]');
    if (await stateNode.count() === 0) {
      await builder.addNode('state');
    }
    
    // Connect them: Crew -> Agent -> Task
    try {
      await builder.connectNodes('Crew', 'Agent');
      await builder.connectNodes('Agent', 'Task');
      
      // Verify connections in UI
      await expect(page.locator('.react-flow__edge')).toHaveCount(2, { timeout: 10000 });

    } catch (e) {
      console.error('Connection Orchestration Failed:', e);
      await page.screenshot({ path: 'test-results/connection-failure.png' });
      throw e;
    }

    // 4. Journey: Config & Save
    await builder.openNodeConfig('Crew');
    await builder.typeInNodeField('Graph Name', 'Real Execution Crew');
    await builder.closeConfigDrawer();
    await builder.openNodeConfig('Agent');
    await expect(page.getByRole('heading', { name: /Agent Configuration/i })).toBeVisible({ timeout: 10000 });
    await builder.typeInNodeField('Role', 'Tester');
    await builder.typeInNodeField('Goal', 'Do some work');
    await builder.typeInNodeField('Backstory', 'Expert in simulation');
    await builder.closeConfigDrawer();
    
    await builder.openNodeConfig('Task');
    await expect(page.getByRole('heading', { name: /Task Configuration/i })).toBeVisible({ timeout: 10000 });
    await builder.typeInNodeField('Description', 'Perform animation task');
    await builder.typeInNodeField('Expected Output', 'Success');
    await builder.closeConfigDrawer();

    // 5. Execution & Animation Tab
    await builder.switchTab('Animation');
    await page.waitForTimeout(2000);
    await animation.expectCanvasVisible();
    await animation.startCrew();

    // 6. Verification - Success Modal
    await animation.expectMissionAccomplished(20000);
    
    // Final check for the modal buttons
    await expect(page.getByRole('button', { name: /Return to Terminal/i })).toBeVisible();
  });
});
