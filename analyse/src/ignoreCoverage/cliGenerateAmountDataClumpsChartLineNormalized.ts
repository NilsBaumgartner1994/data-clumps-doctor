#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {AnalyseHelper} from "./AnalyseHelper";
import {DataClumpsTypeContext} from "data-clumps-type-context";

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
    .option('--output <path>', 'Output path', current_working_directory+'/AmountDataClumpsOverProjectVersions.py') // Default value is './data-clumps.json'


/**
 * Retrieves and sorts the keys from a given object representing timestamps mapped to file paths.
 *
 * This function takes an object where the keys are timestamps and the values are file paths,
 * and returns an array of the sorted timestamp keys.
 *
 * @param {Object<string, string>} timestamp_to_file_path - An object mapping timestamps (as strings) to file paths (as strings).
 * @returns {Array<string>} An array of sorted timestamp keys.
 *
 * @throws {TypeError} Throws an error if the input is not an object.
 */
function getSortedTimestamps(timestamp_to_file_path){
    let sorted_timestamps = Object.keys(timestamp_to_file_path)
    return sorted_timestamps;
}


/**
 * Converts a Unix timestamp representing a project commit date into a formatted date string (YYYY-MM-DD).
 *
 * This function takes a Unix timestamp as input, converts it to a JavaScript Date object, and returns
 * the date in ISO format (YYYY-MM-DD). If the input timestamp is invalid, it defaults to the epoch date
 * (1970-01-01).
 *
 * @param {number} project_commit_date - The Unix timestamp of the project commit date.
 * @returns {string} The formatted date string in the format YYYY-MM-DD.
 * @throws {Error} Throws an error if the conversion to ISO string fails.
 *
 * @example
 * // Returns "2023-10-01"
 * project_commit_dateToDate(1696123200);
 *
 * @example
 * // Returns "1970-01-01" for an invalid timestamp
 * project_commit_dateToDate(-1);
 */
function project_commit_dateToDate(project_commit_date){
    let date = new Date(project_commit_date*1000);
    // check if valid date
    if(isNaN(date.getTime())){
        // then we set the date to 1970-01-01
        date = new Date(0);
    }
    // date to string
    try{
        let date_string = date.toISOString().slice(0,10);
        return date_string;
    } catch (e) {
        console.log("Error: "+e);
        console.log("Invalid project_commit_date: "+project_commit_date);
        throw e;
    }
}

/**
 * Calculates the normalized amount of data clumps from a given report file in JSON format.
 *
 * This function retrieves various metrics related to data clumps by calling helper functions
 * that normalize the number of parameters and fields. It then computes the average of these
 * normalized metrics to provide a single value representing the normalized amount of data clumps.
 *
 * @param {DataClumpsTypeContext} report_file_json - The report file in JSON format containing
 * data clump information.
 *
 * @returns {number} The normalized amount of data clumps calculated as the average of the
 * normalized metrics.
 *
 * @throws {Error} Throws an error if the input report_file_json is invalid or if any of the
 * helper functions fail to execute properly.
 */
function getNormalizedAmountDataClumps(report_file_json: DataClumpsTypeContext){
    let normalized_amount_method_field_data_clumps = getNormalizedNumberOfParameterFieldDataClumps(report_file_json);
    let normalized_amount_method_method_data_clumps = getNormalizedNumberOfParameterParameterDataClumps(report_file_json);
    let normalized_amount_field_field_data_clumps = getNormalizedNumberOfFieldFieldDataClumps(report_file_json);
    let list_of_normalized_metrics = [normalized_amount_method_field_data_clumps, normalized_amount_method_method_data_clumps, normalized_amount_field_field_data_clumps];
    let sum_of_normalized_metrics = list_of_normalized_metrics.reduce((a, b) => a + b, 0);

    let normalized_amount_data_clumps = 0;
    normalized_amount_data_clumps = sum_of_normalized_metrics / list_of_normalized_metrics.length;
    return normalized_amount_data_clumps;
}

/**
 * Calculates the normalized number of parameter field data clumps based on the provided report file JSON.
 *
 * This function takes a report file in JSON format, extracts relevant information about the number of methods
 * and classes or interfaces, and computes the normalized amount of method field data clumps. If there are no methods
 * or classes/interfaces, it returns zero to avoid division by zero.
 *
 * @param {DataClumpsTypeContext} report_file_json - The report file in JSON format containing project information
 * and summary of data clumps.
 * @returns {number} The normalized amount of method field data clumps, or zero if there are no methods or classes/interfaces.
 *
 * @throws {Error} Throws an error if the input report_file_json is invalid or does not contain the expected structure.
 */
