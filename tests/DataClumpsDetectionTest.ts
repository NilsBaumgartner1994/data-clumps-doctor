import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { Scenario, resolveTestCasesBaseDir, runScenario } from './data-clumps/scenarioUtils';

type DataClumpsReport = {
  data_clumps?: Record<string, unknown>;
  report_summary?: { amount_data_clumps?: number | string | null } | null;
};

type ScenarioResult = {
  status: 'passed' | 'failed';
  details?: string;
};

const scenarioResults = new Map<string, ScenarioResult>();

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

function findFirstDifferenceLine(expected: string, actual: string) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i] ?? '';
    const actualLine = actualLines[i] ?? '';
    if (expectedLine !== actualLine) {
      return { index: i + 1, expectedLine, actualLine };
    }
  }

  return null;
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
    try {
      if (!fs.existsSync(scenario.expectedReportPath)) {
        const message = `Fehlender erwarteter Report für Szenario "${scenario.name}" unter ${scenario.expectedReportPath}.` + ' Führe "npm run generate-missing-test-reports" aus, um einen Entwurfsreport zu erstellen (report-generated-to-check.json).';
        scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, {
          status: 'failed',
          details: message,
        });
        throw new Error(message);
      }

      console.log(`Führe Szenario aus: ${scenario.name} (${scenarioDisplayPath})`);
      const actualReport = (await runScenario(scenario)) as DataClumpsReport;
      const expectedReport = loadExpectedReport(scenario.expectedReportPath);

      const formattedActual = formatDataClumps(actualReport.data_clumps);
      const formattedExpected = formatDataClumps(expectedReport.data_clumps);

      if (formattedActual !== formattedExpected) {
        const expectedCount = parseAmountDataClumps(expectedReport);
        const actualCount = parseAmountDataClumps(actualReport);
        const firstDifference = findFirstDifferenceLine(formattedExpected, formattedActual);
        const differenceText = firstDifference ? `Erste unterschiedliche Zeile (${firstDifference.index}):\nErwartet: ${firstDifference.expectedLine}\nGefunden: ${firstDifference.actualLine}` : 'Die Berichte unterscheiden sich, aber es konnte keine abweichende Zeile ermittelt werden.';
        const message = [`Fehler im Report-Szenario: ${scenario.name}`, `Erwartete Data Clumps: ${expectedCount}`, `Gefundene Data Clumps: ${actualCount}`, differenceText].join('\n');
        scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, {
          status: 'failed',
          details: message,
        });
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
    }
  });
}

