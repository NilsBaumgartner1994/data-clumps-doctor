#!/usr/bin/env node

import fs from 'fs';
import { DataClumpsTypeContext } from 'data-clumps-type-context';
import { AnalyseHelper } from './AnalyseHelper';
import { Timer } from './Timer';

function analyseProjects(all_report_files_paths, ignore_without_data_clumps, output_filename?: string) {
  console.log('Counting data clumps cluster distribution ...');

  let data_clumps_type_distribution: any = {
    parameters_to_parameters_data_clump: [],
    parameters_to_fields_data_clump: [],
    fields_to_fields_data_clump: [],
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

    let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps || 0;

    if (amount_data_clumps == 0 && ignore_without_data_clumps) {
      continue;
    }

    let amount_parameters_to_parameters_data_clump = report_file_json?.report_summary?.parameters_to_parameters_data_clump || 0;
    let amount_parameters_to_fields_data_clump = report_file_json?.report_summary?.parameters_to_fields_data_clump || 0;
    let amount_fields_to_fields_data_clump = report_file_json?.report_summary?.fields_to_fields_data_clump || 0;

    function calculatePercentage(amount, total) {
      let percentage = 0;
      if (total > 0) {
        percentage = (amount / total) * 100;
        percentage = parseFloat(percentage.toFixed(2));
      }
      return percentage;
    }

    let percentage_parameters_to_parameters_data_clump = calculatePercentage(amount_parameters_to_parameters_data_clump, amount_data_clumps);
    let percentage_parameters_to_fields_data_clump = calculatePercentage(amount_parameters_to_fields_data_clump, amount_data_clumps);
    let percentage_fields_to_fields_data_clump = calculatePercentage(amount_fields_to_fields_data_clump, amount_data_clumps);

    data_clumps_type_distribution.fields_to_fields_data_clump.push(percentage_fields_to_fields_data_clump);
    data_clumps_type_distribution.parameters_to_fields_data_clump.push(percentage_parameters_to_fields_data_clump);
    data_clumps_type_distribution.parameters_to_parameters_data_clump.push(percentage_parameters_to_parameters_data_clump);
  }

  let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

  fileContent += AnalyseHelper.getPythonValuesFor('fields_to_fields_data_clump', data_clumps_type_distribution.fields_to_fields_data_clump);
  fileContent += AnalyseHelper.getPythonValuesFor('parameters_to_fields_data_clump', data_clumps_type_distribution.parameters_to_fields_data_clump);
  fileContent += AnalyseHelper.getPythonValuesFor('parameters_to_parameters_data_clump', data_clumps_type_distribution.parameters_to_parameters_data_clump);

  fileContent += 'all_data = {}\n';
  fileContent += "all_data['Parameter-\\nParameter'] = parameters_to_parameters_data_clump\n";
  fileContent += "all_data['Field-\\nField'] = fields_to_fields_data_clump\n";
  fileContent += "all_data['Parameter-\\nField'] = parameters_to_fields_data_clump\n";
  fileContent += '\n';
  fileContent += `labels, data = all_data.keys(), all_data.values()`;
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

  let defaultFilenameWithoutExtension = 'AnalyseDistributionDataClumpsTypes';
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
