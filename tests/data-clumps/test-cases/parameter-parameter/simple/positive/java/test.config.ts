import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java parameter-parameter data clump between scheduler and billing',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
