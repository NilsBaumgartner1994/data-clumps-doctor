import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "TypeScript parameter-parameter data clump with lower shared threshold",
  "language": "typescript",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {
    "sharedParametersToParametersAmountMinimum": 2,
    "sharedParametersToFieldsAmountMinimum": 2
  }
} satisfies ScenarioConfig;

export default config;
