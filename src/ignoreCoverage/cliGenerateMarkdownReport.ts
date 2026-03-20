#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { Command } from 'commander';
import { DataClumpsTypeContext } from 'data-clumps-type-context';
import { generatePriorityList } from './cliGeneratePriorityList';
import { IssueMarkdownGenerator } from './IssueMarkdownGenerator';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

program
  .description('Generate Issue Markdown from a Data Clumps Report\n\n' + 'Reads a data clumps report (JSON) and renders a GitHub-flavoured Markdown body\n' + 'suitable for creating a GitHub issue or saving locally.\n\n' + 'The report can be provided directly via --report_path, or generated on-the-fly\n' + 'by specifying a GitHub project URL (--git_project_url_to_analyse) to clone and\n' + 'analyse automatically.\n\n' + 'npx data-clumps-doctor-markdown-report [options]')
  .version(version)
  // ── Report input (mutually exclusive: use one) ──────────────────────────
  .option('--report_path <path>', 'Path to an existing data clumps report JSON file')
  .option('--git_project_url_to_analyse <url>', 'GitHub project URL to clone, analyse, and generate markdown for')
  .option('--git_project_temp_folder <path>', 'Temp folder used when cloning a git project (default: system temp)')
  .option('--source_type <type>', 'Source type when analysing a git project (typescript, java, uml, ast, digitalTwinsDefinitionLanguage, ngsi-ld)', 'typescript')
  .option('--relative_path_to_source_folder_in_project <path>', 'Relative path to source files inside the cloned project', './')
  // ── Priority list options ───────────────────────────────────────────────
  .option('--cluster_type_priority <priority>', 'Cluster type priority order, e.g. "1,2,3" or "single,two,large"', '1,2,3')
  .option('--amount <number>', 'Maximum number of data clumps to include in the markdown (default: all)')
  // ── Markdown override options ───────────────────────────────────────────
  .option('--project_url <url>', 'GitHub repository URL (overrides value from report)')
  .option('--commit_hash <hash>', 'Commit hash for permalink generation (overrides value from report)')
  .option('--source_prefix <prefix>', 'Path prefix relative to the repository root to prepend to file paths in GitHub links (e.g. "src"). Overrides value stored in report.')
  // ── Output ─────────────────────────────────────────────────────────────
  .option('--markdown_output_path <path>', 'Write the markdown to this file instead of stdout');

function parseClusterTypePriority(input: string): number[] {
  const mapping: Record<string, number> = {
    single: 1,
    '1': 1,
    two: 2,
    pair: 2,
    '2': 2,
    large: 3,
    '3': 3,
  };

  return input
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .map(s => {
      const mapped = mapping[s];
      if (mapped === undefined) {
        console.error(`Unknown cluster type: "${s}". Use 1/single, 2/two/pair, 3/large.`);
        process.exit(1);
      }
      return mapped;
    });
}

async function main() {
  program.parse(process.argv);
  const options = program.opts();

  let reportPath: string | undefined = options.report_path;

  // ── If a git URL is provided, run detection first ──────────────────────
  if (options.git_project_url_to_analyse) {
    const gitUrl: string = options.git_project_url_to_analyse;

    const tempFolder: string = options.git_project_temp_folder ?? path.join(require('os').tmpdir(), 'data-clumps-doctor-temp');

    const tempReportPath = path.join(tempFolder, 'data-clumps-report.json');
    fs.mkdirSync(tempFolder, { recursive: true });

    const cliPath = path.join(__dirname, 'cli.js');
    if (!fs.existsSync(cliPath)) {
      console.error('ERROR: cli.js not found at: ' + cliPath);
      process.exit(1);
    }

    const sourceType: string = options.source_type;
    const relativeSourcePath: string = options.relative_path_to_source_folder_in_project;

    process.stderr.write('Cloning and analysing project: ' + gitUrl + '\n');

    const result = spawnSync(process.execPath, [cliPath, '--git_project_url_to_analyse', gitUrl, '--source_type', sourceType, '--relative_path_to_source_folder_in_project', relativeSourcePath, '--commit_selection', 'current', '--output', tempReportPath], { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error('ERROR: Detection failed for: ' + gitUrl);
      process.exit(1);
    }

    reportPath = tempReportPath;
  }

  if (!reportPath) {
    console.error('ERROR: Either --report_path or --git_project_url_to_analyse is required.');
    process.exit(1);
  }

  if (!fs.existsSync(reportPath)) {
    console.error('ERROR: Report file does not exist: ' + reportPath);
    process.exit(1);
  }

  let report: DataClumpsTypeContext;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (e) {
    console.error('ERROR: Failed to parse report JSON: ' + reportPath);
    console.error(e);
    process.exit(1);
  }

  const clusterTypePriority = parseClusterTypePriority(options.cluster_type_priority);
  const amount = options.amount !== undefined ? parseInt(options.amount, 10) : Number.MAX_SAFE_INTEGER;

  const priorityList = generatePriorityList(report, clusterTypePriority, amount);

  // Resolve project URL, commit hash and source prefix: CLI flags override report values
  let projectUrl: string | undefined = options.project_url;
  let commitHash: string | undefined = options.commit_hash;
  let sourcePrefix: string | undefined = options.source_prefix;

  if (!projectUrl) projectUrl = report?.project_info?.project_url ?? undefined;
  if (!commitHash) commitHash = report?.project_info?.project_commit_hash ?? undefined;
  if (!sourcePrefix) sourcePrefix = report?.project_info?.additional?.relative_path_to_source_folder_in_project ?? undefined;

  const markdown = IssueMarkdownGenerator.generate(priorityList, { projectUrl, commitHash, sourcePrefix });

  if (options.markdown_output_path) {
    const outputDir = path.dirname(options.markdown_output_path);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(options.markdown_output_path, markdown, 'utf8');
    process.stderr.write('Issue markdown written to: ' + options.markdown_output_path + '\n');
  } else {
    process.stdout.write(markdown);
  }
}

if (require.main === module) {
  main();
}
