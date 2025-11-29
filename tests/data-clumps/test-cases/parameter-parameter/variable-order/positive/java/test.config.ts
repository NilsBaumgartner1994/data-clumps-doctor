import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'parameter-parameter-variable-order-positive-java',
  name: 'Java parameter-parameter data clump with variable order',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
