import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java field-field data clump with variable order',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
