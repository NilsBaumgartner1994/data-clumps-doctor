#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {DataClumpsTypeContext} from "data-clumps-type-context";

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;


const program = new Command();

const current_working_directory = process.cwd();

program
    .description('Start Analyse Detected Data-Clumps\n\n' +
        'This script performs data clumps detection in a given directory.\n\n' +
        'npx data-clumps-doctor [options] <path_to_folder>')
    .version(version)
    .option('--report_folder <path>', 'Report path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
    .option('--ignore_without_data_clumps <bool>', 'Ignore files without data clumps', 'true') // Default value is 'true'
    .option('--output <path>', 'Output path for script', current_working_directory+'/DataClumpsTypesDistribution.py') /**
 * Retrieves all report files recursively in the specified folder.
 * 
 * @param {string} folder_path - The path of the folder to search for report files.
 * @returns {string[]} - An array of paths to all the report files found.
 * @throws {Error} - Throws an error if there is an issue with reading the directory or file stats.
 */
// Default value is './data-clumps.json'

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

/**
 * Calculate the median of a list of values
 * @param {number[]} listOfValues - The list of values for which to calculate the median
 * @returns {number} - The median value of the list
 * @throws {Error} - If the input list is empty
 */
function getMedian(listOfValues){
    // Sort the list of values
    let sortedValues = [...listOfValues].sort((a, b) => a - b);

    let amountSingleGroups = listOfValues.length

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
 * Retrieves values for a given variable and list of values.
 * @param nameOfVariable - The name of the variable.
 * @param listOfValues - The list of values for the variable.
 * @returns The content generated based on the variable and its values.
 * @throws Error if the list of values is empty.
 */
function getValuesFor(nameOfVariable, listOfValues){
    let fileContent = "";
    let median = getMedian(listOfValues);
    console.log("Median value for "+nameOfVariable+": "+median)
    fileContent += "\n";
    fileContent += "# "+nameOfVariable+"_median = "+median+"\n";
    fileContent += nameOfVariable+"= [\n";
    let amountSingleGroups = listOfValues.length
    for(let i = 0; i < amountSingleGroups; i++){
        fileContent += "  "+listOfValues[i];
        if(i < amountSingleGroups - 1){
            fileContent += ",\n";
        }
    }
    fileContent += "\n";
    fileContent += "]\n";
    fileContent += "\n";

    return fileContent;
}

/**
 * Counts the data clumps cluster distribution based on the provided report files paths and options to ignore without data clumps.
 * @param all_report_files_paths - Array of paths to the report files
 * @param ignore_without_data_clumps - Boolean flag to ignore files without data clumps
 * @throws - Throws an error if there is an issue processing the report files
 */
function printDataClumpsClusterDistribution(all_report_files_paths, ignore_without_data_clumps){



    console.log("Counting data clumps cluster distribution ...")

    let data_clumps_type_distribution: any = {
        parameters_to_parameters_data_clump: [],
        parameters_to_fields_data_clump: [],
        fields_to_fields_data_clump: []
    };

    for(let i = 0; i < all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        console.log("Processing report_file_path: "+i+" with "+all_report_files_paths.length+" report files")

        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

        let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps || 0;


        if(amount_data_clumps==0 && ignore_without_data_clumps){
            continue;
        }

        let amount_parameters_to_parameters_data_clump = report_file_json?.report_summary?.parameters_to_parameters_data_clump || 0;
        let amount_parameters_to_fields_data_clump = report_file_json?.report_summary?.parameters_to_fields_data_clump || 0;
        let amount_fields_to_fields_data_clump = report_file_json?.report_summary?.fields_to_fields_data_clump || 0;

        let percentage_parameters_to_parameters_data_clump = 0
        if(amount_data_clumps > 0){
            percentage_parameters_to_parameters_data_clump = (amount_parameters_to_parameters_data_clump / amount_data_clumps) * 100;
            percentage_parameters_to_parameters_data_clump = parseFloat(percentage_parameters_to_parameters_data_clump.toFixed(2))
        }

        let percentage_parameters_to_fields_data_clump = 0
        if(amount_data_clumps > 0){
            percentage_parameters_to_fields_data_clump = (amount_parameters_to_fields_data_clump / amount_data_clumps) * 100;
            percentage_parameters_to_fields_data_clump = parseFloat(percentage_parameters_to_fields_data_clump.toFixed(2))
        }

        let percentage_fields_to_fields_data_clump = 0
        if(amount_data_clumps > 0){
            percentage_fields_to_fields_data_clump = (amount_fields_to_fields_data_clump / amount_data_clumps) * 100;
            percentage_fields_to_fields_data_clump = parseFloat(percentage_fields_to_fields_data_clump.toFixed(2))
        }

        data_clumps_type_distribution.fields_to_fields_data_clump.push(percentage_fields_to_fields_data_clump);
        data_clumps_type_distribution.parameters_to_fields_data_clump.push(percentage_parameters_to_fields_data_clump);
        data_clumps_type_distribution.parameters_to_parameters_data_clump.push(percentage_parameters_to_parameters_data_clump);
    }

    console.log("Generating python file to generate boxplot ...")

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "matplotlib.rcParams.update({'font.size': 18})\n" +
        "\n" +
        "";

    fileContent += getValuesFor("fields_to_fields_data_clump", data_clumps_type_distribution.fields_to_fields_data_clump);
    fileContent += getValuesFor("parameters_to_fields_data_clump", data_clumps_type_distribution.parameters_to_fields_data_clump);
    fileContent += getValuesFor("parameters_to_parameters_data_clump", data_clumps_type_distribution.parameters_to_parameters_data_clump);

    fileContent += "all_data = {}\n"
    fileContent += "all_data['Parameter-\\nParameter'] = parameters_to_parameters_data_clump\n"
    fileContent += "all_data['Field-\\nField'] = fields_to_fields_data_clump\n"
    fileContent += "all_data['Parameter-\\nField'] = parameters_to_fields_data_clump\n"
    fileContent += "\n"
    fileContent += "labels, data = all_data.keys(), all_data.values()\n"
    fileContent += "\n"
    fileContent += "fig, ax1 = plt.subplots()\n"
    fileContent += "plt.boxplot(data)\n"
    fileContent += "ax1.set(ylabel='Percentage of Data Clumps')\n"
    fileContent += "ax1.set(xlabel='Data Clumps Types')\n"
    fileContent += "plt.xticks(range(1, len(labels) + 1), labels)\n"
    fileContent += "plt.subplots_adjust(left=0.12, right=0.95, top=0.98, bottom=0.15)\n"
    fileContent += "fig.set_size_inches(6, 4, forward=True)\n"
    fileContent += "fig.set_dpi(200)\n"
    fileContent += "plt.show()\n"

    return fileContent;

}

/**
 * Asynchronously analyses the report folder using the provided options.
 * @param {string} report_folder - The path to the report folder to be analysed.
 * @param {object} options - The options for analysis.
 * @returns {Promise<string>} - A promise that resolves with the analysis result as a string.
 * @throws {Error} - If the specified path to the report folder does not exist.
 */
async function analyse(report_folder, options){
    console.log("Start Analysing Detected Data-Clumps-Clusters");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
    console.log("all_report_files_paths: "+all_report_files_paths.length);

    //printHistogram(sorted_timestamps, timestamp_to_file_paths);
    const ignore_without_data_clumps = options.ignore_without_data_clumps=='true';
    let filecontent = printDataClumpsClusterDistribution(all_report_files_paths, ignore_without_data_clumps);
    return filecontent;
}

/**
 * Asynchronous function to start Data-Clumps-Doctor Detection.
 * 
 * @throws {Error} Throws an error if any exception occurs during the execution.
 */
async function main() {
    console.log("Start Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;
    let filecontent = await analyse(report_folder, options);

    let output = options.output;
    // delete output file if it exists
    if (fs.existsSync(output)) {
        fs.unlinkSync(output);
    }

    console.log("Writing output to file: "+output)
    fs.writeFileSync(output, filecontent);

}

main();

