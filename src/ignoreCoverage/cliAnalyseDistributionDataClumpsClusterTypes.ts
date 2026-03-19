#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { AnalyseHelper } from './AnalyseHelper';
import { Timer } from './Timer';
import { buildClusterInfoFromDataClumps } from './ClusterHelper';

function getAllReportFilesRecursiveInFolder(folder_path) {
  let all_report_files = fs.readdirSync(folder_path);
  let all_report_files_paths: any = [];
  for (let i = 0; i < all_report_files.length; i++) {
    let report_file = all_report_files[i];
    let report_file_path = path.join(folder_path, report_file);
    if (fs.lstatSync(report_file_path).isDirectory()) {
      let all_report_files_paths_in_subfolder = getAllReportFilesRecursiveInFolder(report_file_path);
      all_report_files_paths = all_report_files_paths.concat(all_report_files_paths_in_subfolder);
    } else {
      if (report_file.endsWith('.json')) {
        let report_file_path = path.join(folder_path, report_file);
        all_report_files_paths.push(report_file_path);
      }
    }
  }
  return all_report_files_paths;
}

function countDataClumpsGroups(data_clumps_dict) {
  let data_clumps_keys = Object.keys(data_clumps_dict);

  // Use pre-computed cluster info from the report when available (set by the Detector)
  const clusterTypes: Record<number, number> = {};
  let hasPrecomputedClusterInfo = false;

  for (const key of data_clumps_keys) {
    const data_clump = data_clumps_dict[key];
    const additional = data_clump.data_clump_type_additional;
    if (additional && additional.cluster_id !== undefined && additional.cluster_type !== undefined) {
      clusterTypes[additional.cluster_id] = additional.cluster_type;
      hasPrecomputedClusterInfo = true;
    }
  }

  if (hasPrecomputedClusterInfo) {
    let singleNodeGroups = 0;
    let twoNodeGroups = 0;
    let largerGroups = 0;
    for (const cluster_type of Object.values(clusterTypes)) {
      if (cluster_type === 1) singleNodeGroups++;
      else if (cluster_type === 2) twoNodeGroups++;
      else largerGroups++;
    }
    return { singleNodeGroups, twoNodeGroups, largerGroups };
  }

  // Fallback for older reports that do not yet contain pre-computed cluster info:
  // use the shared ClusterHelper to rebuild clusters from the data clumps.
  const nodeClusterInfo = buildClusterInfoFromDataClumps(data_clumps_dict);
  const clusterTypesFromDfs: Record<number, number> = {};
  for (const info of Object.values(nodeClusterInfo)) {
    clusterTypesFromDfs[info.cluster_id] = info.cluster_type;
  }

  let singleNodeGroups = 0;
  let twoNodeGroups = 0;
  let largerGroups = 0;

  for (const cluster_type of Object.values(clusterTypesFromDfs)) {
    if (cluster_type === 1) singleNodeGroups++;
    else if (cluster_type === 2) twoNodeGroups++;
    else largerGroups++;
  }

  return {
    singleNodeGroups: singleNodeGroups,
    twoNodeGroups: twoNodeGroups,
    largerGroups: largerGroups,
  };
}

function getMedian(listOfValues) {
  // Sort the list of values
  let sortedValues = [...listOfValues].sort((a, b) => a - b);

  let amountSingleGroups = listOfValues.length;

  // Calculate the median
  let median;
  if (amountSingleGroups % 2 === 0) {
    // If even, average the two middle values
    median = (sortedValues[amountSingleGroups / 2 - 1] + sortedValues[amountSingleGroups / 2]) / 2;
  } else {
    // If odd, take the middle value
    median = sortedValues[Math.floor(amountSingleGroups / 2)];
  }
  return median;
}

/**
 * Analyzes the distribution of data clumps across multiple report files and generates a Python script for visualizing the results.
 *
 * This function reads a list of report file paths, processes each file to extract data clump information,
 * calculates the percentage distribution of different types of data clumps, and generates a Python script
 * that creates a boxplot of these distributions.
 *
 * @param {string[]} all_report_files_paths - An array of file paths to the report files to be processed.
 * @returns {string} The content of a Python script that visualizes the data clump distributions.
 *
 * @throws {Error} Throws an error if a report file cannot be read or if the JSON parsing fails.
 */
