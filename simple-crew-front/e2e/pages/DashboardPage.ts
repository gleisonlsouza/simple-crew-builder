import { Page, expect, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly workflowsHeader: Locator;
  readonly projectCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.workflowsHeader = page.getByText('My Workflows');
    this.projectCards = page.locator('.grid h3');
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.workflowsHeader).toBeVisible({ timeout: 15000 });
  }

  async openProject(name: string) {
    const project = this.page.getByTestId('project-card').filter({ hasText: name }).first();
    await project.waitFor({ state: 'visible', timeout: 10000 });
    await project.click();
  }

  async createWorkflow(name: string, description: string = 'Test workflow') {
    const addBtn = this.page.getByRole('button', { name: /Add Workflow/i });
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click();

    // Modal should appear
    const modal = this.page.getByRole('dialog').filter({ hasText: /Create New Workflow/i });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Use labels if associated
    await modal.getByLabel(/Name/i).fill(name);
    await modal.getByLabel(/Description/i).fill(description);

    const createBtn = modal.getByRole('button', { name: 'Create Workflow' });
    await createBtn.click();

    // Should redirect to builder
    await expect(this.page).toHaveURL(/\/workflow\//);
  }
}
