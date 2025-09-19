import fs from 'fs';
import os from 'os';
import path from 'path';

import { Detector, DetectorOptions } from '../../ignoreCoverage/detector/Detector';
import { ParserHelper } from '../../ignoreCoverage/ParserHelper';
import { SoftwareProjectDicts } from '../../ignoreCoverage/SoftwareProject';
import { ParserInterface } from '../../ignoreCoverage/parsers/ParserInterface';
import { ParserHelperJavaSourceCode } from '../../ignoreCoverage/parsers/ParserHelperJavaSourceCode';
import { ParserHelperTypeScript } from '../../ignoreCoverage/parsers/ParserHelperTypeScript';
import { ClassOrInterfaceTypeContext } from '../../ignoreCoverage/ParsedAstTypes';

export interface ScenarioConfig {
  name: string;
  language: string;
  sourceDir: string;
  expectedReportFile: string;
  detectorOptions?: Partial<DetectorOptions>;
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

function resolveScenarioPaths(configPath: string, rawConfig: ScenarioConfig): Scenario {
  const scenarioDir = path.dirname(configPath);
  return {
    ...rawConfig,
    scenarioDir,
    configPath,
    sourcePath: path.resolve(scenarioDir, rawConfig.sourceDir),
    expectedReportPath: path.resolve(scenarioDir, rawConfig.expectedReportFile),
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
      } else if (entry.isFile() && entry.name === 'test.config.json') {
        const rawConfig = JSON.parse(fs.readFileSync(entryPath, 'utf8')) as ScenarioConfig;
        scenarios.push(resolveScenarioPaths(entryPath, rawConfig));
      }
    }
  }

  return scenarios;
}

export function resolveTestCasesBaseDir(): { baseDir: string; scenarios: Scenario[] } {
  const candidates = [path.resolve(__dirname, 'test-cases'), path.resolve(__dirname, '..', '..', '..', 'src/tests/data-clumps/test-cases')];

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
  const candidates = [path.resolve(__dirname, '../ignoreCoverage/astGenerator'), path.resolve(__dirname, '..', 'ignoreCoverage/astGenerator'), path.resolve(__dirname, '..', '..', '..', 'src/ignoreCoverage/astGenerator'), path.resolve(__dirname, '..', '..', '..', 'ignoreCoverage/astGenerator')];

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

  try {
    await parser.parseSourceToAst(sourcePath, tempAstDir);
    return await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(tempAstDir, detectorOptions ?? {});
  } finally {
    try {
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
  const detector = new Detector(softwareProjectDicts, scenario.detectorOptions ?? null, null, null, scenario.name, null, null, null, null, null, scenario.language);
  return detector.detect();
}
