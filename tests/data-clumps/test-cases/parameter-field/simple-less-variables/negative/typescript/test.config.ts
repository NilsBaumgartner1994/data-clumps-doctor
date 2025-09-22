import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript parameter-field ignored due to higher threshold',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {
    sharedParametersToFieldsAmountMinimum: 3,
  },
} satisfies ScenarioConfig;

export default config;
