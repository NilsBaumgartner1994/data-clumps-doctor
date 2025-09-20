import fs from 'fs';
import crypto from 'crypto';
import { Scenario, resolveTestCasesBaseDir, runScenario } from './data-clumps/scenarioUtils';

function stableStringify(value: unknown, space = 0): string {
  return JSON.stringify(
    value,
    (_key, val) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const sortedEntries = Object.keys(val as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (val as Record<string, unknown>)[key];
            return acc;
          }, {});
        return sortedEntries;
      }
      return val;
    },
    space
  );
}

function formatDataClumps(dataClumps: Record<string, unknown>): string {
  return `${stableStringify(dataClumps, 2)}\n`;
}

function loadExpectedReport(expectedReportPath: string) {
  if (!fs.existsSync(expectedReportPath)) {
    throw new Error(`Expected report file does not exist: ${expectedReportPath}`);
  }
  return JSON.parse(fs.readFileSync(expectedReportPath, 'utf8')) as { data_clumps: Record<string, unknown> };
}

jest.setTimeout(60000);

function createScenarioTest(scenario: Scenario) {
  test(scenario.name, async () => {
    if (!fs.existsSync(scenario.expectedReportPath)) {
      throw new Error(`Missing expected report for scenario "${scenario.name}" at ${scenario.expectedReportPath}. ` + 'Run "npm run generate-missing-test-reports" to create a draft report (report-generated-to-check.json).');
    }

    const actualReport = await runScenario(scenario);
    const expectedReport = loadExpectedReport(scenario.expectedReportPath);

    const formattedActual = formatDataClumps(actualReport.data_clumps);
    const formattedExpected = formatDataClumps(expectedReport.data_clumps);

    if (formattedActual !== formattedExpected) {
      const expectedHash = crypto.createHash('sha256').update(formattedExpected).digest('hex');
      const actualHash = crypto.createHash('sha256').update(formattedActual).digest('hex');
      const messageSegments = [`Scenario "${scenario.name}" produced a report that does not match the expected output.`, `Expected report path: ${scenario.expectedReportPath}`, `SHA-256 hash mismatch. Expected ${expectedHash}, but received ${actualHash}. Reports are not identical.`];

      throw new Error(messageSegments.join('\n\n'));
    }
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
