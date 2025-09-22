import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java parameter-field ignored due to higher threshold',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {
    sharedParametersToFieldsAmountMinimum: 3,
  },
} satisfies ScenarioConfig;

export default config;
