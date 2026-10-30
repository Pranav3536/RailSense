import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getFilesRecursively(dir, filter) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(getFilesRecursively(fullPath, filter));
      }
    } else {
      if (filter(fullPath)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

describe('Source Code Integrity & Grep Audit Suite', () => {
  const srcDir = path.resolve(__dirname, '..');
  const frontendDir = path.resolve(__dirname, '../..');

  it('contains zero TypeScript (.ts or .tsx) files in frontend repository', () => {
    const tsFiles = getFilesRecursively(frontendDir, (f) => f.endsWith('.ts') || f.endsWith('.tsx'));
    expect(tsFiles).toEqual([]);
  });

  it('contains zero unverified owner claims (41.8%, 26.4, 2.8M+, 10,743 trains) in source files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    
    // Check non-test source files only
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    const forbiddenClaims = ['41.8%', '26.4', '2.8M+', '10,743 trains'];

    nonTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      forbiddenClaims.forEach((claim) => {
        expect(content).not.toContain(claim);
      });
    });
  });

  it('contains zero TiDB passwords, host connection strings, or secret values in frontend production code', () => {
    const allFrontendFiles = getFilesRecursively(frontendDir, (f) =>
      (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.html') || f.endsWith('.json')) &&
      !f.includes('package-lock.json') &&
      !f.includes(path.join('src', 'test'))
    );

    const forbiddenSecrets = [
      'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
      'TIDB_PASSWORD',
      'root.train_records'
    ];

    allFrontendFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      forbiddenSecrets.forEach((sec) => {
        expect(content).not.toContain(sec);
      });
    });
  });

  it('contains zero unsubstantiated causal claims (bottleneck, congestion, fog, caused by) in source text', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    const causalTerms = ['bottleneck', 'congestion', 'fog', 'caused by'];

    nonTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8').toLowerCase();
      causalTerms.forEach((term) => {
        expect(content).not.toContain(term);
      });
    });
  });

  it('contains zero arbitrary micro-text text-[Npx] classes in production source files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    // Matches arbitrary text pixel sizes e.g. text-[9px], text-[10px], text-[11px], text-[12px]
    const microTextRegex = /text-\[\d+px\]/g;

    nonTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(microTextRegex);
      expect(matches, `Found arbitrary micro-text in ${file}: ${matches}`).toBeNull();
    });
  });

  it('guarantees Recharts chartTheme constants meet minimum readable sizes (>=14px)', async () => {
    const { CHART_THEME } = await import('../components/charts/chartTheme');
    expect(CHART_THEME.fontSize.tick).toBeGreaterThanOrEqual(14);
    expect(CHART_THEME.fontSize.label).toBeGreaterThanOrEqual(14);
    expect(CHART_THEME.fontSize.legend).toBeGreaterThanOrEqual(14);
    expect(CHART_THEME.fontSize.tooltip).toBeGreaterThanOrEqual(14);
    expect(CHART_THEME.heights.standard).toBeGreaterThanOrEqual(320);
  });
});