function testAllLanguages() {
  describe('Data clumps detection scenarios', () => {
    scenarioResults.clear();
    const { baseDir, scenarios } = resolveTestCasesBaseDir();
    const args = minimist(process.argv.slice(2));
    const scenarioId = args.id;
    let filteredScenarios = scenarios;
    // Wenn Szenarien mit `debug === true` existieren und kein id-Filter gesetzt wurde,
    // sollen nur diese ausgeführt werden und alle anderen als skipped markiert werden.
    let onlyRunDebug = false;
    if (scenarioId) {
      filteredScenarios = scenarios.filter(s => s.id === scenarioId);
    } else {
      const debugScenarios = scenarios.filter(s => s.debug === true);
      if (debugScenarios.length > 0) {
        // Sortiere: zuerst diejenigen mit vorhandenem expectedReportPath, dann die ohne.
        const withExpected = debugScenarios.filter(s => fs.existsSync(s.expectedReportPath));
        const withoutExpected = debugScenarios.filter(s => !fs.existsSync(s.expectedReportPath));
        filteredScenarios = [...withExpected, ...withoutExpected];
        onlyRunDebug = true;
      }
    }
    if (filteredScenarios.length === 0) {
      test('No data clumps scenarios found', () => {
        throw new Error(`No scenarios discovered in ${baseDir}${scenarioId ? ` for id=${scenarioId}` : ''}`);
      });
      return;
    }
    const skippedScenarios: string[] = [];
    for (const scenario of filteredScenarios) {
      // Wenn Debug-only läuft und das expected-Report fehlt: trotzdem ausführen und
      // zusätzlich eine Debug-Expected-Datei erstellen (Suffix '-debug.json').
      const scenarioDisplayPath = path.relative(process.cwd(), scenario.scenarioDir) || scenario.scenarioDir;
      if (onlyRunDebug && !fs.existsSync(scenario.expectedReportPath)) {
        // Erstelle einen Test, der das Szenario ausführt, den Report speichert und fehlschlägt
        test(`${scenario.name} (${scenarioDisplayPath}) [DEBUG: generated expected-report-debug]`, async () => {
          try {
            const actualReport = (await runScenario(scenario)) as DataClumpsReport;
            // Schreibe debug-expected neben dem erwarteten Pfad mit Suffix '-debug.json'
            const expectedDir = path.dirname(scenario.expectedReportPath);
            const expectedBase = path.basename(scenario.expectedReportPath, path.extname(scenario.expectedReportPath));
            const debugPath = path.join(expectedDir, `${expectedBase}-debug.json`);
            fs.writeFileSync(debugPath, JSON.stringify(actualReport, null, 2), 'utf8');
            const message = `Kein erwarteter Report für Szenario "${scenario.name}" gefunden. Es wurde ein Debug-Expected-Report erstellt: ${debugPath}`;
            scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, { status: 'failed', details: message });
            throw new Error(message);
          } catch (err) {
            if (!scenarioResults.has(`${scenario.name} (${scenarioDisplayPath})`)) {
              scenarioResults.set(`${scenario.name} (${scenarioDisplayPath})`, {
                status: 'failed',
                details: err instanceof Error ? err.message : String(err),
              });
            }
            throw err;
          }
        });
        continue;
      }

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
        console.warn(`WARNUNG: Die folgenden Szenarien wurden übersprungen, da keine report-expected-Datei gefunden wurde:\n` + skippedScenarios.map(s => `  - ${s}`).join('\n'));
      });
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

      console.log('\nZusammenfassung der Data-Clumps-Tests:');
      if (passed.length > 0) {
        console.log(['✅ Bestanden:', ...passed.map(scenarioName => `  - ${scenarioName}`)].join('\n'));
      } else {
        console.log('✅ Bestanden: Keine Tests bestanden.');
      }

      if (failed.length > 0) {
        console.log(['❌ Fehlgeschlagen:', ...failed.map(scenarioName => `  - ${scenarioName}`)].join('\n'));
      } else {
        console.log('❌ Fehlgeschlagen: Keine Tests fehlgeschlagen.');
      }

      // Falls nur Debug-Szenarien ausgeführt wurden, drucke eine detaillierte Liste der Debug-Ergebnisse.
      if (onlyRunDebug) {
        const debugPassed: string[] = [];
        const debugFailed: Array<{ name: string; details?: string }> = [];
        for (const scenario of scenarios) {
          if (!scenario.debug) continue;
          const scenarioDisplayPath = path.relative(process.cwd(), scenario.scenarioDir) || scenario.scenarioDir;
          const key = `${scenario.name} (${scenarioDisplayPath})`;
          const result = scenarioResults.get(key);
          if (!result) continue;
          if (result.status === 'passed') {
            debugPassed.push(key);
          } else {
            debugFailed.push({ name: key, details: result.details });
          }
        }

        console.log('\nErgebnisse (debug-only run):');
        console.log(`✅ Debug bestanden: ${debugPassed.length}`);
        for (const d of debugPassed) {
          console.log(`  - ${d}`);
        }
        console.log(`❌ Debug fehlgeschlagen: ${debugFailed.length}`);
        for (const d of debugFailed) {
          console.log(`  - ${d.name}`);
          if (d.details) {
            console.log(`    Details: ${d.details}`);
          }
        }
      }
    });
  });
}

testAllLanguages();

export {}; // In order to allow our outer react app to compile, we need to add an empty export statement to this file.
