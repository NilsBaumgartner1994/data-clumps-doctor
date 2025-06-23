#!/usr/bin/env node

import fs from 'fs';
import {AnalyseHelper, NumberOccurenceDict, StringOccurenceDict} from "./AnalyseHelper";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext,
    DataClumpsVariableToContext,
    DataClumpTypeContext,
    Dictionary,
    Position
} from "data-clumps-type-context";
import {Timer} from "./Timer";
import {getFixedAdjustedPositionFromDataClumpTypeContext} from "./cliAnalyseDistributionDataClumpVariableDistance";


function calculateVariableLength(position: Position): number {
    return position.endColumn - position.startColumn;
}


/**
 * Calculates the lengths of variables based on their positions and returns a record
 * mapping each length to its occurrence count.
 *
 * @param {Position[]} positions - An array of Position objects from which variable lengths are calculated.
 * @returns {Record<string, number>} A record where the keys are the lengths of the variables as strings,
 *                                    and the values are the counts of how many times each length occurs.
 *
 * @throws {Error} Throws an error if the input is not an array of Position objects.
 */
export function calculateVariableLengths(positions: Position[]): NumberOccurenceDict {
    let lengths = new NumberOccurenceDict();
    for(let i = 0; i < positions.length; i++){
        let position = positions[i];
        let length = calculateVariableLength(position);
        let length_key = parseInt(length.toString());
        lengths.addOccurence(length_key, 1);
    }
    return lengths;
}


async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let parameter_signature_length = new NumberOccurenceDict()
    let paramter_name_length = new NumberOccurenceDict()
    let amount_parameters_counted = 0;


    let timer = new Timer()
    timer.start();

    let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

    //let parameter_data_clump_found = false;
    //let field_data_clump_found = false;
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
            let suffix = progress_data_clumps+"/"+amount_of_data_clumps;
            timer.printEstimatedTimeRemainingAfter1Second({
                progress: progress_files,
                total: total_amount_of_report_files,
                prefix: "Data-Clumps",
                suffix: suffix
            });

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){ // Skip already analysed data clumps
                continue;
            } else {
                // Allow to analyse the data clump twice, as parameter name length for other timestamps are also counted multiple times
                //dict_of_analysed_data_clumps_keys[data_clump_key] = true; // Mark as analysed

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data
                let data_clump_type = data_clump.data_clump_type; // 'parameters_to_parameters_data_clump' or 'fields_to_fields_data_clump' or "parameters_to_fields_data_clump"


                if(data_clump_type === AnalyseHelper.DataClumpType.PARAMETER_PARAMETER){
                    const variables = Object.values(data_clump.data_clump_data);
                    let positionsWithTypes = getFixedAdjustedPositionFromDataClumpTypeContext(variables, true);
                    let positionsWithoutTypes = getFixedAdjustedPositionFromDataClumpTypeContext(variables, false);
                    parameter_signature_length.concat(calculateVariableLengths(positionsWithTypes));
                    paramter_name_length.concat(calculateVariableLengths(positionsWithoutTypes));

                    amount_parameters_counted += variables.length;
                } else if(data_clump_type === AnalyseHelper.DataClumpType.FIELD_FIELD){

                } else if(data_clump_type === AnalyseHelper.DataClumpType.PARAMETER_FIELD){
                    let parameters = Object.values(data_clump.data_clump_data);

                    let positionsWithTypes = getFixedAdjustedPositionFromDataClumpTypeContext(parameters, true);
                    let positionsWithoutTypes = getFixedAdjustedPositionFromDataClumpTypeContext(parameters, false);
                    parameter_signature_length.concat(calculateVariableLengths(positionsWithTypes));
                    paramter_name_length.concat(calculateVariableLengths(positionsWithoutTypes));

                    amount_parameters_counted += parameters.length;
                }
            }
        }

    }

    let analysis_objects = {
        parameter_signature_length: parameter_signature_length,
        parameter_name_length: paramter_name_length,
    }

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent()
    fileContent += "# amount_parameters_counted: "+amount_parameters_counted+"\n";

    fileContent += "all_data = {}\n";
    fileContent += "manual_labels_array = []\n";
    let labels: string[] = [];

    fileContent += AnalyseHelper.getPythonAllDataValuesForOccurenceDict("values_"+"parameter_signature_length", analysis_objects.parameter_signature_length);
    labels.push("Parameter\nSignature\nLength");

    fileContent += AnalyseHelper.getPythonAllDataValuesForOccurenceDict("values_"+"parameter_name_length", analysis_objects.parameter_name_length);
    labels.push("Parameter Name\nLength");

    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
    fileContent += AnalyseHelper.getPythonPlot({
        output_filename_without_extension: options.output_filename_without_extension,
        y_label: "Number of Characters",
        y_max: 100,
        x_labels: labels,
        offset_left: 0.2,
        offset_right: 0.95,
        offset_top: 0.98,
        offset_bottom: 0.20,
        width_inches: 3,
        w_bar_width: 0.6,
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
        default_output_filename_without_extension: "AnalyseDistributionDataClumpParameterNameLength",
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

