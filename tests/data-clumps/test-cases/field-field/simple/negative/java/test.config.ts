import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'field-field-simple-negative-java',
  name: 'Java field-field without enough shared fields',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
