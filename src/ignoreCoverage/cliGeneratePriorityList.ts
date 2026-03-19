#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { DataClumpsTypeContext } from 'data-clumps-type-context';
import { buildClusterInfoFromDataClumps } from './ClusterHelper';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

export type PriorityListItem = {
  cluster_id: number;
  cluster_type: number;
  data_clump_id: string;
  data_clump_type: string;
  from_class_or_interface_name: string;
  to_class_or_interface_name: string;
  from_method_name: string | null;
  to_method_name: string | null;
  amount_of_variables: number;
  variable_names: string[];
  from_file_path: string;
  to_file_path: string;
  from_start_line: number | null;
  from_end_line: number | null;
  to_start_line: number | null;
  to_end_line: number | null;
};

/**
 * Resolves cluster info for each data clump entry.
 * Uses pre-computed cluster info from the report when available,
 * otherwise falls back to rebuilding clusters via ClusterHelper.
 */
function getClusterInfoForDataClumps(data_clumps: Record<string, any>): Record<string, { cluster_id: number; cluster_type: number }> {
  const result: Record<string, { cluster_id: number; cluster_type: number }> = {};
  let hasPrecomputed = false;

  for (const key of Object.keys(data_clumps)) {
    const dc = data_clumps[key];
    const additional = dc.data_clump_type_additional;
    if (additional && additional.cluster_id !== undefined && additional.cluster_type !== undefined) {
      result[key] = { cluster_id: additional.cluster_id, cluster_type: additional.cluster_type };
      hasPrecomputed = true;
    }
  }

  if (hasPrecomputed) {
    return result;
  }

  // Fallback: rebuild clusters from the graph
  const nodeClusterInfo = buildClusterInfoFromDataClumps(data_clumps);

  for (const key of Object.keys(data_clumps)) {
    const dc = data_clumps[key];
    const fromClass = dc.from_class_or_interface_key;
    if (!fromClass) {
      console.warn(`Warning: data clump "${key}" has no from_class_or_interface_key, skipping.`);
      continue;
    }
    const info = nodeClusterInfo[fromClass];
    if (info) {
      result[key] = { cluster_id: info.cluster_id, cluster_type: info.cluster_type };
    } else {
      console.warn(`Warning: no cluster info found for class "${fromClass}" (data clump "${key}"), skipping.`);
    }
  }

  return result;
}

/**
 * Parses the cluster type priority order from a string like "1,2,3" or "single,two,large".
 * Returns an array of numeric cluster types in priority order.
 */
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

/**
 * Generates a priority list of data clumps from a report.
 *
 * The algorithm:
 * 1. Resolve cluster info for each data clump (pre-computed or via DFS).
 * 2. Filter data clumps by cluster type priority order.
 * 3. Iterate in priority order, adding unique cluster IDs (no duplicates).
 * 4. Within each cluster type group, sort by number of variables (descending).
 * 5. Limit results to the requested amount.
 */
