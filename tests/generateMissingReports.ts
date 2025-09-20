import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

import { resolveTestCasesBaseDir, runScenario, Scenario } from './data-clumps/scenarioUtils';

async function generateReportForScenario(scenario: Scenario) {
  const report = await runScenario(scenario);
  const outputPath = path.resolve(scenario.scenarioDir, 'report-generated-to-check.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Generated report for "${scenario.name}" at ${outputPath}`);
}

async function main() {
  const args = minimist(process.argv.slice(2));
  const scenarioId = args.id;
  const { scenarios, baseDir } = resolveTestCasesBaseDir();
  let filteredScenarios = scenarios;
  if (scenarioId) {
    filteredScenarios = scenarios.filter(s => s.id === scenarioId);
  }
  if (filteredScenarios.length === 0) {
    console.error(`No scenarios discovered in ${baseDir}${scenarioId ? ` for id=${scenarioId}` : ''}`);
    process.exitCode = 1;
    return;
  }
  const missingExpected = filteredScenarios.filter(scenario => !fs.existsSync(scenario.expectedReportPath));
  if (missingExpected.length === 0) {
    console.log('All scenarios already have expected reports. Nothing to generate.');
    return;
  }
  for (const scenario of missingExpected) {
    await generateReportForScenario(scenario);
  }
}

void main();