function getNormalizedNumberOfParameterFieldDataClumps(report_file_json: DataClumpsTypeContext){
    let number_of_methods = report_file_json.project_info.number_of_methods || 0;
    if(number_of_methods === 0){
        return 0;
    }
    let number_of_classes_or_interfaces = report_file_json.project_info.number_of_classes_or_interfaces || 0;
    if(number_of_classes_or_interfaces === 0){
        return 0;
    }
    let amount_method_field_data_clumps = report_file_json.report_summary.parameters_to_fields_data_clump || 0;
    let normalized_amount_method_field_data_clumps = amount_method_field_data_clumps / (number_of_methods * number_of_classes_or_interfaces);
    return normalized_amount_method_field_data_clumps;
}

/**
 * Get the normalized amount of parameter-field data clumps
 * Since the amount of parameter-field data clumps depends on the number of methods, we should normalize it.
 * We divide the amount of parameter-field data clumps by the number of methods.
 * @param report_file_json
 */
function getNormalizedNumberOfParameterParameterDataClumps(report_file_json: DataClumpsTypeContext){
    let number_of_methods = report_file_json.project_info.number_of_methods || 0;
    if(number_of_methods === 0){
        return 0;
    }
    let amount_method_method_data_clumps = report_file_json.report_summary.parameters_to_parameters_data_clump || 0;
    let normalized_amount_method_method_data_clumps = amount_method_method_data_clumps / (number_of_methods * number_of_methods);
    return normalized_amount_method_method_data_clumps;
}

/**
 * Get the normalized amount of field-field data clumps
 * Since the amount of field-field data clumps depends on the number of data fields, we should normalize it.
 * We divide the amount of field-field data clumps by the number of classes or interfaces squared.
 * Squared because that is the maximum amount of field-field data clumps.
 * @param report_file_json
 */
function getNormalizedNumberOfFieldFieldDataClumps(report_file_json: DataClumpsTypeContext){
    let number_of_classes_or_interfaces = report_file_json.project_info.number_of_classes_or_interfaces || 0;
    if(number_of_classes_or_interfaces === 0){
        return 0;
    }
    let amount_field_field_data_clumps = report_file_json.report_summary.fields_to_fields_data_clump || 0;
    let normalized_amount_field_field_data_clumps = amount_field_field_data_clumps / (number_of_classes_or_interfaces * number_of_classes_or_interfaces);
    return normalized_amount_field_field_data_clumps;
}

/**
 * Analyzes a list of timestamps and retrieves the amount of data clumps from corresponding report files.
 *
 * This function takes in sorted timestamps and a mapping of timestamps to file paths, reads each report file,
 * parses its content, and computes the normalized amount of data clumps for each report.
 *
 * @param {string[]} sorted_timestamps - An array of sorted timestamp strings to be analyzed.
 * @param {Object} timestamp_to_file_paths - An object mapping each timestamp to an array of file paths.
 * @returns {any[]} An array containing the normalized amount of data clumps for each report file associated with the timestamps.
 *
 * @throws {Error} Throws an error if the file cannot be read or if the JSON parsing fails.
 */
function getListAmountDataClumps(sorted_timestamps, timestamp_to_file_paths){

    let row: any = []

    let amount_of_timestamps = sorted_timestamps.length;
    for(let i = 0; i < amount_of_timestamps; i++){
        let timestamp = sorted_timestamps[i];
        console.log("- Analyse timestamp "+(i+1)+"/"+amount_of_timestamps+" - "+project_commit_dateToDate(parseInt(timestamp)));
        let report_file_paths = timestamp_to_file_paths[timestamp];

        for(let j = 0; j < report_file_paths.length; j++){
            let report_file_path = report_file_paths[j];

            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file) as DataClumpsTypeContext;

            let amount_data_clumps = getNormalizedAmountDataClumps(report_file_json);
            row.push(amount_data_clumps);

        }
    }
    return row;
}

