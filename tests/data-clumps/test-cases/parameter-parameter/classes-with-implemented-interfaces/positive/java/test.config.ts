import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'parameter-parameter-classes-with-implemented-interfaces-positive-java',
  name: 'TypeScript parameter-parameter data clumps detection in classes with implemented interfaces - positive case',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
