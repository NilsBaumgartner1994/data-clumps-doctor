import fs from 'fs';
import crypto from 'crypto';
import { Scenario, resolveTestCasesBaseDir, runScenario } from './data-clumps/scenarioUtils';

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sortedEntries = Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {});
      return sortedEntries;
    }
    return val;
  });
}

function computeDataClumpsHash(dataClumps: Record<string, unknown>): string {
  const normalized = stableStringify(dataClumps);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function loadExpectedReport(expectedReportPath: string) {
  if (!fs.existsSync(expectedReportPath)) {
    throw new Error(`Expected report file does not exist: ${expectedReportPath}`);
  }
  return JSON.parse(fs.readFileSync(expectedReportPath, 'utf8')) as { data_clumps: Record<string, unknown> };
}

function createScenarioTest(scenario: Scenario) {
  test(scenario.name, async () => {
    if (!fs.existsSync(scenario.expectedReportPath)) {
      throw new Error(`Missing expected report for scenario "${scenario.name}" at ${scenario.expectedReportPath}. ` + 'Run "npm run generate-missing-test-reports" to create a draft report (report-generated-to-check.json).');
    }

    const actualReport = await runScenario(scenario);
    const expectedReport = loadExpectedReport(scenario.expectedReportPath);

    const actualHash = computeDataClumpsHash(actualReport.data_clumps);
    const expectedHash = computeDataClumpsHash(expectedReport.data_clumps);

    expect(actualHash).toBe(expectedHash);
  });
}

function testAllLanguages() {
  describe('Data clumps detection scenarios', () => {
    const { baseDir, scenarios } = resolveTestCasesBaseDir();

    if (scenarios.length === 0) {
      test('No data clumps scenarios found', () => {
        throw new Error(`No scenarios discovered in ${baseDir}`);
      });
      return;
    }

    for (const scenario of scenarios) {
      createScenarioTest(scenario);
    }
  });
}

testAllLanguages();

export {}; // In order to allow our outer react app to compile, we need to add an empty export statement to this file.
