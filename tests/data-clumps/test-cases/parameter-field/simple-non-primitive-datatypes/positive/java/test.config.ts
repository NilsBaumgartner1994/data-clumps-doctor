import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java parameter-field data clump with non-primitive datatypes',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
