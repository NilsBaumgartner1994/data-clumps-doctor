import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'Java field-field ignored due to higher threshold',
  language: 'java',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {
    sharedFieldsToFieldsAmountMinimum: 3,
  },
} satisfies ScenarioConfig;

export default config;
