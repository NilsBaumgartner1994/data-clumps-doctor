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


                if(data_clump_type === "parameters_to_parameters_data_clump"){
                    let method_key = data_clump.from_method_key;
                    if(!!method_key){
                        method_amount_data_clumps.addOccurence(method_key, 1);
                    }
                } else if(data_clump_type === "fields_to_fields_data_clump"){
                    let class_key = data_clump.from_class_or_interface_key
                    if(!!class_key){
                        class_amount_data_clumps.addOccurence(class_key, 1);
                    }
                } else if(data_clump_type === "parameters_to_fields_data_clump"){
                    let method_key = data_clump.from_method_key;
                    if(!!method_key){
                        method_amount_data_clumps.addOccurence(method_key, 1);
                    }
                    // Not needed as the data clump is from parameters to fields
                    //let class_key = data_clump.to_class_or_interface_key´
                    //if(!!class_key){
                    //    addAmount(class_amount_data_clumps, {[class_key]: 1});
                    //}
                }
            }
        }

    }

    console.log("Start analysing distances");

    let distributionNumberOfDataClumpsPerClass = new NumberOccurenceDict();
    let distributionNumberOfDataClumpsPerMethod = new NumberOccurenceDict();

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
        "Classes_with_Field_Field_Data_Clumps": distributionNumberOfDataClumpsPerClass.occurenceDict,
        "Methods_with_Parameter_Parameter_and_Parameter_Field_Data_Clumps": distributionNumberOfDataClumpsPerMethod.occurenceDict
    }

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

    let anylsis_keys = Object.keys(analysis_objects);
    for(let i = 0; i < anylsis_keys.length; i++){
        let analysis_name = anylsis_keys[i];
        let values = analysis_objects[analysis_name];
        fileContent += AnalyseHelper.getValuesForRecord("values_"+analysis_name, values);
    }

    fileContent += "all_data = {}\n";
    for (let i = 0; i < anylsis_keys.length; i++) {
        let analysis_name = anylsis_keys[i];
        fileContent += "all_data['" + analysis_name + "'] = " + "expand_frequency_dict(values_"+analysis_name + ")\n";
    }
    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
    fileContent += `fig, ax1 = ${AnalyseHelper.getPythonSubplot(options.output_filename_without_extension)}\n`;
    fileContent += `plt.boxplot(data, vert=False, widths=0.5, ${AnalyseHelper.getPythonMedianColor()})  # RGB umgerechnet auf 0-1 Skala
`;
    fileContent += "ax1.set(xlabel='Number of Data Clumps')\n";
    // Replace underscores with spaces in labels
    fileContent += "wrapped_labels = ['\\n'.join(textwrap.wrap(label.replace('_', ' '), width=20)) for label in labels]\n";
    fileContent += "plt.yticks(range(1, len(labels) + 1), wrapped_labels)  # Adjust y-axis labels\n";
    // Set the visible y-axis range
    fileContent += "x_max = 20\n" +
        "ax1.set_xlim([0, x_max])  # Increase x-axis limit for better spacing\n" +
        "ax1.set_xticks(range(0, x_max+1, 1))  # Setzt die x-Ticks in 1er-Schritten\n";

    fileContent += "plt.subplots_adjust(left=0.28, right=0.95, top=0.98, bottom=0.23)\n"; // Adjust bottom for better label display
    fileContent += "fig.set_size_inches(6, 2, forward=True)\n";
    fileContent += AnalyseHelper.getPythonFigDpiSetttingsAndShow();

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDistributionDataClumpClassAndMethodFanIn"
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

