import { test, expect } from './utils/fixtures';
import { setupBaseApiMocks } from './utils/apiMocks';
import { DashboardPage } from './pages/DashboardPage';
import { BuilderPage } from './pages/BuilderPage';

test.describe('Editor Variables Suggestion (CT07)', () => {
  test('should show suggestion dropdown when typing { in HighlightedTextField', async ({ page }) => {
    // 1. Setup - Mock basic API but we will build the workflow manually
    // 1. Setup - Mock empty projects to test the full "Add Workflow" journey
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

    // 4. Journey: Add Agent and trigger suggestion
    await builder.addNode('agent');
    await builder.openNodeConfig('Agent');
    
    // Note: We use "Goal" as the label for the field
    await builder.typeInNodeField('Goal', 'Research about {');

    // 5. Assertions
    await builder.expectSuggestionsVisible();
    
    // Wait for the specific variable name to appear in the dropdown
    const suggestionItem = page.getByTestId('suggestion-dropdown').getByText('company_info');
    await expect(suggestionItem).toBeVisible({ timeout: 15000 });
    
    // Select the suggestion
    await suggestionItem.click();
    
    // Verify it was inserted
    const field = page.locator('textarea').filter({ hasText: /Research about \{company_info\}/ });
    await expect(field).toBeVisible();
  });
});
