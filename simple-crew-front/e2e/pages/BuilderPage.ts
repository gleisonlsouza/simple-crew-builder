import { Page, expect, Locator } from '@playwright/test';

export class BuilderPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly nodes: Locator;
  readonly configDrawerHeader: Locator;
  readonly doneButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('.react-flow');
    this.nodes = page.locator('.react-flow__node');
    this.configDrawerHeader = page.getByRole('heading', { name: /Configuration/i });
    this.doneButton = page.getByRole('button', { name: /Done/i });
  }

  async expectLoaded(projectName: string) {
    // 1. Verify project title in the header
    const headerTitle = this.page.locator('header h1', { hasText: projectName });
    await expect(headerTitle).toBeVisible({ timeout: 15000 });
    
    // 2. Verify React Flow presence
    await expect(this.canvas).toBeVisible({ timeout: 15000 });
  }

  async openNodeConfig(nodeIndex: number = 0) {
    const node = this.nodes.nth(nodeIndex);
    await expect(node).toBeVisible({ timeout: 15000 });
    
    // Hover to reveal group-hover Config button
    await node.hover();
    
    const configButton = node.getByRole('button', { name: /Config/i });
    await expect(configButton).toBeVisible({ timeout: 5000 });
    await configButton.click();
  }

  async expectConfigDrawerOpen() {
    await expect(this.configDrawerHeader).toBeVisible({ timeout: 5000 });
  }

  async closeConfigDrawer() {
    await expect(this.doneButton).toBeVisible();
    await this.doneButton.click();
    await expect(this.configDrawerHeader).not.toBeVisible();
  }
}
