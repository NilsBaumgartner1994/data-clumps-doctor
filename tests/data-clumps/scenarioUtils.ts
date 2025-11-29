import fs from 'fs';
import os from 'os';
import path from 'path';

import { Detector, DetectorOptions } from '../../src/ignoreCoverage/detector/Detector';
import { ParserHelper } from '../../src/ignoreCoverage/ParserHelper';
import { SoftwareProjectDicts } from '../../src/ignoreCoverage/SoftwareProject';
import { ParserInterface } from '../../src/ignoreCoverage/parsers/ParserInterface';
import { ParserHelperJavaSourceCode } from '../../src/ignoreCoverage/parsers/ParserHelperJavaSourceCode';
import { ParserHelperTypeScript } from '../../src/ignoreCoverage/parsers/ParserHelperTypeScript';
import { ClassOrInterfaceTypeContext } from '../../src/ignoreCoverage/ParsedAstTypes';

const SCENARIO_CONFIG_FILENAMES = new Set(['test.config.ts', 'test.config.js', 'test.config.cjs', 'test.config.json']);

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
    throw new Error(`Unable to resolve module aliases while loading scenario config at ${configPath}. ${reason}. Please ensure tsconfig-paths is installed.`);
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
    throw new Error(`Unable to load TypeScript scenario config at ${configPath}. ${reason}. Please run "yarn build" before executing the tests or ensure ts-node is installed.`);
  }
}

function loadScenarioConfig(configPath: string): ScenarioConfig {
  const extension = path.extname(configPath).toLowerCase();
  if (extension === '.json') {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as ScenarioConfig;
  }

  ensureTsConfigPathsRegistered(configPath);

  if (extension === '.ts') {
    ensureTsNodeRegistered(configPath);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loadedModule = require(configPath);
  const config = (loadedModule?.default ?? loadedModule?.config ?? loadedModule) as ScenarioConfig | undefined;
  if (!config) {
    throw new Error(`Scenario config at ${configPath} did not export a configuration object.`);
  }

  return config;
}

export interface ScenarioConfig {
  id?: string;
  name: string;
  language: string;
  sourceDir: string;
  expectedReportFile: string;
  detectorOptions?: Partial<DetectorOptions>;
  debug?: boolean;
}

export interface Scenario extends ScenarioConfig {
  scenarioDir: string;
  configPath: string;
  sourcePath: string;
  expectedReportPath: string;
}

type ParserWithDictionary = ParserInterface & {
  parseSourceToDictOfClassesOrInterfaces: (path: string) => Promise<Map<string, ClassOrInterfaceTypeContext>>;
};

function parserSupportsDictionary(parser: ParserInterface): parser is ParserWithDictionary {
  return typeof (parser as Partial<ParserWithDictionary>).parseSourceToDictOfClassesOrInterfaces === 'function';
}

function resolveScenarioResourcePath(scenarioDir: string, relativePath: string): string {
  const buildTestCasesDir = path.resolve(__dirname, 'test-cases');
  const isBuildPath = buildTestCasesDir.includes(`${path.sep}build${path.sep}`);
  if (isBuildPath) {
    const relativeScenarioPath = path.relative(buildTestCasesDir, scenarioDir);
    if (!relativeScenarioPath.startsWith('..') && !path.isAbsolute(relativeScenarioPath)) {
      return path.resolve(__dirname, '..', '..', '..', 'tests/data-clumps/test-cases', relativeScenarioPath, relativePath);
    }
  }

  return path.resolve(scenarioDir, relativePath);
}

function resolveScenarioPaths(configPath: string, rawConfig: ScenarioConfig): Scenario {
  const scenarioDir = path.dirname(configPath);
  return {
    ...rawConfig,
    scenarioDir,
    configPath,
    sourcePath: resolveScenarioResourcePath(scenarioDir, rawConfig.sourceDir),
    expectedReportPath: resolveScenarioResourcePath(scenarioDir, rawConfig.expectedReportFile),
  };
}

export function discoverScenarioConfigs(baseDir: string): Scenario[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const stack: string[] = [baseDir];
  const scenarios: Scenario[] = [];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && SCENARIO_CONFIG_FILENAMES.has(entry.name)) {
        const rawConfig = loadScenarioConfig(entryPath);
        scenarios.push(resolveScenarioPaths(entryPath, rawConfig));
      }
    }
  }

  return scenarios;
}

export function resolveTestCasesBaseDir(): { baseDir: string; scenarios: Scenario[] } {
  const candidates = [path.resolve(__dirname, 'test-cases'), path.resolve(__dirname, '..', '..', '..', 'tests/data-clumps/test-cases')];

  for (const candidate of candidates) {
    const scenarios = discoverScenarioConfigs(candidate);
    if (scenarios.length > 0) {
      return { baseDir: candidate, scenarios };
    }
  }

  const fallback = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
  return { baseDir: fallback, scenarios: [] };
}

function resolveAstGeneratorFolder(): string {
  const candidates = [path.resolve(__dirname, '..', '..', 'ignoreCoverage/astGenerator'), path.resolve(__dirname, '..', '..', '..', 'ignoreCoverage/astGenerator'), path.resolve(__dirname, '..', '..', 'src/ignoreCoverage/astGenerator'), path.resolve(__dirname, '..', '..', '..', 'src/ignoreCoverage/astGenerator')];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find astGenerator folder. Looked in: ${candidates.join(', ')}`);
}

export function createParser(language: string): ParserInterface {
  switch (language.toLowerCase()) {
    case 'typescript':
      return new ParserHelperTypeScript();
    case 'java':
      return new ParserHelperJavaSourceCode(resolveAstGeneratorFolder());
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

async function buildSoftwareProjectDicts(parser: ParserInterface, sourcePath: string, detectorOptions: Partial<DetectorOptions> | undefined): Promise<SoftwareProjectDicts> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source path does not exist: ${sourcePath}`);
  }

  if (parserSupportsDictionary(parser)) {
    const classesOrInterfaces = await parser.parseSourceToDictOfClassesOrInterfaces(sourcePath);
    const softwareProjectDicts = new SoftwareProjectDicts();
    for (const classOrInterface of classesOrInterfaces.values()) {
      softwareProjectDicts.loadClassOrInterface(classOrInterface);
    }
    return softwareProjectDicts;
  }

  const tempAstDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-clumps-ast-'));
  //console.log("Using temporary AST output directory:", tempAstDir);

  try {
    await parser.parseSourceToAst(sourcePath, tempAstDir);
    return await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(tempAstDir, detectorOptions ?? {});
  } finally {
    try {
      //console.log("Cleaning up temporary AST output directory:", tempAstDir);
      await ParserHelper.removeGeneratedAst(tempAstDir, `Cleanup temporary AST output for ${sourcePath}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to remove temporary AST output at ${tempAstDir}:`, error);
    }
  }
}

export async function runScenario(scenario: Scenario) {
  const parser = createParser(scenario.language);
  const softwareProjectDicts = await buildSoftwareProjectDicts(parser, scenario.sourcePath, scenario.detectorOptions);
  if (scenario.debug) {
    console.log(`SoftwareProjectDicts for scenario "${scenario.name}":`);
    console.log(JSON.stringify(softwareProjectDicts, null, 2));
  }

  const detector = new Detector(softwareProjectDicts, scenario.detectorOptions ?? null, null, null, scenario.name, null, null, null, null, null, scenario.language);
  let result = await detector.detect();
  if (scenario.debug) {
    console.log(`Detection result for scenario "${scenario.name}":`);
    console.log(JSON.stringify(result.report_summary, null, 2));
  }
  return result;
}
