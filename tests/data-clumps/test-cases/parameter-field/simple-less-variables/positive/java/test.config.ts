import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "Java parameter-field data clump with lower shared threshold",
  "language": "java",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {
    "sharedParametersToFieldsAmountMinimum": 2
  }
} satisfies ScenarioConfig;

export default config;
