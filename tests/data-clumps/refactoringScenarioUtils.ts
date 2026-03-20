import fs from 'fs';
import os from 'os';
import path from 'path';

import { Detector } from '../../src/ignoreCoverage/detector/Detector';
import { ParserHelper } from '../../src/ignoreCoverage/ParserHelper';
import { TsMorphDataClumpRefactorer } from '../../src/ignoreCoverage/TsMorphDataClumpRefactorer';
import { ParserHelperTypeScript } from '../../src/ignoreCoverage/parsers/ParserHelperTypeScript';
import { DataClumpTypeContext } from 'data-clumps-type-context';

const REFACTORING_CONFIG_FILENAMES = new Set(['refactoring.config.ts', 'refactoring.config.js', 'refactoring.config.cjs', 'refactoring.config.json']);

let tsConfigPathsRegistered = false;
let tsNodeRegistered = false;

function ensureTsConfigPathsRegistered(configPath: string) {
  if (tsConfigPathsRegistered) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('tsconfig-paths/register');
    tsConfigPathsRegistered = true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to resolve module aliases while loading refactoring config at ${configPath}. ${reason}. Please ensure tsconfig-paths is installed.`);
  }
}

function ensureTsNodeRegistered(configPath: string) {
  if (tsNodeRegistered) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('ts-node/register');
    tsNodeRegistered = true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load TypeScript refactoring config at ${configPath}. ${reason}. Please run "yarn build" before executing the tests or ensure ts-node is installed.`);
  }
}

function loadRefactoringConfig(configPath: string): RefactoringScenarioConfig {
  const extension = path.extname(configPath).toLowerCase();
  if (extension === '.json') {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as RefactoringScenarioConfig;
  }

  ensureTsConfigPathsRegistered(configPath);

  if (extension === '.ts') {
    ensureTsNodeRegistered(configPath);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loadedModule = require(configPath);
  const config = (loadedModule?.default ?? loadedModule?.config ?? loadedModule) as RefactoringScenarioConfig | undefined;
  if (!config) {
    throw new Error(`Refactoring config at ${configPath} did not export a configuration object.`);
  }

  return config;
}

export interface RefactoringScenarioConfig {
  id?: string;
  name: string;
  language: string;
  sourceDir: string;
  sourceExpectedDir: string;
  debug?: boolean;
}

export interface RefactoringScenario extends RefactoringScenarioConfig {
  scenarioDir: string;
  configPath: string;
  sourcePath: string;
  sourceExpectedPath: string;
}

function resolveRefactoringScenarioResourcePath(scenarioDir: string, relativePath: string): string {
  const buildTestCasesDir = path.resolve(__dirname, 'test-cases/refactoring');
  const isBuildPath = buildTestCasesDir.includes(`${path.sep}build${path.sep}`);
  if (isBuildPath) {
    const relativeScenarioPath = path.relative(buildTestCasesDir, scenarioDir);
    if (!relativeScenarioPath.startsWith('..') && !path.isAbsolute(relativeScenarioPath)) {
      return path.resolve(__dirname, '..', '..', '..', 'tests/data-clumps/test-cases/refactoring', relativeScenarioPath, relativePath);
    }
  }
  return path.resolve(scenarioDir, relativePath);
}

function resolveRefactoringScenarioPaths(configPath: string, rawConfig: RefactoringScenarioConfig): RefactoringScenario {
  const scenarioDir = path.dirname(configPath);
  return {
    ...rawConfig,
    scenarioDir,
    configPath,
    sourcePath: resolveRefactoringScenarioResourcePath(scenarioDir, rawConfig.sourceDir),
    sourceExpectedPath: resolveRefactoringScenarioResourcePath(scenarioDir, rawConfig.sourceExpectedDir),
  };
}

export function discoverRefactoringScenarios(baseDir: string): RefactoringScenario[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const stack: string[] = [baseDir];
  const scenarios: RefactoringScenario[] = [];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && REFACTORING_CONFIG_FILENAMES.has(entry.name)) {
        const rawConfig = loadRefactoringConfig(entryPath);
        scenarios.push(resolveRefactoringScenarioPaths(entryPath, rawConfig));
      }
    }
  }

  return scenarios;
}

export function resolveRefactoringTestCasesBaseDir(): { baseDir: string; scenarios: RefactoringScenario[] } {
  const candidates = [
    path.resolve(__dirname, 'test-cases/refactoring'),
    path.resolve(__dirname, '..', '..', '..', 'tests/data-clumps/test-cases/refactoring'),
  ];

  for (const candidate of candidates) {
    const scenarios = discoverRefactoringScenarios(candidate);
    if (scenarios.length > 0) {
      return { baseDir: candidate, scenarios };
    }
  }

  const fallback = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
  return { baseDir: fallback, scenarios: [] };
}

/**
 * Copies the source directory to a temporary directory and returns the path.
 */
function copySourceToTemp(sourcePath: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-refactor-'));
  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(sourcePath, entry.name);
    const destEntry = path.join(tempDir, entry.name);
    if (entry.isFile()) {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
  return tempDir;
}

/**
 * Normalizes file content for comparison:
 * - Normalizes line endings to LF
 * - Trims trailing whitespace
 */
export function normalizeFileContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export interface RefactoringScenarioResult {
  workDir: string;
  refactoredFiles: string[];
}

/**
 * Runs a refactoring scenario:
 * 1. Copies source to a temp directory
 * 2. Detects data clumps
 * 3. Refactors the first parameter-parameter data clump found
 * 4. Returns the result
 */
export async function runRefactoringScenario(scenario: RefactoringScenario): Promise<RefactoringScenarioResult> {
  if (!fs.existsSync(scenario.sourcePath)) {
    throw new Error(`Source path does not exist: ${scenario.sourcePath}`);
  }

  const workDir = copySourceToTemp(scenario.sourcePath);
  const tempAstDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-ast-'));

  try {
    const parser = new ParserHelperTypeScript();
    await parser.parseSourceToAst(workDir, tempAstDir);
    const softwareProjectDicts = await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(tempAstDir, {});
    const detector = new Detector(softwareProjectDicts, null, null, null, scenario.name, null, null, null, null, null, scenario.language);
    const report = await detector.detect();

    const dataClumps = Object.values(report.data_clumps) as DataClumpTypeContext[];
    const clump = dataClumps.find(dc => dc.data_clump_type === 'parameters_to_parameters_data_clump');
    if (!clump) {
      throw new Error(`No parameter-parameter data clump found in scenario "${scenario.name}"`);
    }

    const refactorer = new TsMorphDataClumpRefactorer(workDir);
    const result = await refactorer.refactorDataClump(clump);

    return { workDir, refactoredFiles: result.modifiedFiles };
  } finally {
    try {
      await ParserHelper.removeGeneratedAst(tempAstDir, `Cleanup for scenario ${scenario.name}`);
    } catch {
      // ignore cleanup errors
    }
  }
}
