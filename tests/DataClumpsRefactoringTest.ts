import fs from 'fs';
import path from 'path';

import { RefactoringScenario, normalizeFileContent, resolveRefactoringTestCasesBaseDir, runRefactoringScenario } from './data-clumps/refactoringScenarioUtils';

jest.setTimeout(60000);

type ScenarioResult = {
  status: 'passed' | 'failed';
  details?: string;
};

const scenarioResults = new Map<string, ScenarioResult>();

function createRefactoringScenarioTest(scenario: RefactoringScenario) {
  const scenarioDisplayPath = path.relative(process.cwd(), scenario.scenarioDir) || scenario.scenarioDir;

  test(`${scenario.name} (${scenarioDisplayPath})`, async () => {
    let workDir: string | undefined;
    try {
      if (!fs.existsSync(scenario.sourceExpectedPath)) {
        const message = `Missing expected source directory for scenario "${scenario.name}" at ${scenario.sourceExpectedPath}.`;
        scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, { status: 'failed', details: message });
        throw new Error(message);
      }

      const result = await runRefactoringScenario(scenario);
      workDir = result.workDir;

      const expectedFiles = fs.readdirSync(scenario.sourceExpectedPath).filter(f => f.endsWith('.ts'));
      const differences: string[] = [];

      for (const file of expectedFiles) {
        const expectedContent = normalizeFileContent(fs.readFileSync(path.join(scenario.sourceExpectedPath, file), 'utf8'));
        const actualFilePath = path.join(workDir, file);

        if (!fs.existsSync(actualFilePath)) {
          differences.push(`File "${file}" expected in refactored output but not found.`);
          continue;
        }

        const actualContent = normalizeFileContent(fs.readFileSync(actualFilePath, 'utf8'));
        if (actualContent !== expectedContent) {
          const expectedLines = expectedContent.split('\n');
          const actualLines = actualContent.split('\n');
          const maxLines = Math.max(expectedLines.length, actualLines.length);
          let firstDiff = '';
          for (let i = 0; i < maxLines; i++) {
            if ((expectedLines[i] ?? '') !== (actualLines[i] ?? '')) {
              firstDiff = `Line ${i + 1}: expected "${expectedLines[i] ?? ''}", got "${actualLines[i] ?? ''}"`;
              break;
            }
          }
          differences.push(`File "${file}" content differs. ${firstDiff}`);
        }
      }

      if (differences.length > 0) {
        const message = [`Refactoring output mismatch for scenario: ${scenario.name}`, ...differences].join('\n');
        scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, { status: 'failed', details: message });
        throw new Error(message);
      }

      scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, { status: 'passed' });
    } catch (error) {
      if (!scenarioResults.has(`${scenario.name} (${scenarioDisplayPath})`)) {
        scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, {
          status: 'failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    } finally {
      if (workDir) {
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });
}

function testAllRefactoringScenarios() {
  describe('Data clumps refactoring scenarios', () => {
    scenarioResults.clear();
    const { baseDir, scenarios } = resolveRefactoringTestCasesBaseDir();

    if (scenarios.length === 0) {
      test('No refactoring scenarios found', () => {
        throw new Error(`No refactoring scenarios discovered in ${baseDir}`);
      });
      return;
    }

    for (const scenario of scenarios) {
      createRefactoringScenarioTest(scenario);
    }

    afterAll(() => {
      if (scenarioResults.size === 0) {
        return;
      }

      const passed: string[] = [];
      const failed: string[] = [];

      for (const [scenarioName, result] of scenarioResults.entries()) {
        if (result.status === 'passed') {
          passed.push(scenarioName);
        } else {
          failed.push(scenarioName);
        }
      }

      console.log('\nZusammenfassung der Data-Clumps-Refactoring-Tests:');
      if (passed.length > 0) {
        console.log(['✅ Bestanden:', ...passed.map(n => `  - ${n}`)].join('\n'));
      } else {
        console.log('✅ Bestanden: Keine Tests bestanden.');
      }

      if (failed.length > 0) {
        console.log(['❌ Fehlgeschlagen:', ...failed.map(n => `  - ${n}`)].join('\n'));
      } else {
        console.log('❌ Fehlgeschlagen: Keine Tests fehlgeschlagen.');
      }
    });
  });
}

testAllRefactoringScenarios();

export {};
