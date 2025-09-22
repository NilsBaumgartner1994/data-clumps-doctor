import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'check',
  name: 'Java no field-field data clump with different types but same type name',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
