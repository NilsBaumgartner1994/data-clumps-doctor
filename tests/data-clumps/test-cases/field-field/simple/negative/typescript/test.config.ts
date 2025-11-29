import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript field-field without enough shared fields',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
