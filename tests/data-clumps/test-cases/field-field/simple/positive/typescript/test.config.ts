import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  name: 'TypeScript field-field data clump between Patient and Doctor',
  language: 'typescript',
  sourceDir: 'source',
  expectedReportFile: 'report-expected.json',
  detectorOptions: {},
} satisfies ScenarioConfig;

export default config;
