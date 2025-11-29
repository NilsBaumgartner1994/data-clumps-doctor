import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'parameter-field-variable-order-positive-java',
  name: 'Java parameter-field data clump with variable order',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
