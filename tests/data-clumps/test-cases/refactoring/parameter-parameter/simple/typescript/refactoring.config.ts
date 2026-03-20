import type { RefactoringScenarioConfig } from '@/refactoringScenarioUtils';

const config = {
  name: 'TypeScript parameter-parameter data clump refactoring: scheduler and billing',
  language: 'typescript',
  sourceDir: 'source',
  sourceExpectedDir: 'source-expected',
  debug: false,
} satisfies RefactoringScenarioConfig;

export default config;
