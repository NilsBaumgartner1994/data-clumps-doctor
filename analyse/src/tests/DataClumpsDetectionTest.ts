import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SoftwareProjectDicts } from '../ignoreCoverage/SoftwareProject';
import { Detector, DetectorOptions } from '../ignoreCoverage/detector/Detector';
import { ParserInterface } from '../ignoreCoverage/parsers/ParserInterface';
import { ParserHelperTypeScript } from '../ignoreCoverage/parsers/ParserHelperTypeScript';
import { ClassOrInterfaceTypeContext } from '../ignoreCoverage/ParsedAstTypes';

interface ScenarioConfig {
  name: string;
  language: string;
  sourceDir: string;
  expectedReportFile: string;
  detectorOptions?: Partial<DetectorOptions>;
}

interface Scenario extends ScenarioConfig {
  scenarioDir: string;
  configPath: string;
  sourcePath: string;
  expectedReportPath: string;
}

type ParserWithDictionary = ParserInterface & {
  parseSourceToDictOfClassesOrInterfaces: (path: string) => Promise<Map<string, ClassOrInterfaceTypeContext>>;
};

function ensureParserSupportsDictionary(parser: ParserInterface): ParserWithDictionary {
  const candidate = parser as Partial<ParserWithDictionary>;
  if (typeof candidate.parseSourceToDictOfClassesOrInterfaces !== 'function') {
    throw new Error('Parser does not support direct dictionary generation.');
  }
  return parser as ParserWithDictionary;
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

function discoverScenarioConfigs(baseDir: string): Scenario[] {
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

function resolveTestCasesBaseDir(): { baseDir: string; scenarios: Scenario[] } {
  const candidates = [path.resolve(__dirname, 'data-clumps/test-cases'), path.resolve(__dirname, '..', '..', 'src/tests/data-clumps/test-cases')];

  for (const candidate of candidates) {
    const scenarios = discoverScenarioConfigs(candidate);
    if (scenarios.length > 0) {
      return { baseDir: candidate, scenarios };
    }
  }

  const fallback = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
  return { baseDir: fallback, scenarios: [] };
}

function createParser(language: string): ParserInterface {
  switch (language.toLowerCase()) {
    case 'typescript':
      return new ParserHelperTypeScript();
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

async function buildSoftwareProjectDicts(parser: ParserInterface, sourcePath: string): Promise<SoftwareProjectDicts> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source path does not exist: ${sourcePath}`);
  }

  const typedParser = ensureParserSupportsDictionary(parser);
  const classesOrInterfaces = await typedParser.parseSourceToDictOfClassesOrInterfaces(sourcePath);
  const softwareProjectDicts = new SoftwareProjectDicts();
  for (const classOrInterface of classesOrInterfaces.values()) {
    softwareProjectDicts.loadClassOrInterface(classOrInterface);
  }
  return softwareProjectDicts;
}

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

async function runScenario(scenario: Scenario) {
  const parser = createParser(scenario.language);
  const softwareProjectDicts = await buildSoftwareProjectDicts(parser, scenario.sourcePath);
  const detector = new Detector(softwareProjectDicts, scenario.detectorOptions ?? null, null, null, scenario.name, null, null, null, null, null, scenario.language);
  return detector.detect();
}

function loadExpectedReport(expectedReportPath: string) {
  if (!fs.existsSync(expectedReportPath)) {
    throw new Error(`Expected report file does not exist: ${expectedReportPath}`);
  }
  return JSON.parse(fs.readFileSync(expectedReportPath, 'utf8')) as { data_clumps: Record<string, unknown> };
}

function createScenarioTest(scenario: Scenario) {
  test(scenario.name, async () => {
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
