#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {AnalyseHelper} from "./AnalyseHelper";
import {DataClumpsTypeContext} from "data-clumps-type-context";


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

    let all_report_projects= fs.readdirSync(report_folder);

    let projectToAmountDataClumps: Record<string, number[]> = {};

    for (let i = 0; i < all_report_projects.length; i++) {
        let report_project = all_report_projects[i];
        // check if project is .DS_Store or non

        let report_project_folder_path = path.join(report_folder, report_project);
        if (fs.lstatSync(report_project_folder_path).isDirectory()) {
            console.log("Check project: "+report_project);

            let sorted_report_file_paths = AnalyseHelper.getSortedReportFilePathsByTimestamps(report_project_folder_path);
            for(let i = 0; i < sorted_report_file_paths.length; i++){
                let report_file_path = sorted_report_file_paths[i];
                let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);
                let normalizedNumberOfDataClumps = getNormalizedAmountDataClumps(report_file_json);
                let project_name = report_file_json?.project_info.project_name;
                if(!!project_name){
                    if(normalizedNumberOfDataClumps!==null){
                        if(!projectToAmountDataClumps[project_name]){
                            projectToAmountDataClumps[project_name] = [];
                        }
                        projectToAmountDataClumps[project_name].push(normalizedNumberOfDataClumps);
                    } else {
                        console.log("ERROR: amount_data_clumps is null for report file: "+report_file_path);
                    }
                } else {
                    console.log("ERROR: project_name is null for report file: "+report_file_path);
                }
            }
        }
    }

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent()

    fileContent += "# List of markers to cycle through\n"
    fileContent += "markers = ['o', 'x', 'D', '+', '*', 's', 'p', 'h', 'v', '^', '<', '>']\n";
    fileContent += "projects = {\n";

    let project_names = Object.keys(projectToAmountDataClumps);
    for (let i = 0; i < project_names.length; i++) {
        let project_name = project_names[i];
        let project_data = projectToAmountDataClumps[project_name];
        fileContent += `    '${project_name}': ${JSON.stringify(project_data)},\n`;
    }

    fileContent += "}\n";
    fileContent += "# Find the maximum length among all projects\n";
    fileContent += "max_length = max(len(data) for data in projects.values())\n";
    fileContent += "# Normalize the timestamps for each project and create a DataFrame\n";
    fileContent += "data = {'Timestamps': range(1, max_length + 1)}\n";
    fileContent += "for project_name, project_data in projects.items():\n";
    fileContent += "    normalized_timestamps = [i/(len(project_data)-1) for i in range(len(project_data))]\n";
    fileContent += "    data[f'Normalized Timestamps {project_name}'] = normalized_timestamps + [None] * (max_length - len(project_data))\n";
    fileContent += "    data[project_name] = project_data + [None] * (max_length - len(project_data))\n";
    fileContent += "\n";
    fileContent += "df = pd.DataFrame(data)\n";
    fileContent += "\n";
    fileContent += "# Plotting\n";
    fileContent += "plt.figure(figsize=(10, 6))\n";
    fileContent += "for i, project_name in enumerate(projects.keys()):\n";
    fileContent += "    marker = markers[i % len(markers)]  # Cycle through the list of markers\n";
    fileContent += "    plt.plot(df[f'Normalized Timestamps {project_name}'], df[project_name], marker=marker, linestyle='-', label=project_name)\n";
    fileContent += "\n";
    fileContent += "plt.title('Project Data Clumps Over Project Versions')\n";
    fileContent += "plt.xlabel('Project Versions')\n";
    fileContent += "plt.subplots_adjust(left=0.08, right=0.98, top=0.97, bottom=0.06)\n";
    fileContent += "plt.ylabel('Normalized Number of Data Clumps')\n";
    fileContent += "plt.legend()\n";
    fileContent += "plt.grid(True)\n";
    fileContent += "\n";
    fileContent += "# Remove the x-axis tick labels\n";
    fileContent += "plt.xticks([], [])\n";
    fileContent += "\n";
    fileContent += "plt.show()";

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

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "GenerateDetectedDataClumpsChartLineNormalized",
    })

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

