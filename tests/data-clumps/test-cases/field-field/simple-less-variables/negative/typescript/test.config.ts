import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "TypeScript field-field ignored due to higher threshold",
  "language": "typescript",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {
    "sharedFieldsToFieldsAmountMinimum": 3
  }
} satisfies ScenarioConfig;

export default config;
