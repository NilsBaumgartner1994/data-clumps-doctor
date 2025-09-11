#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { Command } from 'commander';
import { DataClumpsTypeContext } from 'data-clumps-type-context';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

const current_working_directory = process.cwd();

program
  .description('Analyse Detected Data-Clumps Priority\n\n' + 'This script performs data clumps prioritization.\n\n' + 'npx data-clumps-doctor [options] <path_to_folder>')
  .version(version)
  .option('--report_folder <path>', 'Report folder path', undefined) // Default value is './data-clumps.json'
  .option('--output_folder <path>', 'Output path', undefined); // Default value is './data-clumps.json'

function time_stamp_to_file_paths(report_folder: string) {
  let all_report_files = fs.readdirSync(report_folder);
  console.log('Amount of files in folder: ' + all_report_files.length);
  let all_report_files_paths: any = [];
  for (let i = 0; i < all_report_files.length; i++) {
    let report_file = all_report_files[i];
    if (report_file.endsWith('.json')) {
      let report_file_path = path.join(report_folder, report_file);
      all_report_files_paths.push(report_file_path);
    }
  }
  console.log('Amount of report files: ' + all_report_files_paths.length);

  console.log('Reading all report files and extracting data clumps amount per commit date');
  let timestamp_to_file_path = {};
  let time_start = new Date();
  for (let i = 0; i < all_report_files_paths.length; i++) {
    let report_file_path = all_report_files_paths[i];
    let report_file = fs.readFileSync(report_file_path, 'utf8');
    let now = new Date();
    let time_diff = now.getTime() - time_start.getTime();
    let time_per_file = time_diff / (i + 1);
    let time_left = time_per_file * (all_report_files_paths.length - (i + 1));
    let time_running = time_diff;
    let time_left_hh_mm_ss = new Date(time_left).toISOString().substr(11, 8);
    let time_running_hh_mm_ss = new Date(time_running).toISOString().substr(11, 8);
    let file_name_with_extension = path.basename(report_file_path);
    console.log('parsing ' + (i + 1) + '/' + all_report_files_paths.length + ' files | time estimated left: ' + time_left_hh_mm_ss + ' | time running: ' + time_running_hh_mm_ss + ' | file: ' + file_name_with_extension);
    let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);
    let project_commit_date = parseInt(report_file_json?.project_info?.project_commit_date || ''); // unix timestamp
    if (timestamp_to_file_path[project_commit_date] === undefined) {
      timestamp_to_file_path[project_commit_date] = [report_file_path];
    } else {
      timestamp_to_file_path[project_commit_date].push(report_file_path);
    }
  }

  console.log('Amount of timestamps: ' + Object.keys(timestamp_to_file_path).length);

  return timestamp_to_file_path;
}

function getSortedTimestamps(timestamp_to_file_path) {
  let sorted_timestamps = Object.keys(timestamp_to_file_path);
  return sorted_timestamps;
}

async function analyse(report_folder, options) {
  console.log('Analysing Detected Data-Clumps');
  if (!fs.existsSync(report_folder)) {
    console.log('ERROR: Specified path to report folder does not exist: ' + report_folder);
    process.exit(1);
  }

  let output_folder = options.output_folder;

  // projects get list of file names without .DS_Store
  let projects = fs.readdirSync(report_folder).filter(file => file !== '.DS_Store');
  for (let project of projects) {
    let projectFolder = path.join(report_folder, project, 'tags');

    let timestamp_to_file_paths = time_stamp_to_file_paths(projectFolder);
    let sorted_timestamps = getSortedTimestamps(timestamp_to_file_paths);
    console.log('sorted_timestamps: ' + sorted_timestamps.length);

    // get latest timestamp
    let latest_report_timestamp = sorted_timestamps[sorted_timestamps.length - 1];
    if (latest_report_timestamp === undefined) {
      console.log('ERROR: No latest timestamp found');
      process.exit(1);
    }
    console.log('latest_report_timestamp: ' + latest_report_timestamp);
    const latest_report_timestamp_as_date = new Date(parseInt(latest_report_timestamp) * 1000);
    console.log('latest_report_timestamp_as_date: ' + latest_report_timestamp_as_date);

    console.log('Analyzing latest report');
    let latest_report_file_path = timestamp_to_file_paths[latest_report_timestamp];
    console.log('latest_report_file_path: ' + latest_report_file_path);
    let latest_report_file = fs.readFileSync(latest_report_file_path[0], 'utf8');
    let latest_report_file_json: DataClumpsTypeContext = JSON.parse(latest_report_file);

    let output_folder_project = output_folder ? path.join(output_folder, project + '.json') : undefined;
    await analysePriorityOfDataClumps(latest_report_file_json, output_folder_project);
  }
}

