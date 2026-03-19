#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { PriorityListItem } from './cliGeneratePriorityList';
import { IssueMarkdownGenerator } from './IssueMarkdownGenerator';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

program
  .description('Generate GitHub Issue Markdown from a data clumps priority list\n\n' + 'Reads a priority list JSON (produced by cliGeneratePriorityList) and renders\n' + 'a GitHub-flavoured Markdown body suitable for use with `gh issue create`.\n\n' + 'npx data-clumps-doctor-issue-markdown [options]')
  .version(version)
  .option('--priority_list <path>', 'Path to the priority list JSON file')
  .option('--report_path <path>', 'Path to the data clumps report JSON (used to extract project_url, project_commit_hash, and source prefix)')
  .option('--project_url <url>', 'GitHub repository URL (overrides value from report)')
  .option('--commit_hash <hash>', 'Commit hash for permalink generation (overrides value from report)')
  .option('--source_prefix <prefix>', 'Path prefix relative to the repository root to prepend to file paths in GitHub links (e.g. "src"). Overrides value stored in report.')
  .option('--output <path>', 'Write the markdown to this file instead of stdout');

async function main() {
  program.parse(process.argv);
  const options = program.opts();

  const priorityListPath = options.priority_list;
  if (!priorityListPath) {
    console.error('ERROR: --priority_list is required.');
    process.exit(1);
  }

  if (!fs.existsSync(priorityListPath)) {
    console.error('ERROR: Priority list file does not exist: ' + priorityListPath);
    process.exit(1);
  }

  let items: PriorityListItem[];
  try {
    items = JSON.parse(fs.readFileSync(priorityListPath, 'utf8'));
  } catch (e) {
    console.error('ERROR: Failed to parse priority list JSON: ' + priorityListPath);
    console.error(e);
    process.exit(1);
  }

  // Resolve project URL and commit hash: CLI flags take precedence over report values
  let projectUrl: string | undefined = options.project_url;
  let commitHash: string | undefined = options.commit_hash;
  let sourcePrefix: string | undefined = options.source_prefix;

  if (options.report_path && fs.existsSync(options.report_path)) {
    try {
      const report = JSON.parse(fs.readFileSync(options.report_path, 'utf8'));
      if (!projectUrl) projectUrl = report?.project_info?.project_url ?? undefined;
      if (!commitHash) commitHash = report?.project_info?.project_commit_hash ?? undefined;
      if (!sourcePrefix) sourcePrefix = report?.project_info?.additional?.relative_path_to_source_folder_in_project ?? undefined;
    } catch {
      console.warn('WARNING: Could not parse report file for project info: ' + options.report_path);
    }
  }

  const markdown = IssueMarkdownGenerator.generate(items, { projectUrl, commitHash, sourcePrefix });

  if (options.output) {
    const outputDir = path.dirname(options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(options.output, markdown, 'utf8');
    console.log('Issue markdown written to: ' + options.output);
  } else {
    process.stdout.write(markdown);
  }
}

main();
