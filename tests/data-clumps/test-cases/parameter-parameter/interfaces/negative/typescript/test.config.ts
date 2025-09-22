import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "id": "parameter-parameter-interfaces-negative-typescript",
  "name": "TypeScript parameter-parameter interfaces without enough shared parameters",
  "language": "typescript",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {}
} satisfies ScenarioConfig;

export default config;
