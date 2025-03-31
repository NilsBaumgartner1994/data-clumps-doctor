#!/usr/bin/env node

import fs from 'fs';
import {AnalyseHelper, NumberOccurenceDict} from "./AnalyseHelper";
import {DataClumpsVariableFromContext, DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {Timer} from "./Timer";

/**
 * Analyzes data clumps from reports located in the specified folder and generates statistical analysis.
 *
 * This asynchronous function checks for the existence of the report folder, reads report files,
 * and processes data clumps to gather statistics. It also generates a box plot visualization of the results.
 *
 * @param {string} report_folder - The path to the folder containing report files.
 * @param {object} options - Additional options for analysis (currently unused).
 * @returns {Promise<string>} A promise that resolves to a string containing the generated Python code for analysis.
 *
 * @throws {Error} Throws an error if the specified report folder does not exist.
 */
async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let field_field_max_amount = new NumberOccurenceDict()
    let parameter_parameter_max_amount = new NumberOccurenceDict()
    let parameter_field_max_amount = new NumberOccurenceDict()


    let timer = new Timer()
    timer.start();

    let all_report_files_paths = AnalyseHelper.getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};

    //let parameter_data_clump_found = false;
    //let field_data_clump_found = false;
    for(let i = 0; i < total_amount_of_report_files; i++){
        timer.printEstimatedTimeRemaining({
            progress: i,
            total: total_amount_of_report_files
        });
        let progress_files = i+1;
        let report_file_path = all_report_files_paths[i];

        let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;

            let suffix = " - "+progress_data_clumps+"/"+amount_of_data_clumps;
            timer.printEstimatedTimeRemainingAfter1Second({
                progress: progress_data_clumps,
                total: amount_of_data_clumps,
                prefix: null,
                suffix: suffix
            });

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){ // Skip already analysed data clumps
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true; // Mark as analysed

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data
                let data_clump_type = data_clump.data_clump_type; // 'parameters_to_parameters_data_clump' or 'fields_to_fields_data_clump' or "parameters_to_fields_data_clump"


                if(data_clump_type === "parameters_to_parameters_data_clump"){
                    const variables = Object.values(data_clump.data_clump_data);
                    let amount_of_variables = variables.length;
                    parameter_parameter_max_amount.addOccurence(amount_of_variables, 1);
                } else if(data_clump_type === "fields_to_fields_data_clump"){
                    const variables = Object.values(data_clump.data_clump_data);
                    let amount_of_variables = variables.length;
                    field_field_max_amount.addOccurence(amount_of_variables, 1);
                } else if(data_clump_type === "parameters_to_fields_data_clump"){
                    let parameters = Object.values(data_clump.data_clump_data);
                    let amount_of_parameters = parameters.length;
                    parameter_field_max_amount.addOccurence(amount_of_parameters, 1);
                }
            }
        }

    }

    console.log("Start analysing distances");

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent();
    fileContent += "all_data = {}\n";
    fileContent += "manual_labels_array = []\n";

    let analysis_objects = {
        "parameter_parameter_max_amount": parameter_parameter_max_amount,
        "field_field_max_amount": field_field_max_amount,
        "parameter_field_max_amount": parameter_field_max_amount
    }

    let anylsis_keys = Object.keys(analysis_objects);
    let labels: string[] = [];
    for(let i = 0; i < anylsis_keys.length; i++){
        let analysis_name = anylsis_keys[i];
        let values = analysis_objects[analysis_name];
        fileContent += AnalyseHelper.getPythonAllDataValuesForOccurenceDict("values_"+analysis_name, values);
        labels.push(analysis_name);
    }

    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
    fileContent += AnalyseHelper.getPythonPlot({
        output_filename_without_extension: options.output_filename_without_extension,
        y_label: "Distance",
        y_max: 20,
        y_ticks: 2,
        offset_left: 0.15,
        offset_right: 0.95,
        offset_top: 0.98,
        offset_bottom: 0.14,
        width_inches: 6,
        height_inches: 4,
        use_manual_labels: true,
    });
    return fileContent
}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDistributionDataClumpVariableAmount",
    })

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

