import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { Scenario, resolveTestCasesBaseDir, runScenario } from './data-clumps/scenarioUtils';

type DataClumpsReport = {
  data_clumps?: Record<string, unknown>;
  report_summary?: { amount_data_clumps?: number | string | null } | null;
};

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

function formatDataClumps(dataClumps: Record<string, unknown> | undefined): string {
  return `${stableStringify(dataClumps ?? {}, 2)}\n`;
}

function loadExpectedReport(expectedReportPath: string) {
  if (!fs.existsSync(expectedReportPath)) {
    throw new Error(`Expected report file does not exist: ${expectedReportPath}`);
  }
  return JSON.parse(fs.readFileSync(expectedReportPath, 'utf8')) as DataClumpsReport;
}

function parseAmountDataClumps(report: DataClumpsReport | undefined | null): number {
  if (!report) {
    return 0;
  }

  if (report.data_clumps && typeof report.data_clumps === 'object' && !Array.isArray(report.data_clumps)) {
    return Object.keys(report.data_clumps).length;
  }

  const summaryCount = report.report_summary?.amount_data_clumps;
  if (typeof summaryCount === 'number') {
    return summaryCount;
  }

  if (typeof summaryCount === 'string') {
    const parsed = Number(summaryCount);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

jest.setTimeout(60000);

function createScenarioTest(scenario: Scenario) {
  const scenarioDisplayPath = path.relative(process.cwd(), scenario.scenarioDir) || scenario.scenarioDir;

  test(`${scenario.name} (${scenarioDisplayPath})`, async () => {
    if (!fs.existsSync(scenario.expectedReportPath)) {
      throw new Error(`Missing expected report for scenario "${scenario.name}" at ${scenario.expectedReportPath}. ` + 'Run "npm run generate-missing-test-reports" to create a draft report (report-generated-to-check.json).');
    }

    const actualReport = (await runScenario(scenario)) as DataClumpsReport;
    const expectedReport = loadExpectedReport(scenario.expectedReportPath);

    const formattedActual = formatDataClumps(actualReport.data_clumps);
    const formattedExpected = formatDataClumps(expectedReport.data_clumps);

    if (formattedActual !== formattedExpected) {
      const expectedCount = parseAmountDataClumps(expectedReport);
      const actualCount = parseAmountDataClumps(actualReport);
      const messageSegments = [`Scenario "${scenario.name}" produced a report that does not match the expected output.`, `Scenario directory: ${scenario.scenarioDir}`, `Expected report path: ${scenario.expectedReportPath}`, 'Run "npm run generate-missing-test-reports" to generate an updated draft report when changes are intentional.'];

      messageSegments.splice(3, 0, `Expected data clumps: ${expectedCount}`, `Found data clumps: ${actualCount}`);
      messageSegments.push(
        `DATA_CLUMP_MISMATCH_SUMMARY::${JSON.stringify({
          testName: `${scenario.name} (${scenarioDisplayPath})`,
          scenarioName: scenario.name,
          scenarioDirectory: scenario.scenarioDir,
          expectedReportPath: scenario.expectedReportPath,
          expectedCount,
          actualCount,
        })}`
      );

      throw new Error(messageSegments.join('\n\n'));
    }
  });
}

function testAllLanguages() {
  describe('Data clumps detection scenarios', () => {
    const { baseDir, scenarios } = resolveTestCasesBaseDir();
    const args = minimist(process.argv.slice(2));
    const scenarioId = args.id;
    let filteredScenarios = scenarios;
    if (scenarioId) {
      filteredScenarios = scenarios.filter(s => s.id === scenarioId);
    }
    if (filteredScenarios.length === 0) {
      test('No data clumps scenarios found', () => {
        throw new Error(`No scenarios discovered in ${baseDir}${scenarioId ? ` for id=${scenarioId}` : ''}`);
      });
      return;
    }
    const skippedScenarios: string[] = [];
    for (const scenario of filteredScenarios) {
      if (!fs.existsSync(scenario.expectedReportPath)) {
        skippedScenarios.push(`${scenario.name} (${scenario.scenarioDir})`);
        test.skip(`${scenario.name} (${scenario.scenarioDir}) [SKIPPED: missing report-expected]`, () => {
          // skipped
        });
        continue;
      }
      createScenarioTest(scenario);
    }
    if (skippedScenarios.length > 0) {
      test('Warnung: Übersprungene Szenarien ohne report-expected', () => {
        console.warn(
          `WARNUNG: Die folgenden Szenarien wurden übersprungen, da keine report-expected-Datei gefunden wurde:\n` +
          skippedScenarios.map(s => `  - ${s}`).join('\n')
        );
      });
    }
  });
}

testAllLanguages();

export {}; // In order to allow our outer react app to compile, we need to add an empty export statement to this file.
