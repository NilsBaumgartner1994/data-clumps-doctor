import type { ScenarioConfig } from '@/scenarioUtils';

const config = {
  "name": "Java parameter-field data clump between service and patient",
  "language": "java",
  "sourceDir": "source",
  "expectedReportFile": "report-expected.json",
  "detectorOptions": {}
} satisfies ScenarioConfig;

export default config;
