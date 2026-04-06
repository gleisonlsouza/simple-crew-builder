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
    const projectCard = this.projectCards.filter({ hasText: name }).first();
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await projectCard.click();
  }
}
