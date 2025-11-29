import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java no field-field data clump with different types but same type name',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