function printDataClumpsClusterDistribution(all_report_files_paths, output_filename?: string) {
  console.log('Counting data clumps cluster distribution ...');

  let data_clumps_cluster_distribution: any = {
    singleNodeGroups: [],
    twoNodeGroups: [],
    largerGroups: [],
  };

  let timer = new Timer();
  timer.start();
  for (let i = 0; i < all_report_files_paths.length; i++) {
    timer.printEstimatedTimeRemaining({
      progress: i,
      total: all_report_files_paths.length,
    });
    let report_file_path = all_report_files_paths[i];
    let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);

    let data_clumps_dict = report_file_json?.data_clumps;
    let groups = countDataClumpsGroups(data_clumps_dict);

    let singleNodeGroups = groups.singleNodeGroups;

    let twoNodeGroups = groups.twoNodeGroups;

    let largerGroups = groups.largerGroups;

    let amountGroups = singleNodeGroups + twoNodeGroups + largerGroups;
    if (amountGroups > 0) {
      let singleNodeGroupsPercentage = (singleNodeGroups / amountGroups) * 100;
      singleNodeGroupsPercentage = parseFloat(singleNodeGroupsPercentage.toFixed(2));

      let twoNodeGroupsPercentage = (twoNodeGroups / amountGroups) * 100;
      twoNodeGroupsPercentage = parseFloat(twoNodeGroupsPercentage.toFixed(2));

      let largerGroupsPercentage = (largerGroups / amountGroups) * 100;
      largerGroupsPercentage = parseFloat(largerGroupsPercentage.toFixed(2));

      data_clumps_cluster_distribution.singleNodeGroups.push(singleNodeGroupsPercentage);
      data_clumps_cluster_distribution.twoNodeGroups.push(twoNodeGroupsPercentage);
      data_clumps_cluster_distribution.largerGroups.push(largerGroupsPercentage);
    }
  }

  console.log('Generating python file to generate boxplot ...');

  let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

  fileContent += AnalyseHelper.getPythonValuesFor('singleNodeGroups', data_clumps_cluster_distribution.singleNodeGroups);
  fileContent += AnalyseHelper.getPythonValuesFor('twoNodeGroups', data_clumps_cluster_distribution.twoNodeGroups);
  fileContent += AnalyseHelper.getPythonValuesFor('largerGroups', data_clumps_cluster_distribution.largerGroups);

  fileContent += 'all_data = {}\n';
  fileContent += "all_data['Type 1'] = singleNodeGroups\n";
  fileContent += "all_data['Type 2'] = twoNodeGroups\n";
  fileContent += "all_data['Type 3'] = largerGroups\n";
  fileContent += '\n';
  fileContent += 'labels, data = all_data.keys(), all_data.values()\n';
  fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
  fileContent += AnalyseHelper.getPythonPlot({
    output_filename_without_extension: output_filename,
    offset_left: 0.15,
    offset_right: 0.95,
    offset_bottom: 0.1,
    offset_top: 0.98,
    width_inches: 6,
    height_inches: 4,
    y_label: 'Percentage of Data Clumps',
  });

  return fileContent;
}

async function analyse(report_folder, options) {
  console.log('Analysing Detected Data-Clumps-Clusters');
  if (!fs.existsSync(report_folder)) {
    console.log('ERROR: Specified path to report folder does not exist: ' + report_folder);
    process.exit(1);
  }

  let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
  console.log('all_report_files_paths: ' + all_report_files_paths.length);

  let filecontent = printDataClumpsClusterDistribution(all_report_files_paths, options.output_filename_without_extension);
  return filecontent;
}

async function main() {
  console.log('Data-Clumps-Doctor Detection');

  let defaultFilenameWithoutExtension = 'AnalyseDistributionDataClumpsClusterTypes';

  let options = AnalyseHelper.getCommandForAnalysis(process, {
    require_report_path: true,
    require_output_path: true,
    default_output_filename_without_extension: defaultFilenameWithoutExtension,
  });

  const report_folder = options.report_folder;
  let filecontent = await analyse(report_folder, options);

  let output = options.output;
  // delete output file if it exists
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
  }

  console.log('Writing output to file: ' + output);
  fs.writeFileSync(output, filecontent);
}

main();
