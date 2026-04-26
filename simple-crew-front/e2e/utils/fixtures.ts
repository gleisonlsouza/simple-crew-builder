/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test';

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const istanbulReportsDir = path.join(process.cwd(), '.nyc_output');

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`[BROWSER ERROR] ${msg.text()}`);
      else if (msg.type() === 'warning') console.warn(`[BROWSER WARN] ${msg.text()}`);
      else console.log(`[BROWSER LOG] ${msg.text()}`);
    });
    await use(page);

    if (process.env.VITE_COVERAGE === 'true') {
      const coverage = await page.evaluate(() => (window as any).__coverage__);
      if (coverage) {
        if (!fs.existsSync(istanbulReportsDir)) {
          fs.mkdirSync(istanbulReportsDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(istanbulReportsDir, `coverage-${uuidv4()}.json`),
          JSON.stringify(coverage)
        );
      }
    }
  },
});

export { expect };
