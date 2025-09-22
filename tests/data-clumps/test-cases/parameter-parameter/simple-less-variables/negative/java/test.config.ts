import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "Java parameter-parameter ignored due to higher threshold",
  "language": "java",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {
    "sharedParametersToParametersAmountMinimum": 3,
    "sharedParametersToFieldsAmountMinimum": 3
  }
} satisfies ScenarioConfig;

export default config;
