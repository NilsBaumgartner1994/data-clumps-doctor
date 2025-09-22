import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript field-field data clump with non-primitive datatypes',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
