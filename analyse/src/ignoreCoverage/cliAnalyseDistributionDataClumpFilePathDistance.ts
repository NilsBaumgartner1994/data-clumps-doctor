#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext,
    DataClumpTypeContext,
    Dictionary
} from "data-clumps-type-context";
import {Timer} from "./Timer";
import {AnalyseHelper, NumberOccurenceDict} from './AnalyseHelper';

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

    let data_clump_type_specific_distances: Dictionary<NumberOccurenceDict> = {};
    let all_data_clump_distances = new NumberOccurenceDict();

    let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};

    let timer = new Timer()
    timer.start();
    for(let i = 0; i < total_amount_of_report_files; i++){
        let progress_files = i+1;
        timer.printEstimatedTimeRemaining({
            progress: progress_files,
            total: total_amount_of_report_files
        });
        let report_file_path = all_report_files_paths[i];
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;
            let suffix = " - "+progress_data_clumps+"/"+amount_of_data_clumps;
            timer.printEstimatedTimeRemainingAfter1Second(
                {
                    progress: progress_files,
                    total: total_amount_of_report_files,
                    prefix: "Analysing Data Clumps",
                    suffix: suffix
                });

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
                all_data_clump_distances.addOccurence(distance, 1);
                if(data_clump_type_specific_distances[data_clump_type] === undefined){
                    data_clump_type_specific_distances[data_clump_type] = new NumberOccurenceDict();
                }
                data_clump_type_specific_distances[data_clump_type].addOccurence(distance, 1);
            }
        }

    }

    console.log("Start analysing distances");

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent();


    fileContent += "all_data = {}\n";
    fileContent += "manual_labels_array = []\n";
    let labels: string[] = [];
    fileContent += AnalyseHelper.getPythonAllDataValuesForOccurenceDict("all_data_clumps", all_data_clump_distances);
    labels.push("All Data Clumps");

    let data_clump_types = [AnalyseHelper.DataClumpType.PARAMETER_PARAMETER, AnalyseHelper.DataClumpType.FIELD_FIELD, AnalyseHelper.DataClumpType.PARAMETER_FIELD];
    for(let i = 0; i < data_clump_types.length; i++){
        let data_clump_type = data_clump_types[i];
        let data_clump_type_distances = data_clump_type_specific_distances[data_clump_type];
        fileContent += AnalyseHelper.getPythonAllDataValuesForOccurenceDict(data_clump_type+"_data_clumps_distances", data_clump_type_distances);
        fileContent += "\n";
        labels.push(data_clump_type);
    }

    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += "\n";
    fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
    fileContent += AnalyseHelper.getPythonPlot({
        output_filename_without_extension: options.output_filename_without_extension,
        y_label: "File Path Distance",
        width_inches: 6,
        height_inches: 4,
        offset_left: 0.15,
        offset_right: 0.95,
        offset_top: 0.98,
        offset_bottom: 0.10,
        x_labels: labels,
    });

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDistributionDataClumpFilePathDistance"
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

