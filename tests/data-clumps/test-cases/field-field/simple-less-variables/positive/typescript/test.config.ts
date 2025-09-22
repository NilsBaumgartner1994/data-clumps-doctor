import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "TypeScript field-field data clump with lower shared threshold",
  "language": "typescript",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {
    "sharedFieldsToFieldsAmountMinimum": 2
  }
} satisfies ScenarioConfig;

export default config;
