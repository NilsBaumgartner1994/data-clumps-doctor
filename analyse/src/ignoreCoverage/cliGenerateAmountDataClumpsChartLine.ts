#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";

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
    .option('--output <path>', 'Output path', current_working_directory+'/AmountDataClumpsOverProjectVersions.py') /**
 * Converts timestamp to file paths.
 * @param all_report_files_paths Array of file paths.
 * @throws Error if unable to read or parse the report file.
 * @returns Object containing timestamp to file path mapping.
 */
// Default value is './data-clumps.json'

function time_stamp_to_file_paths(all_report_files_paths){

    let timestamp_to_file_path = {};
    for(let i = 0; i <all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json = JSON.parse(report_file);
        let project_commit_date = report_file_json?.project_info?.project_commit_date;
        project_commit_date = parseInt(project_commit_date); // unix timestamp
        let project_commit_date_date = project_commit_dateToDate(project_commit_date);

        if(timestamp_to_file_path[project_commit_date] === undefined){
            timestamp_to_file_path[project_commit_date] = [report_file_path]
        }
        else{
            timestamp_to_file_path[project_commit_date].push(report_file_path)
        }
    }

    console.log("Amount of timestamps: "+Object.keys(timestamp_to_file_path).length);

    return timestamp_to_file_path;
}

/**
 * Recursively retrieves all report files in the specified folder.
 * 
 * @param {string} folder_path - The path of the folder to search for report files.
 * @returns {string[]} - An array of paths to all report files found.
 * @throws {Error} - Throws an error if there is an issue with reading the directory or file stats.
 */
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
 * Retrieves sorted timestamps from the given timestamp_to_file_path object.
 * 
 * @param timestamp_to_file_path - The object containing timestamps as keys and file paths as values.
 * @returns An array of sorted timestamps.
 */
function getSortedTimestamps(timestamp_to_file_path){
    let sorted_timestamps = Object.keys(timestamp_to_file_path)
    return sorted_timestamps;
}


/**
 * Converts a project commit date to a formatted date string.
 * @param project_commit_date The project commit date in seconds.
 * @returns The formatted date string.
 * @throws Error if the project_commit_date is not a valid number.
 */
function project_commit_dateToDate(project_commit_date){
    let date = new Date(project_commit_date*1000);
    // date to string
    let date_string = date.toISOString().slice(0,10);
    return date_string;
}

/**
 * Retrieves the amount data clumps from the given sorted timestamps and timestamp to file paths.
 * 
 * @param sorted_timestamps The array of sorted timestamps.
 * @param timestamp_to_file_paths The object mapping timestamps to file paths.
 * @returns An array containing the amount data clumps retrieved from the report files.
 * @throws Throws an error if there is an issue reading or parsing the report files.
 */
function getListAmountDataClumps(sorted_timestamps, timestamp_to_file_paths){

    let row: any = []

    for(let i = 0; i < sorted_timestamps.length; i++){
        let timestamp = sorted_timestamps[i];
        let report_file_paths = timestamp_to_file_paths[timestamp];

        for(let j = 0; j < report_file_paths.length; j++){
            let report_file_path = report_file_paths[j];

            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file);

            let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps;
            row.push(amount_data_clumps);

        }
    }
    return row;
}

/**
 * Asynchronously analyses the report folder and generates a visualization of project data clumps over project versions.
 * @param {string} report_folder - The path to the report folder to be analysed.
 * @param {any} options - Additional options for the analysis (if any).
 * @throws {Error} - Throws an error if the specified path to the report folder does not exist.
 * @returns {Promise<string>} - A string containing the generated visualization code.
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
        console.log("Analysing project: "+report_project);

        let report_file_path = path.join(report_folder, report_project);
        if (fs.lstatSync(report_file_path).isDirectory()) {

            let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_file_path);
            let timestamp_to_file_paths = time_stamp_to_file_paths(all_report_files_paths);
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
 * Asynchronous function to execute the main program.
 * 
 * @throws {Error} Throws an error if there is an issue with file system operations.
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

