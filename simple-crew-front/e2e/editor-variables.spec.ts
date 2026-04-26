import { test, expect } from './utils/fixtures';
import { setupBaseApiMocks } from './utils/apiMocks';
import { DashboardPage } from './pages/DashboardPage';
import { BuilderPage } from './pages/BuilderPage';

test.describe('Editor Variables Suggestion (CT07)', () => {
  test('should show suggestion dropdown when typing { in HighlightedTextField', async ({ page }) => {
    // 1. Setup - Mock basic API but we will build the workflow manually
    await setupBaseApiMocks(page, { projects: [] });

    const dashboard = new DashboardPage(page);
    const builder = new BuilderPage(page);

    // 2. Journey: Create New Workflow
    await dashboard.goto();
    await dashboard.createWorkflow('Variable Discovery Flow');

    // 3. Journey: Add Crew and define variables
    await builder.addNode('crew');
    await builder.openNodeConfig('Crew');
    await builder.setCrewVariable('company_info');
    await builder.closeConfigDrawer();
    
    // Wait for store to sync variable
    await page.waitForFunction(() => {
      const store = (window as any).__SIMPLE_CREW_STORE__;
      if (!store) return false;
      const nodes = store.getState().nodes;
      const crew = nodes.find((n: any) => n.type === 'crew');
      return crew && crew.data.inputs && Object.keys(crew.data.inputs).some(k => !k.startsWith('input_'));
    });

    // 4. Journey: Add Agent and trigger suggestion
    await builder.addNode('agent');
    await builder.openNodeConfig('Agent');
    
    // Type prefix
    await builder.typeInNodeField('Goal', 'Research about ', { blur: false });
    // Type trigger character sequentially
    const goalField = builder.nodeConfigDrawer.getByTestId('input-goal').locator('textarea, input').first();
    await goalField.pressSequentially('{', { delay: 100 });
    
    await builder.expectSuggestionsVisible();
    await page.waitForTimeout(500); // Allow dropdown to fully render
    await builder.selectSuggestion('company_info');
    
    // Verify it was inserted by checking the textarea's value
    const resultField = builder.nodeConfigDrawer.getByTestId('input-goal').locator('textarea');
    await expect(resultField).toHaveValue(/Research about \{company_info\}/, { timeout: 10000 });
  });
});
