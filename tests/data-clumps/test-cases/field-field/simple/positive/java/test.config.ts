import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java field-field data clump between Patient and Doctor',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
