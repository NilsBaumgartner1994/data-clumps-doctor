import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'parameter-parameter-interfaces-positive-java',
  name: 'Java parameter-parameter data clump between unrelated interfaces',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
