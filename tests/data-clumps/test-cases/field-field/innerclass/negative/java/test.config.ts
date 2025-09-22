import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  id: 'check',
  name: 'Java field-field data clump with inner class Patient and Doctor',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
