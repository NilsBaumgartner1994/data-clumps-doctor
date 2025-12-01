import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript - paths ignored in detection - positive',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {
    pathsIgnoredInDetectionComparison: ["**/WithDataClumpsButIgnored.ts"]
  },
  debug: false,
} satisfies ScenarioConfig;

export default config;
