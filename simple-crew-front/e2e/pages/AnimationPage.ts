import { Page, Locator, expect } from '@playwright/test';

export class AnimationPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly startBtn: Locator;
  readonly successModal: Locator;
  readonly missionAccomplishedText: Locator;
  readonly employeeOfMonthSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('main >> .flex-grow.h-full.relative');
    this.startBtn = page.getByRole('button', { name: /START CREW/i });
    // Look for a div that contains "Mission Accomplished" text
    this.successModal = page.getByTestId('mission-success-modal');
    this.missionAccomplishedText = this.successModal.getByText('Mission Accomplished', { exact: false });
    this.employeeOfMonthSection = this.successModal.getByText('Top Performer Identified', { exact: false });
  }

  async expectCanvasVisible() {
    await expect(this.canvas).toBeVisible({ timeout: 15000 });
  }

  async startCrew() {
    // Wait for button to be enabled if it's currently disabled
    await expect(this.startBtn).toBeEnabled({ timeout: 10000 });
    await this.startBtn.click();
    
    // Wait for the terminal to receive the first log entry
    const terminal = this.page.locator('[data-testid="simulation-log-container"]');
    
    // Ensure the terminal is expanded
    const expandBtn = this.page.getByTestId('btn-log-expand');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
    
    await expect(terminal).toBeVisible({ timeout: 10000 });
    
    // Wait for the "Aguardando" text to disappear first, confirming the execution actually started
    await expect(terminal).not.toContainText('Aguardando início...', { timeout: 10000 });
    
    // Search within the simulation-log-container for the specific log entry
    await expect(terminal).toContainText('Starting Real Crew Execution', { timeout: 10000 });
  }

  async expectMissionAccomplished(timeout = 30000) {
    // 1. Ensure we are definitely on the Animation tab and stay there. 
    // If the tab is already active, this is a no-op or just confirms visibility.
    await this.page.getByTestId('tab-view-animation').click({ force: true });
    
    // 2. Wait for the modal heading specifically. 
    // We use a regular locator to avoid any role-mapping ambiguity in CI.
    const heading = this.page.locator('h2:has-text("Mission Accomplished")').first();
    await expect(heading).toBeVisible({ timeout });
    
    // 3. Verify the success message exists
    await expect(this.page.getByText(/Execution protocols finalized/i)).toBeVisible({ timeout: 5000 });
  }
}
