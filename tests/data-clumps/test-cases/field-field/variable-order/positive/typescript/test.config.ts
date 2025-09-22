import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript field-field data clump with variable order',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
