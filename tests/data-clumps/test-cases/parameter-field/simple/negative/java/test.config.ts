import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'parameter-field-simple-negative-java',
  name: 'Java parameter-field without enough shared values',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
