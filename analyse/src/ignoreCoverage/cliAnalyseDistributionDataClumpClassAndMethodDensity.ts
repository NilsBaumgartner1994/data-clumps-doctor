#!/usr/bin/env node

import fs from 'fs';
import {AnalyseHelper, NumberOccurenceDict, StringOccurenceDict} from "./AnalyseHelper";
import {DataClumpsVariableFromContext, DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {Timer} from "./Timer";

/**
 * Analyzes data clumps from report files located in the specified folder.
 * This function reads JSON report files, processes data clumps, and generates statistical analysis
 * including frequency distributions for classes and methods. It also visualizes the results using a box plot.
 *
 * @async
 * @param {string} report_folder - The path to the folder containing report files.
 * @param {object} options - Additional options for analysis (currently unused).
 * @returns {Promise<string>} A string containing the generated file content for analysis.
 * @throws {Error} Throws an error if the specified report folder does not exist.
 */
async function analyse(report_folder, options): Promise<string> {
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }


    let file_amount_data_clumps = new StringOccurenceDict()
    let class_amount_data_clumps = new StringOccurenceDict()
    let method_amount_data_clumps = new StringOccurenceDict()


    let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};

    //let parameter_data_clump_found = false;
    //let field_data_clump_found = false;
    let timer = new Timer();
    timer.start();
    for(let i = 0; i < total_amount_of_report_files; i++){
        timer.printEstimatedTimeRemaining({
            progress: i,
            total: total_amount_of_report_files
        });

        let progress_files = i+1;
        let report_file_path = all_report_files_paths[i];

        let report_file_json = AnalyseHelper.getReportFileJson(report_file_path)

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;

            let suffix = " - Data Clumps: "+progress_data_clumps+"/"+amount_of_data_clumps;
            timer.printEstimatedTimeRemainingAfter1Second({
                progress: progress_files,
                total: total_amount_of_report_files,
                prefix: "Analysing",
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

                // Add the file name to the file amount data clumps
                let file_key = data_clump.from_file_path;
                if(!!file_key){
                    file_amount_data_clumps.addOccurence(file_key, 1);
                }
                let class_key = data_clump.from_class_or_interface_key
                if(!!class_key){
                    class_amount_data_clumps.addOccurence(class_key, 1);
                }

                if(data_clump_type === AnalyseHelper.DataClumpType.PARAMETER_PARAMETER){
                    let method_key = data_clump.from_method_key;
                    if(!!method_key){
                        method_amount_data_clumps.addOccurence(method_key, 1);
                    }
                } else if(data_clump_type === AnalyseHelper.DataClumpType.FIELD_FIELD){
                    // already added the class key above
                } else if(data_clump_type === AnalyseHelper.DataClumpType.PARAMETER_FIELD){
                    let method_key = data_clump.from_method_key;
                    if(!!method_key){
                        method_amount_data_clumps.addOccurence(method_key, 1);
                    }
                }
            }
        }

    }

    console.log("Start analysing distances");

    let distributionFileAmountDataClumps = new NumberOccurenceDict();
    let distributionNumberOfDataClumpsPerClass = new NumberOccurenceDict();
    let distributionNumberOfDataClumpsPerMethod = new NumberOccurenceDict();

    // Calculate the distribution of data clumps per file
    let file_keys = file_amount_data_clumps.getKeys();
    for(let i = 0; i < file_keys.length; i++) {
        let file_key = file_keys[i];
        let amount = file_amount_data_clumps.getOccurence(file_key);
        distributionFileAmountDataClumps.addOccurence(amount, 1);
    }

    let class_keys = class_amount_data_clumps.getKeys()
    for(let i = 0; i < class_keys.length; i++) {
        let class_key = class_keys[i];
        let amount = class_amount_data_clumps.getOccurence(class_key);
        distributionNumberOfDataClumpsPerClass.addOccurence(amount, 1);
    }

    let method_keys = method_amount_data_clumps.getKeys();
    for(let i = 0; i < method_keys.length; i++) {
        let method_key = method_keys[i];
        let amount = method_amount_data_clumps.getOccurence(method_key);
        distributionNumberOfDataClumpsPerMethod.addOccurence(amount, 1);
    }

    let analysis_objects: Record<string, Record<string, number>> = {
        "Files_with_Data_Clumps": distributionFileAmountDataClumps.occurenceDict,
        "Classes_with_Data_Clumps": distributionNumberOfDataClumpsPerClass.occurenceDict,
        "Methods_with_Data_Clumps": distributionNumberOfDataClumpsPerMethod.occurenceDict
    }

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

    let anylsis_keys = Object.keys(analysis_objects);
    let x_labels: string[] = [];
    for(let i = 0; i < anylsis_keys.length; i++){
        let analysis_name = anylsis_keys[i];
        let values = analysis_objects[analysis_name];
        fileContent += AnalyseHelper.getValuesForRecord("values_"+analysis_name, values);
        x_labels.push(analysis_name);
    }

    fileContent += "all_data = {}\n";
    for (let i = 0; i < anylsis_keys.length; i++) {
        let analysis_name = anylsis_keys[i];
        fileContent += "all_data['" + analysis_name + "'] = " + "expand_frequency_dict(values_"+analysis_name + ")\n";
    }
    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
    fileContent += AnalyseHelper.getPythonPlot({
        output_filename_without_extension: options.output_filename_without_extension,
        offset_left: 0.18,
        offset_right: 0.97,
        offset_bottom: 0.23,
        offset_top: 0.98,
        width_inches: 6,
        height_inches: 2,
        y_label: 'Number of Data Clumps',
        x_labels: x_labels,
        horizontal: true,
        y_max: 25,
        y_ticks: 1,
        w_bar_width: 0.5
    });

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDistributionDataClumpDensity"
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

