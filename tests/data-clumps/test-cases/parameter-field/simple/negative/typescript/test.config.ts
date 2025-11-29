import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript parameter-field without enough shared values',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
