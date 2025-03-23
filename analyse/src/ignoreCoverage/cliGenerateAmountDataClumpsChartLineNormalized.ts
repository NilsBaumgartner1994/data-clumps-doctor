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


function getSortedTimestamps(timestamp_to_file_path){
    let sorted_timestamps = Object.keys(timestamp_to_file_path)
    return sorted_timestamps;
}


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

