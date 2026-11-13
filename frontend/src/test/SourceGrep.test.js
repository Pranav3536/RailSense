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
      'root.train_records',
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

  it('confines the term "probability" strictly to Delay Prediction, Model Lab, and Metric Glossary files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    // Files allowed to mention "probability" (model estimated outputs and evaluation metrics)
    const allowedSubstrings = [
      'TrainHubPage',
      'TrainHubPredictionPanel',
      path.join('components', 'trainhub'),
      'ModelLabPage',
      'ProbabilityGauge',
      'RiskBadge',
      'metricGlossary',
      'featureLabels',
      path.join('components', 'ui', 'index.js'),
    ];

    nonTestFiles.forEach((file) => {
      const isAllowed = allowedSubstrings.some((allowed) => file.includes(allowed));
      if (!isAllowed) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(
          content.toLowerCase(),
          `Found forbidden usage of "probability" in non-model file ${file}`
        ).not.toContain('probability');
      }
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

  it('contains zero sparkle or AI-style icons (Sparkles, Wand, Stars) in frontend production source files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    const forbiddenIconRegex = /\b(Sparkles|Wand|Stars)\b/;

    nonTestFiles.forEach((file) => {
      if (file.includes('creator.js')) return;
      const content = fs.readFileSync(file, 'utf-8');
      const match = content.match(forbiddenIconRegex);
      expect(match, `Found forbidden sparkle/AI-style icon '${match?.[0]}' in ${file}`).toBeNull();
    });
  });

  it('contains zero raw LaTeX math syntax in frontend production source files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')) && !f.includes('sanitizeText.js'));

    const latexPatterns = [/\$\\ge\$/, /\$\\le\$/, /\$\\rightarrow\$/, /\\ge\b/, /\\le\b/, /\\rightarrow\b/, /\\times\b/];

    nonTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      latexPatterns.forEach((pattern) => {
        expect(content, `Found raw LaTeX ${pattern} in ${file}`).not.toMatch(pattern);
      });
    });
  });

  it('contains zero buzzwords (Protocol, Zero Lookahead, Untouched) in user-facing Model Lab page', () => {
    const modelLabPath = path.resolve(srcDir, 'pages', 'ModelLabPage.jsx');
    const content = fs.readFileSync(modelLabPath, 'utf-8');
    const forbiddenBuzzwords = [
      'STRICT TEMPORAL SPLITTING (ZERO LOOKAHEAD)',
      'Leakage Safeguards & Banned Features Protocol',
      'Research Benchmark Only — Formulation 2',
      'untouched test partition',
    ];

    forbiddenBuzzwords.forEach((word) => {
      expect(content).not.toContain(word);
    });
  });

  it('contains zero leaked prompt instructions ("never causation", "worded as") in frontend production source files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    const promptLeakTerms = ['never causation', 'worded as'];

    nonTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8').toLowerCase();
      promptLeakTerms.forEach((term) => {
        expect(content, `Found leaked prompt term "${term}" in ${file}`).not.toContain(term);
      });
    });
  });

  it('contains zero raw Python brackets for Wilson CI in DelayPatternsPage and adapters', () => {
    const patternsPage = fs.readFileSync(path.resolve(srcDir, 'pages', 'DelayPatternsPage.jsx'), 'utf-8');
    const adapters = fs.readFileSync(path.resolve(srcDir, 'api', 'adapters.js'), 'utf-8');

    // Should not contain `[${...}%, ${...}%]`
    expect(adapters).not.toMatch(/`\[\$\{[^}]+\}%,\s*\$\{[^}]+\}%\]`/);
    expect(patternsPage).not.toContain('{[item.wilsonText]}');
  });

  it('contains zero student/free-tier boasting ("100% free", "zero paid APIs", "without runtime LLM dependencies") in frontend production files', () => {
    const srcFiles = getFilesRecursively(srcDir, (f) => f.endsWith('.js') || f.endsWith('.jsx'));
    const nonTestFiles = srcFiles.filter((f) => !f.includes(path.join('src', 'test')));

    const forbiddenPhrases = ['100% free', 'zero paid apis', 'without runtime llm dependencies', 'ingestion: 28l+ stops'];

    nonTestFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8').toLowerCase();
      forbiddenPhrases.forEach((phrase) => {
        expect(content, `Found forbidden amateur phrase "${phrase}" in ${file}`).not.toContain(phrase);
      });
    });
  });
});
