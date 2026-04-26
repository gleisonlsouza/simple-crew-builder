import { Page, expect, Locator } from '@playwright/test';

export class BuilderPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly nodes: Locator;
  readonly configDrawerHeader: Locator;
  readonly doneButton: Locator;
  readonly nodeConfigDrawer: Locator;
  readonly runCrewBtn: Locator;
  readonly saveBtn: Locator;
  readonly tabEditor: Locator;
  readonly tabAnimation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('.react-flow');
    this.nodes = page.locator('.react-flow__node');
    this.configDrawerHeader = page.getByRole('heading', { name: /Configuration/i });
    this.doneButton = page.getByRole('button', { name: /Done/i });
    this.nodeConfigDrawer = page.getByTestId('config-drawer');
    this.runCrewBtn = page.getByRole('button', { name: /Run Crew/i });
    this.saveBtn = page.getByRole('button', { name: /Save|Update/i });
    this.tabEditor = page.getByTestId('tab-view-editor');
    this.tabAnimation = page.getByTestId('tab-view-animation');
  }

  async expectLoaded(projectName?: string) {
    // 1. Verify project title in Header
    const headerTitle = this.page.locator('h1').first();
    await expect(headerTitle).toBeVisible({ timeout: 20000 });
    
    if (projectName) {
      // Wait for name to change from default 'SimpleCrew' or 'My Workflows'
      await expect(headerTitle).not.toHaveText('SimpleCrew', { timeout: 15000 });
      await expect(headerTitle).not.toHaveText('My Workflows', { timeout: 15000 });
      await expect(headerTitle).toHaveText(projectName, { timeout: 20000 });
    }
    
    // 2. Verify React Flow presence
    await expect(this.canvas).toBeVisible({ timeout: 15000 });
  }

  async openNodeConfig(nodeIdentifier: string) {
    // 1. Determina se é um tipo genérico ou um nome específico de nó
    const isGenericType = ['agent', 'task', 'crew'].includes(nodeIdentifier.toLowerCase());
    
    // 2. Usa data-testid para genéricos, ou filtra por texto para nomes específicos
    const node = isGenericType
      ? this.page.locator(`[data-testid^="node-${nodeIdentifier.toLowerCase()}"]`).first()
      : this.nodes.filter({ hasText: nodeIdentifier }).first();
      
    await expect(node).toBeVisible({ timeout: 15000 });
    
    // Attempt multiple ways to open the config
    // 1. Try clicking the Config button that appears on hover
    await node.hover();
    const configButton = node.getByRole('button', { name: /Config/i }).or(node.getByTitle(/Config/i));
    
    if (await configButton.isVisible()) {
      await configButton.click();
    } else {
      // 2. Fallback to double-click on the node itself if the button isn't found/visible
      await node.dblclick();
    }
    
    await expect(this.nodeConfigDrawer).toBeVisible({ timeout: 10000 });
  }


  async closeConfigDrawer() {
    if (await this.nodeConfigDrawer.isVisible()) {
      await this.doneButton.click();
      await expect(this.nodeConfigDrawer).not.toBeVisible({ timeout: 5000 });
    }
  }

  async switchTab(tab: 'Editor' | 'Animation') {
    // Force deselect nodes to ensure drawers are closed and UI is clean
    await this.page.evaluate(() => {
      const store = (window as any).__SIMPLE_CREW_STORE__;
      if (store) store.getState().setActiveNode(null);
    });

    if (tab === 'Animation') {
      await this.tabAnimation.waitFor({ state: 'visible' });
      await this.tabAnimation.click({ force: true });
      // Small wait for animation tab to settle
      await this.page.waitForTimeout(1000);
    } else {
      await this.tabEditor.click();
    }
  }

  async ensureSidebarExpanded() {
    const expandBtn = this.page.getByLabel('Expand Sidebar');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async addNode(type: 'crew' | 'agent' | 'task' | 'state') {
    await this.ensureSidebarExpanded();
    const testId = `btn-add-${type.toLowerCase()}`;
    const addBtn = this.page.getByTestId(testId);
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click();
    
    // Wait for the new node to appear in the canvas
    const nodeSelector = `[data-testid^="node-${type.toLowerCase()}"]`;
    await expect(this.page.locator(nodeSelector).last()).toBeVisible({ timeout: 10000 });
  }

  async connectNodes(sourceName: string, targetName: string) {
    await this.page.evaluate(async ({ srcName, tgtName }) => {
      const store = (window as any).__SIMPLE_CREW_STORE__;
      if (!store) throw new Error("__SIMPLE_CREW_STORE__ not found on window");
      
      // Poll for 5 seconds to ensure nodes are hydrated in the store
      for (let i = 0; i < 10; i++) {
        const state = store.getState();
        const nodes = state.nodes;
        
        const srcNode = nodes.find((n: any) => 
          (n.data?.name && n.data.name.toLowerCase().includes(srcName.toLowerCase())) || 
          n.type?.toLowerCase() === srcName.toLowerCase()
        );
        const tgtNode = nodes.find((n: any) => 
          (n.data?.name && n.data.name.toLowerCase().includes(tgtName.toLowerCase())) || 
          n.type?.toLowerCase() === tgtName.toLowerCase()
        );
        
        if (srcNode && tgtNode) {
          // Resolve handles based on the new Top-to-Bottom architecture
          let sourceHandle = 'right-source'; 
          let targetHandle = 'left-target'; 

          // 1. Source Logic
          if (srcNode.type === 'crew' || srcNode.type === 'chat' || srcNode.type === 'webhook') {
            sourceHandle = 'right-source';
          } else if (srcNode.type === 'agent') {
            if (tgtNode.type === 'task') sourceHandle = 'out-task';
            else if (tgtNode.type === 'tool' || tgtNode.type === 'customTool') sourceHandle = 'out-tool';
            else if (tgtNode.type === 'mcp') sourceHandle = 'out-mcp';
            else if (tgtNode.type === 'state') sourceHandle = 'data-out';
          } else if (srcNode.type === 'task') {
            if (tgtNode.type === 'state') sourceHandle = 'data-out';
            else if (tgtNode.type === 'tool' || tgtNode.type === 'customTool') sourceHandle = 'out-tool';
            else if (tgtNode.type === 'mcp') sourceHandle = 'out-mcp';
          } else if (srcNode.type === 'state') {
            sourceHandle = 'state-out';
          }

          // 2. Target Logic (Standardized for all receivers)
          if (tgtNode.type === 'agent') {
            targetHandle = 'agent-in';
          } else if (tgtNode.type === 'crew') {
            targetHandle = 'trigger-in';
          } else if (tgtNode.type === 'task') {
            targetHandle = 'left-target';
          } else if (tgtNode.type === 'state') {
            // Target the first field found or fallback to 'field-in-output' if common
            const fields = tgtNode.data?.fields || [];
            const outputField = fields.find((f: any) => f.key === 'output') || fields[0];
            targetHandle = outputField ? `field-in-${outputField.key}` : 'left-target';
          }

          console.log(`[E2E] Connecting ${srcNode.type} (${srcNode.id}) to ${tgtNode.type} (${tgtNode.id})`);
          console.log(`[E2E] Selected Handles: source=${sourceHandle}, target=${targetHandle}`);

          state.onConnect({
            source: srcNode.id,
            target: tgtNode.id,
            sourceHandle,
            targetHandle
          });
          state.validateGraph();
          return;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      const allNames = store.getState().nodes.map((n: any) => `[${n.type}] ${n.data?.name}`).join(', ');
      throw new Error(`Could not find nodes after polling: ${srcName}, ${tgtName}. Available: ${allNames}`);
    }, { srcName: sourceName, tgtName: targetName });
    
    // Brief wait for the connection to be registered by the store
    await this.page.waitForTimeout(500);
  }

  async setCrewVariable(varName: string) {
    // Ensure Crew config is open
    await this.expectConfigDrawerOpen();
    
    const addVarBtn = this.nodeConfigDrawer.getByTestId('btn-add-variable');
    await addVarBtn.click();

    const lastInput = this.nodeConfigDrawer.getByTestId('input-variable-key').last();
    await lastInput.waitFor({ state: 'visible' });
    await lastInput.fill(varName);
    
    // Fill a default value too
    const lastValue = this.nodeConfigDrawer.getByTestId('input-variable-value').last();
    await lastValue.fill('Test Value');
    
    // Click some header to blur
    await this.configDrawerHeader.click();
  }

  async runCrew() {
    await expect(this.runCrewBtn).toBeEnabled({ timeout: 10000 });
    await this.runCrewBtn.click();
  }

  async typeInNodeField(fieldName: string, value: string, options: { blur?: boolean } = {}) {
    const testIdMap: Record<string, string> = {
      'Role': 'field-agent-role',
      'Goal': 'input-goal',
      'Backstory': 'field-agent-backstory',
      'Description': 'input-description',
      'Expected Output': 'input-expected-output',
      'Expected output': 'input-expected-output'
    };

    let field: Locator;
    if (testIdMap[fieldName]) {
      // The data-testid is on the HighlightedTextField wrapper, so we find the inner input/textarea
      const container = this.nodeConfigDrawer.getByTestId(testIdMap[fieldName]);
      field = container.locator('textarea, input').first();
    } else {
      field = this.nodeConfigDrawer.getByLabel(fieldName);
    }

    await field.waitFor({ state: 'visible', timeout: 10000 });
    
    // Suggestion trigger mode: clear and type with delay
    await field.click();
    // Use selectAll + Backspace to clear because fill('') might not trigger re-render in code-editor
    await field.press('Control+A');
    await field.press('Backspace');
    await field.type(value, { delay: 30 });

    if (options.blur !== false) {
      // Click header to blur and ensure state commit
      await this.configDrawerHeader.click();
      // Brief wait for state propagation
      await this.page.waitForTimeout(200);
    }
  }

  async expectSuggestionsVisible() {
    const dropdown = this.page.getByTestId('suggestion-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    
    // Ensure it has at least one suggestion item
    const count = await dropdown.locator('button').count();
    expect(count).toBeGreaterThan(0);
  }

  async selectSuggestion(variableName: string) {
    console.log(`[E2E] Selecting suggestion for variable: ${variableName}`);
    await this.page.waitForTimeout(500); // Wait for dropdown to render
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }



  async expectConfigDrawerOpen() {
    await expect(this.nodeConfigDrawer).toBeVisible({ timeout: 10000 });
  }
}