async function analysePriorityOfDataClumps(latest_report_file_json: DataClumpsTypeContext, outputFile?: string) {
  // okay we will simply check for 2 code smells in order to prioritize the data clumps
  // 1. Long Parameter List
  // 2. Long Variable/Parameter Names

  type PriorityListItem = {
    data_clump_key: string;
    data_clump_type: string;
    amount_of_parameters: number;
    parameter_names: string[];
    parameter_name_length: number;
  };

  let data_clumps_priority_list: PriorityListItem[] = [];
  let data_clumps = latest_report_file_json.data_clumps;
  let data_clumps_keys = Object.keys(data_clumps);
  let i = 0;
  let total = data_clumps_keys.length;
  for (let data_clump_key of data_clumps_keys) {
    i++;
    console.log('Analyzing data clump: ' + i + '/' + total);
    //console.log("Analyzing data clump with key: "+data_clump_key);
    let data_clump = data_clumps[data_clump_key];
    let data_clump_type = data_clump.data_clump_type; // either "parameters_to_parameters_data_clump" or "parameters_to_fields_data_clump" or "fields_to_fields_data_clump"

    let canBeAnalyzed = false;
    switch (data_clump_type) {
      case 'parameters_to_parameters_data_clump':
        canBeAnalyzed = true;
        break;
      case 'parameters_to_fields_data_clump':
        canBeAnalyzed = true;
        break;
      case 'fields_to_fields_data_clump':
        canBeAnalyzed = false;
        break;
    }

    if (!canBeAnalyzed) {
      continue;
    }

    let data = data_clump.data_clump_data;
    let parameter_name_length = 0;
    let parameter_names: string[] = [];

    let variable_keys = Object.keys(data);
    for (let variable_key of variable_keys) {
      let variable_from_context = data[variable_key];
      let variable_name = variable_from_context.name;
      parameter_names.push(variable_name);
      parameter_name_length += variable_name.length;
    }

    let amount_of_parameters = parameter_names.length;

    let priority_list_item: PriorityListItem = {
      data_clump_key: data_clump_key,
      data_clump_type: data_clump_type,
      amount_of_parameters: amount_of_parameters,
      parameter_names: parameter_names,
      parameter_name_length: parameter_name_length,
    };

    data_clumps_priority_list.push(priority_list_item);
  }

  if (!!outputFile) {
    let output_data_clumps_list = outputFile;
    console.log('Writing list to file: ' + output_data_clumps_list);
    const output_folder = path.dirname(output_data_clumps_list);
    console.log('Check if output folder exists: ' + output_folder);
    if (!fs.existsSync(output_folder)) {
      console.log('Creating output folder: ' + output_folder);
      fs.mkdirSync(output_folder, { recursive: true });
    }

    // check if file exists, if so delete it
    if (fs.existsSync(output_data_clumps_list)) {
      console.log('Deleting existing file: ' + output_data_clumps_list);
      fs.unlinkSync(output_data_clumps_list);
    }

    console.log('Writing list to file: ' + output_data_clumps_list);
    console.log('Amount of data clumps: ' + data_clumps_priority_list.length);
    fs.writeFileSync(output_data_clumps_list, JSON.stringify(data_clumps_priority_list, null, 2));
  } else {
    console.log('No output folder specified, wont save to file');
  }

  // sort the list by amount of parameters, if same amount of parameters then sort by parameter name length
  // the more parameters the higher the priority and should be first in the list
  // if same amount of parameters then the longer the parameter names the higher the priority
  data_clumps_priority_list.sort((a, b) => {
    // "parameters_to_fields_data_clump" is most important therefore should be first
    if (a.data_clump_type === 'parameters_to_fields_data_clump' && b.data_clump_type !== 'parameters_to_fields_data_clump') {
      return -1;
    }
    if (a.data_clump_type !== 'parameters_to_fields_data_clump' && b.data_clump_type === 'parameters_to_fields_data_clump') {
      return 1;
    }
    // other types can only be parameters_to_parameters_data_clump as fields_to_fields_data_clump is not analyzed

    if (a.amount_of_parameters > b.amount_of_parameters) {
      return -1;
    }
    if (a.amount_of_parameters < b.amount_of_parameters) {
      return 1;
    }
    if (a.parameter_name_length > b.parameter_name_length) {
      return -1;
    }
    if (a.parameter_name_length < b.parameter_name_length) {
      return 1;
    }
    return 0;
  });

  console.log('Data Clumps Priority List: top 10');
  let top_10_data_clumps = data_clumps_priority_list.slice(0, 10);
  for (let i = 0; i < top_10_data_clumps.length; i++) {
    let data_clump = top_10_data_clumps[i];
    console.log('Data Clump Key: ' + data_clump.data_clump_key);
    console.log('Data Clump Type: ' + data_clump.data_clump_type);
    console.log('Amount of Parameters: ' + data_clump.amount_of_parameters);
    let first_10_parameter_names = data_clump.parameter_names.slice(0, 10);
    let tailoring = data_clump.parameter_names.length > 10 ? ' ...' : '';
    console.log('Parameter Names: ' + first_10_parameter_names.join(', ') + tailoring);
    console.log('Parameter Name Length: ' + data_clump.parameter_name_length);
    console.log('-------------------------------------------------');
  }
}

async function main() {
  console.log('Data-Clumps-Doctor Detection');

  program.parse(process.argv);

  // Get the options and arguments
  const options = program.opts();

  const report_folder = options.report_folder;
  await analyse(report_folder, options);
}

main();