/**
 * Analyzes the data clumps detected in the specified report folder and generates a Python script for visualization.
 *
 * This asynchronous function checks if the provided report folder exists, retrieves report files,
 * processes the data to count data clumps, and constructs a Python script that uses Matplotlib
 * and Pandas to visualize the results.
 *
 * @param {string} report_folder - The path to the folder containing report files.
 * @param {Object} options - Additional options for analysis (currently unused).
 * @returns {Promise<string>} A promise that resolves to a string containing the generated Python script.
 * @throws {Error} Throws an error if the specified report folder does not exist.
 */
async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import pandas as pd\n" +
        "import matplotlib\n" +
        "matplotlib.rcParams.update({'font.size': 18})\n";
    fileContent += "\n";
    fileContent += "# List of markers to cycle through\n" +
        "markers = ['o', 'x', 'D', '+', '*', 's', 'p', 'h', 'v', '^', '<', '>']\n";
    fileContent += "projects = {\n";

    let all_report_projects= fs.readdirSync(report_folder);
    let lastProjectIndex = all_report_projects.length - 1;
    for (let i = 0; i < all_report_projects.length; i++) {
        let report_project = all_report_projects[i];
        // check if project is .DS_Store or non

        let report_file_path = path.join(report_folder, report_project);
        if (fs.lstatSync(report_file_path).isDirectory()) {
            console.log("Check project: "+report_project);

            let all_report_files_paths = AnalyseHelper.getAllReportFilesRecursiveInFolder(report_file_path);
            let timestamp_to_file_paths = AnalyseHelper.time_stamp_to_file_paths(all_report_files_paths);
            let sorted_timestamps = getSortedTimestamps(timestamp_to_file_paths);
            let list_for_project ="    "+"'"+report_project+"'"+" : [\n"
            let list_amount_data_clumps = await getListAmountDataClumps(sorted_timestamps, timestamp_to_file_paths);
            let last_index = list_amount_data_clumps.length - 1;
            for(let i = 0; i < list_amount_data_clumps.length; i++){
                list_for_project += list_amount_data_clumps[i]
                if(i !== last_index){
                    list_for_project += ","
                }
            }
            list_for_project +="]"
            fileContent += list_for_project;

            if(i !== lastProjectIndex){
                fileContent += ","
            }
            fileContent += "\n";
        }
    }

    fileContent += "}\n";
    fileContent += "# Find the maximum length among all projects\n" +
        "max_length = max(len(data) for data in projects.values())\n";
    fileContent += "# Normalize the timestamps for each project and create a DataFrame\n" +
        "data = {'Timestamps': range(1, max_length + 1)}\n" +
        "for project_name, project_data in projects.items():\n" +
        "    normalized_timestamps = [i/(len(project_data)-1) for i in range(len(project_data))]\n" +
        "    data[f'Normalized Timestamps {project_name}'] = normalized_timestamps + [None] * (max_length - len(project_data))\n" +
        "    data[project_name] = project_data + [None] * (max_length - len(project_data))\n" +
        "\n" +
        "df = pd.DataFrame(data)\n" +
        "\n" +
        "# Plotting\n" +
        "plt.figure(figsize=(10, 6))\n" +
        "for i, project_name in enumerate(projects.keys()):\n" +
        "    marker = markers[i % len(markers)]  # Cycle through the list of markers\n" +
        "    plt.plot(df[f'Normalized Timestamps {project_name}'], df[project_name], marker=marker, linestyle='-', label=project_name)\n" +
        "\n" +
        "plt.title('Project Data Clumps Over Project Versions')\n" +
        "plt.xlabel('Project Versions')\n" +
        "plt.subplots_adjust(left=0.08, right=0.98, top=0.97, bottom=0.06)\n" +
        "plt.ylabel('Amount Data Clumps')\n" +
        "plt.legend()\n" +
        "plt.grid(True)\n" +
        "\n" +
        "# Remove the x-axis tick labels\n" +
        "plt.xticks([], [])\n" +
        "\n" +
        "plt.show()";

    return fileContent

}

/**
 * The main function that orchestrates the execution of the Data-Clumps-Doctor detection process.
 * It parses command-line arguments, retrieves options, analyzes the specified report folder,
 * and writes the output to a designated file.
 *
 * @async
 * @function main
 * @returns {Promise<void>} A promise that resolves when the output has been successfully written to the file.
 *
 * @throws {Error} Throws an error if there is an issue with file operations, such as failing to delete an existing output file
 * or failing to write to the output file.
 *
 * @example
 * // To execute the main function, simply call it in an async context:
 * await main();
 */
async function main() {
    console.log("Data-Clumps-Doctor Detection");

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

