#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext,
    DataClumpTypeContext,
    Dictionary
} from "data-clumps-type-context";
import {Timer} from "./Timer";
import { AnalyseHelper } from './AnalyseHelper';

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;


const program = new Command();

const current_working_directory = process.cwd();

program
    .description('Analyse Detected Data-Clumps\n\n' +
        'This script performs data clumps detection in a given directory.\n\n' +
        'npx data-clumps-doctor [options] <path_to_folder>')
    .version(version)
    .option('--report_folder <path>', 'Output path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
    .option('--output <path>', 'Output path for script', current_working_directory+'/DistributionDataClumpFileDistance.py') // Default value is './data-clumps.json'

function getAllReportFilesRecursiveInFolder(folder_path){
    let all_report_files = fs.readdirSync(folder_path);
    let all_report_files_paths: any = [];
    for (let i = 0; i < all_report_files.length; i++) {
        let report_file = all_report_files[i];
        let report_file_path = path.join(folder_path, report_file);
        if(fs.lstatSync(report_file_path).isDirectory()){
            let all_report_files_paths_in_subfolder = getAllReportFilesRecursiveInFolder(report_file_path);
            all_report_files_paths = all_report_files_paths.concat(all_report_files_paths_in_subfolder);
        }
        else{
            if(report_file.endsWith(".json")){
                let report_file_path = path.join(folder_path, report_file);
                all_report_files_paths.push(report_file_path);
            }
        }
    }
    return all_report_files_paths;

}

function getFilePathDistance(file_path_a: string, file_path_b: string){
    // distance = 0 // same file
    // distance = 1 // same folder
    // distance = 2 // same parent folder
    // distance = 3 // ...
    // file_path_a = "/username/Documents/Projects/project_a/src/file_a.ts"
    // file_path_b = "/username/Documents/Projects/project_b/src/subfolder/subsubfolder/file_b.ts"
    // same path = distance 0
    // same folder = distance 1
    // otherwise: every folder up is +1 until same path, every folder down is +1 until destination

    if(file_path_a === file_path_b){
        return 0;
    }

    let amount_common_folder_from_start = 0;
    let a_path_parts = file_path_a.split(path.sep);
    let b_path_parts = file_path_b.split(path.sep);
    let shortest_path_length = Math.min(a_path_parts.length, b_path_parts.length);
    for(let i = 0; i < shortest_path_length; i++){
        if(a_path_parts[i] === b_path_parts[i]){
            amount_common_folder_from_start++;
        } else {
            break;
        }
    }
    let amount_folders_a = a_path_parts.length - amount_common_folder_from_start;
    let amount_folders_b = b_path_parts.length - amount_common_folder_from_start;
    return amount_folders_a + amount_folders_b;
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "import textwrap\n" +
        "from numpy import nan\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "matplotlib.rcParams.update({'font.size': 18})\n" +
        "NaN = nan\n" +
        "";

    let data_clump_type_specific_distances: Dictionary<number[]> = {};
    let all_data_clump_distances: number[] = [];

    let timer = new Timer()
    timer.start();
    let lastElapsedTime = 0;

    let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

    for(let i = 0; i < total_amount_of_report_files; i++){
        let progress_files = i+1;
        let report_file_path = all_report_files_paths[i];
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;

            let elaspedTime = timer.getElapsedTime();
            if(elaspedTime > lastElapsedTime + 1000){
                AnalyseHelper.printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                timer.printElapsedTime()
                timer.printEstimatedTimeRemaining(progress_files, total_amount_of_report_files)
                lastElapsedTime = elaspedTime
            }

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true;

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data
                let data_clump_type = data_clump.data_clump_type; // 'parameters_to_parameters_data_clump' or 'fields_to_fields_data_clump' or "parameters_to_fields_data_clump"

                let path_from = data_clump.from_file_path
                let path_to = data_clump.to_file_path
                let distance = getFilePathDistance(path_from, path_to);
                all_data_clump_distances.push(distance);
                if(data_clump_type_specific_distances[data_clump_type] === undefined){
                    data_clump_type_specific_distances[data_clump_type] = [];
                }
                data_clump_type_specific_distances[data_clump_type].push(distance);
            }
        }

    }

    function calculateAndPrintDistanceStatistic(data_clump_type: string, data_clump_type_distances: number[]){
        let total_amount_data_clumps = data_clump_type_distances.length;
        let total_sum_data_clumps_distance = 0;
        let total_data_clumps_average_distance = 0;
        let total_data_clumps_max_distance = 0;
        let total_data_clumps_min_distance = 0;
        let total_data_clumps_median_distance = 0;
        let sorted_data_clump_type_distances = data_clump_type_distances.sort((a, b) => a - b);
        let total_data_clumps_median_index = Math.floor(total_amount_data_clumps / 2);
        total_data_clumps_median_distance = sorted_data_clump_type_distances[total_data_clumps_median_index];
        for(let i = 0; i < total_amount_data_clumps; i++){
            let distance = data_clump_type_distances[i];
            total_sum_data_clumps_distance += distance;
            if(distance > total_data_clumps_max_distance){
                total_data_clumps_max_distance = distance;
            }
            if(distance < total_data_clumps_min_distance){
                total_data_clumps_min_distance = distance;
            }
        }
        console.log(data_clump_type+" - SUMMARY");
        console.log("Total amount of data clumps: "+total_amount_data_clumps);
        console.log("Total sum of data clumps distance: "+total_sum_data_clumps_distance);
        total_data_clumps_average_distance = total_sum_data_clumps_distance / total_amount_data_clumps;
        console.log("Total average data clumps distance: "+total_data_clumps_average_distance);
        console.log("Total max data clumps distance: "+total_data_clumps_max_distance);
        console.log("Total min data clumps distance: "+total_data_clumps_min_distance);
        console.log("Total median data clumps distance: "+total_data_clumps_median_distance);
        console.log("-------------")
    }

    console.log("Start analysing distances");
    calculateAndPrintDistanceStatistic("All Data Clumps", all_data_clump_distances);
    fileContent += AnalyseHelper.getValuesFor("all_data_clumps_distances", all_data_clump_distances);



    let data_clump_types = Object.keys(data_clump_type_specific_distances);
    for(let i = 0; i < data_clump_types.length; i++){
        let data_clump_type = data_clump_types[i];
        let data_clump_type_distances = data_clump_type_specific_distances[data_clump_type];
        calculateAndPrintDistanceStatistic(data_clump_type, data_clump_type_distances);
        fileContent += AnalyseHelper.getValuesFor(data_clump_type+"_data_clumps_distances", data_clump_type_distances);
    }

    fileContent += "all_data = {}\n";
    fileContent += "all_data['all_data_clumps'] = all_data_clumps_distances\n";
    for (let i = 0; i < data_clump_types.length; i++) {
        let data_clump_type = data_clump_types[i];
        fileContent += "all_data['" + data_clump_type + "'] = " + data_clump_type + "_data_clumps_distances\n";
    }
    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += "\n";
    fileContent += "fig, ax1 = plt.subplots()\n";
    fileContent += "plt.boxplot(data)\n";
    fileContent += "ax1.set(ylabel='File Path Distance')\n";
    // Replace underscores with spaces in labels
    fileContent += "wrapped_labels = ['\\n'.join(textwrap.wrap(label.replace('_', ' '), width=15)) for label in labels]\n";
    fileContent += "plt.xticks(range(1, len(labels) + 1), wrapped_labels)\n";
    fileContent += "plt.subplots_adjust(left=0.15, right=0.95, top=0.98, bottom=0.20)\n"; // Adjust bottom for better label display
    fileContent += "fig.set_size_inches(6, 4, forward=True)\n";
    fileContent += "fig.set_dpi(200)\n";
    fileContent += "plt.show()\n";

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;

    let fileContent = await analyse(report_folder, options);
    let output = options.output;
    // delete output file if it exists
    if (fs.existsSync(output)) {
        fs.unlinkSync(output);
    }

    console.log("Writing output to file: "+output)
    fs.writeFileSync(output, fileContent);
}

main();

