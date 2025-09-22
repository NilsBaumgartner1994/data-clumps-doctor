import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "TypeScript parameter-parameter ignored due to higher threshold",
  "language": "typescript",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {
    "sharedParametersToParametersAmountMinimum": 3,
    "sharedParametersToFieldsAmountMinimum": 3
  }
} satisfies ScenarioConfig;

export default config;
