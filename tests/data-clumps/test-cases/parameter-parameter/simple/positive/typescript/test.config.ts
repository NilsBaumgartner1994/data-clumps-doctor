import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript parameter-parameter data clump between scheduler and billing',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
  debug: false,
} satisfies ScenarioConfig;

export default config;
