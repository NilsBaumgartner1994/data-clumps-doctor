import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'parameter-parameter-classes-with-implemented-interfaces-positive-typescript',
  name: 'TypeScript parameter-parameter data clumps detection in classes with implemented interfaces - positive case',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
