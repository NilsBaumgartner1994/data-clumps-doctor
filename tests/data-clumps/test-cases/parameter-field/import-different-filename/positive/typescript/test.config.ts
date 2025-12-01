import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript parameter-field data clump between service and patient (import from different filename)',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
