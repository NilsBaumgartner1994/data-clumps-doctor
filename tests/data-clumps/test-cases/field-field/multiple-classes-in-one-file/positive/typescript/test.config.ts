import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript field-field data clump multiple classes in one file',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
