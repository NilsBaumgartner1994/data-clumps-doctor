import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "id": "parameter-parameter-interfaces-positive-typescript",
  "name": "TypeScript parameter-parameter data clump between unrelated interfaces",
  "language": "typescript",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {}
} satisfies ScenarioConfig;

export default config;