export function generatePriorityList(report: DataClumpsTypeContext, clusterTypePriority: number[], amount: number): PriorityListItem[] {
  const data_clumps = report.data_clumps;
  if (!data_clumps) {
    console.log('No data clumps found in report.');
    return [];
  }

  const clusterInfo = getClusterInfoForDataClumps(data_clumps);
  const dataClumpKeys = Object.keys(data_clumps);

  // Build entries with cluster info attached
  type EnrichedEntry = {
    key: string;
    dc: any;
    cluster_id: number;
    cluster_type: number;
    variable_count: number;
  };

  const entries: EnrichedEntry[] = [];
  for (const key of dataClumpKeys) {
    const dc = data_clumps[key];
    const info = clusterInfo[key];
    if (!info) continue;

    const variableCount = dc.data_clump_data ? Object.keys(dc.data_clump_data).length : 0;
    entries.push({
      key,
      dc,
      cluster_id: info.cluster_id,
      cluster_type: info.cluster_type,
      variable_count: variableCount,
    });
  }

  // Sort entries: first by cluster type priority, then by variable count descending
  const priorityMap: Record<number, number> = {};
  clusterTypePriority.forEach((ct, idx) => {
    priorityMap[ct] = idx;
  });

  entries.sort((a, b) => {
    const aPriority = priorityMap[a.cluster_type] ?? 999;
    const bPriority = priorityMap[b.cluster_type] ?? 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.variable_count - a.variable_count;
  });

  // Build priority list with unique cluster IDs
  /**
   * Expands a [start, end] line range to include the given position.
   * Returns the updated [start, end] pair.
   */
  function expandLineRange(start: number | null, end: number | null, pos: { startLine?: number; endLine?: number } | null | undefined): [number | null, number | null] {
    if (!pos) return [start, end];
    const newStart = pos.startLine != null ? (start === null ? pos.startLine : Math.min(start, pos.startLine)) : start;
    const newEnd = pos.endLine != null ? (end === null ? pos.endLine : Math.max(end, pos.endLine)) : end;
    return [newStart, newEnd];
  }

  const seenClusterIds = new Set<number>();
  const priorityList: PriorityListItem[] = [];

  for (const entry of entries) {
    if (priorityList.length >= amount) break;
    if (seenClusterIds.has(entry.cluster_id)) continue;

    seenClusterIds.add(entry.cluster_id);

    const dc = entry.dc;
    const variableNames: string[] = [];
    let fromStartLine: number | null = null;
    let fromEndLine: number | null = null;
    let toStartLine: number | null = null;
    let toEndLine: number | null = null;

    if (dc.data_clump_data) {
      for (const varKey of Object.keys(dc.data_clump_data)) {
        const variable = dc.data_clump_data[varKey];
        variableNames.push(variable.name);
        [fromStartLine, fromEndLine] = expandLineRange(fromStartLine, fromEndLine, variable.position);
        [toStartLine, toEndLine] = expandLineRange(toStartLine, toEndLine, variable.to_variable?.position);
      }
    }

    priorityList.push({
      cluster_id: entry.cluster_id,
      cluster_type: entry.cluster_type,
      data_clump_id: entry.key,
      data_clump_type: dc.data_clump_type,
      from_class_or_interface_name: dc.from_class_or_interface_name,
      to_class_or_interface_name: dc.to_class_or_interface_name,
      from_method_name: dc.from_method_name || null,
      to_method_name: dc.to_method_name || null,
      amount_of_variables: variableNames.length,
      variable_names: variableNames,
      from_file_path: dc.from_file_path || '',
      to_file_path: dc.to_file_path || '',
      from_start_line: fromStartLine,
      from_end_line: fromEndLine,
      to_start_line: toStartLine,
      to_end_line: toEndLine,
    });
  }

  return priorityList;
}

program
  .description('Generate Priority List of Data Clumps\n\n' + 'Reads a data clumps report (JSON) and generates a prioritized list\n' + 'of data clumps with unique cluster IDs, ordered by cluster type priority.\n\n' + 'npx data-clumps-doctor-priority [options]')
  .version(version)
  .option('--report_path <path>', 'Path to the data clumps report JSON file')
  .option('--cluster_type_priority <priority>', 'Cluster type priority order, e.g. "1,2,3" or "single,two,large"', '1,2,3')
  .option('--amount <number>', 'Number of data clumps to include in the priority list', '1')
  .option('--output <path>', 'Output path for the priority list JSON file');

async function main() {
  program.parse(process.argv);
  const options = program.opts();

  const reportPath = options.report_path;
  if (!reportPath) {
    console.error('ERROR: --report_path is required.');
    process.exit(1);
  }

  if (!fs.existsSync(reportPath)) {
    console.error('ERROR: Report file does not exist: ' + reportPath);
    process.exit(1);
  }

  const reportContent = fs.readFileSync(reportPath, 'utf8');
  let report: DataClumpsTypeContext;
  try {
    report = JSON.parse(reportContent);
  } catch (e) {
    console.error('ERROR: Failed to parse JSON from report file: ' + reportPath);
    console.error(e);
    process.exit(1);
  }

  const clusterTypePriority = parseClusterTypePriority(options.cluster_type_priority);
  const amount = parseInt(options.amount, 10);

  console.log('Generating priority list...');
  console.log('  Report: ' + reportPath);
  console.log('  Cluster type priority: ' + JSON.stringify(clusterTypePriority));
  console.log('  Amount: ' + amount);

  const priorityList = generatePriorityList(report, clusterTypePriority, amount);

  console.log('Generated priority list with ' + priorityList.length + ' entries:');
  for (let i = 0; i < priorityList.length; i++) {
    const item = priorityList[i];
    console.log(`  ${i + 1}. [cluster_id=${item.cluster_id}, type=${item.cluster_type}] ` + `${item.data_clump_type}: ${item.from_class_or_interface_name} <-> ${item.to_class_or_interface_name} ` + `(${item.amount_of_variables} vars: ${item.variable_names.join(', ')})`);
  }

  const outputPath = options.output;
  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(priorityList, null, 2));
    console.log('Priority list written to: ' + outputPath);
  } else {
    // Output to stdout as JSON
    console.log(JSON.stringify(priorityList, null, 2));
  }
}

main();
