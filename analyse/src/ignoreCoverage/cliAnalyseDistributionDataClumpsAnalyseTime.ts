#!/usr/bin/env node

import fs from 'fs';
import { AnalyseHelper } from './AnalyseHelper';
import { Timer } from './Timer';

function analyseProjects(all_report_files_paths, ignore_without_data_clumps, output_filename?: string) {
  console.log('Counting data clumps cluster distribution ...');

  let data_clumps_analyse_time: {
    astGenerationTime: number[];
    detectionTime: number[];
  } = {
    astGenerationTime: [],
    detectionTime: [],
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

    let additional_data = report_file_json?.report_summary?.additional || {};
    let timer_information = additional_data?.timer_information || {};
    let ast_generation_time_ms = timer_information?.ast_generation_time_ms || 0;
    let detection_time_ms = timer_information?.detection_time_ms || 0;

    data_clumps_analyse_time.astGenerationTime.push(ast_generation_time_ms);
    data_clumps_analyse_time.detectionTime.push(detection_time_ms);
  }

  let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

  let x_labels: string[] = [];

  fileContent += AnalyseHelper.getPythonValuesFor('ast_generation_time_ms', data_clumps_analyse_time.astGenerationTime);
  x_labels.push('AST\nGeneration');

  fileContent += AnalyseHelper.getPythonValuesFor('detection_time_ms', data_clumps_analyse_time.detectionTime);
  x_labels.push('Detection');

  fileContent += 'all_data = {}\n';
  fileContent += "all_data['AST Generation'] = ast_generation_time_ms\n";
  fileContent += "all_data['Detection'] = detection_time_ms\n";
  fileContent += '\n';
  fileContent += `labels, data = all_data.keys(), all_data.values()`;
  fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
  fileContent += AnalyseHelper.getPythonPlot({
    output_filename_without_extension: output_filename,
    offset_left: 0.15,
    offset_right: 0.95,
    offset_bottom: 0.23,
    offset_top: 0.98,
    width_inches: 6,
    height_inches: 2,
    y_label: 'Time (ms)',
    x_labels: x_labels,
    w_bar_width: 0.6,
    horizontal: true,
    log_scale: true,
    log_ticks: [1, 10, 100, 1000, 10000, 100000, 1000000],
    y_lines: [100, 1000, 10000],
  });

  return fileContent;
}

async function analyse(report_folder, options, defaultFilenameWithoutExtension) {
  console.log('Start Analysing Detected Data-Clumps-Clusters');
  if (!fs.existsSync(report_folder)) {
    console.log('ERROR: Specified path to report folder does not exist: ' + report_folder);
    process.exit(1);
  }

  let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
  console.log('all_report_files_paths: ' + all_report_files_paths.length);

  //printHistogram(sorted_timestamps, timestamp_to_file_paths);
  const ignore_without_data_clumps = true;
  let filecontent = analyseProjects(all_report_files_paths, ignore_without_data_clumps, defaultFilenameWithoutExtension);
  return filecontent;
}

async function main() {
  console.log('Start Data-Clumps-Doctor Detection');

  let defaultFilenameWithoutExtension = 'AnalyseDistributionDataClumpsAnalyseTime';
  // Get the options and arguments
  const options = AnalyseHelper.getCommandForAnalysis(process, {
    description: 'Generate Data Clumps Types Distribution For Boxplots',
    require_report_path: true,
    require_output_path: true,
    default_output_filename_without_extension: defaultFilenameWithoutExtension,
  });

  const report_folder = options.report_folder;
  let filecontent = await analyse(report_folder, options, defaultFilenameWithoutExtension);

  let output = options.output;
  // delete output file if it exists
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
  }

  console.log('Writing output to file: ' + output);
  fs.writeFileSync(output, filecontent);
}

main();
