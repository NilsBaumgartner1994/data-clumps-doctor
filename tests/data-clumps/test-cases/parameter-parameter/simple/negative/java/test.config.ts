import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java parameter-parameter without enough shared parameters',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
