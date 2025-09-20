import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

import { resolveTestCasesBaseDir, runScenario, Scenario } from './data-clumps/scenarioUtils';

async function regenerateExpectedReportForScenario(scenario: Scenario) {
  const report = await runScenario(scenario);
  const outputPath = path.resolve(scenario.expectedReportPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Regenerated expected report for "${scenario.name}" at ${outputPath}`);
}

async function main() {
  const args = minimist(process.argv.slice(2));
  const scenarioId = args.id as string | undefined;
  const { scenarios, baseDir } = resolveTestCasesBaseDir();

  let filteredScenarios = scenarios;
  if (scenarioId) {
    filteredScenarios = scenarios.filter(scenario => scenario.id === scenarioId);
  }

  if (filteredScenarios.length === 0) {
    console.error(`No scenarios discovered in ${baseDir}${scenarioId ? ` for id=${scenarioId}` : ''}`);
    process.exitCode = 1;
    return;
  }

  const scenariosWithExpected = filteredScenarios.filter(scenario => fs.existsSync(scenario.expectedReportPath));

  if (scenariosWithExpected.length === 0) {
    console.log('No scenarios with existing expected reports found. Nothing to regenerate.');
    return;
  }

  for (const scenario of scenariosWithExpected) {
    await regenerateExpectedReportForScenario(scenario);
  }
}

void main();
