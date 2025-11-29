import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript parameter-parameter without enough shared parameters',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
