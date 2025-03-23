#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {AnalyseHelper} from "./AnalyseHelper";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext, DataClumpsVariableToContext,
    DataClumpTypeContext,
    Dictionary, Position
} from "data-clumps-type-context";
import {Timer} from "./Timer";

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
    .option('--output <path>', 'Output path for script', current_working_directory+'/DistributionDataClumpFileDistance.py') // Default value is './data-clumps.json'

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
 * Pairwise Distance:
 *
 *     Calculate the absolute distance (in lines) between each pair of clumped fields.
 *     Formula:
 *     distance(A,B)=∣startLine(A)−startLine(B)∣
 *     distance(A,B)=∣startLine(A)−startLine(B)∣
 *     If A, B, and C are in positions:
 *         A: line 2
 *         B: line 10
 *         C: line 20
 *         Distances = [|2 - 10|, |10 - 20|] = [8, 10].
 *     Resulting series: [8, 10].
 * @param positions
 */
function calculateLinePairwiseDistances(positions: Position[]): Record<string, number> {
    // sort the positions by start line
    const startLines = positions.map(pos => pos.startLine).sort((a, b) => a - b);
    const distances: Record<string, number> = {};
    for(let i = 1; i < startLines.length; i++){
        let distance = Math.abs(startLines[i] - startLines[i - 1]);
        distances[distance.toString()] = (distances[distance.toString()] || 0) + 1;
    }
    return distances;
}

/**
 * Spread (Max-Min):
 *
 *     Measure the span of the clumped fields:
 *     spread=max(startLine)−min(startLine)
 *     spread=max(startLine)−min(startLine)
 *     Using the example above:
 *         max = 20, min = 2, so spread = 20 - 2 = 18.
 *     Single value: [18].
 * @param positions
 */
function calculateLineSpread(positions: Position[]): Record<string, number> {
    const startLines = positions.map(pos => pos.startLine);
    let distances: Record<string, number> = {};
    for(let i = 1; i < startLines.length; i++){
        let distance = Math.max(...startLines) - Math.min(...startLines);
        distances[distance.toString()] = (distances[distance.toString()] || 0) + 1;
    }
    return distances;
}

/**
 * Distance to Median Field:
 *
 *     Find the median field line and calculate distances to it:
 *         median = startLine(B) = 10.
 *         Distances = [|2 - 10|, |10 - 10|, |20 - 10|] = [8, 0, 10].
 *     Resulting series: [8, 0, 10].
 * @param positions
 */
function calculateLineDistancesToMedian(positions: Position[]): Record<string, number> {
    const startLines = positions.map(pos => pos.startLine).sort((a, b) => a - b);
    const median = startLines[Math.floor(startLines.length / 2)];
    let distances: Record<string, number> = {};
    for(let i = 0; i < positions.length; i++){
        let distance = Math.abs(positions[i].startLine - median);
        distances[distance.toString()] = (distances[distance.toString()] || 0) + 1;
    }
    return distances;
}

function adjustPositionForModifiersTypeAndDelimiters(
    position: Position,
    modifiers: string[] | undefined,
    fullyQualifiedType: string,
    variableName: string,
    adjustForModifiersAndTypes: boolean,
    isFirst: boolean
): Position {
    if(!adjustForModifiersAndTypes){
        return position;
    }

    //console.log("Position Raw")
    //console.log(JSON.stringify(position, null, 2))

    // Extract the simple type name from the fully qualified type
    const simpleType = fullyQualifiedType.split(".").pop() || fullyQualifiedType; // "org.antlr.v4.automata.org.antlr.v4.tool.ast.GrammarAST" -> "GrammarAST"
    //console.log("Simple Type: "+simpleType)

    // Calculate the full "true" length of the declaration
    let modifierString = ""
    if (modifiers) {
        modifierString = modifiers.join(" ") + " ";
    }
    const typeString = simpleType + " ";
    //console.log("Modifier String: "+modifierString)

    // Adjust the startColumn backwards by the combined length of modifiers and type
    let adjustedStartColumn = position.startColumn - (modifierString.length + typeString.length);
    if(!isFirst){
        adjustedStartColumn -= ", ".length; // Add ", " if not the first variable
    }
    //console.log("Adjusted Start Column: "+adjustedStartColumn)

    return {
        ...position,
        startColumn: adjustedStartColumn >= 0 ? adjustedStartColumn : 0
    };
}

/**
 * Adjusts the position of a variable declaration to account for modifiers.
 * Example: String a, b, c -> [String a, String b, String c] then the startColumn of b and c should be adjusted accordingly.
 * @param sortedPositions
 */
function fixSortedAdjustedPositions(sortedPositions: Position[]): Position[] {
    const fixedPositions: Position[] = [...sortedPositions];

    for (let i = 1; i < fixedPositions.length; i++) {
        const prev = fixedPositions[i - 1];
        const current = fixedPositions[i];

        // If the current position starts before the previous one ends, adjust its start
        if (current.startColumn <= prev.endColumn) {
            const adjustment = prev.endColumn + 1; // Ensure there's at least one space
            fixedPositions[i] = {
                ...current,
                startColumn: adjustment,
                endColumn: Math.max(adjustment + (current.endColumn - current.startColumn), adjustment) // Adjust end accordingly
            };
        }
    }

    return fixedPositions;
}

function adjustPositionsForModifiersAndType(
    variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[],
    adjustForModifiersAndType: boolean,
): Position[] {
    //console.log("Adjusting position for modifiers and type");
    //console.log("Amount of variables: "+variables.length)

    let index = 0;
    return variables.map(variable =>
        {
            const isFirst = index === 0;
            index++;
            return adjustPositionForModifiersTypeAndDelimiters(
                variable.position,
                variable.modifiers,
                variable.type,
                variable.name,
                adjustForModifiersAndType,
                isFirst
            )
        }
    );
}



function getFixedAdjustedPositions(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[], adjustForTypeModifier: boolean): Position[] {
    const sortedVariables = sortVariablesByPosition(variables);
    const positions = adjustPositionsForModifiersAndType(sortedVariables, adjustForTypeModifier);
    return fixSortedAdjustedPositions(positions);
}

export function getFixedAdjustedPositionFromDataClumpTypeContext(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[], adjustForTypeModifier: boolean): Position[] {
    return getFixedAdjustedPositions(variables, adjustForTypeModifier);
}


function calculateFieldDistances(
    variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[]
): { pairwise: Record<string, number>; spread: Record<string, number>; toMedian: Record<string, number> } {
    let positions = getFixedAdjustedPositionFromDataClumpTypeContext(variables, false);

    return {
        pairwise: calculateLinePairwiseDistances(positions),
        spread: calculateLineSpread(positions),
        toMedian: calculateLineDistancesToMedian(positions)
    };
}


function calculateParameterDistances(
    data_clump: DataClumpTypeContext,
    data_clump_variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[],
): { pairwise: Record<string, number>; spread: Record<string, number>; spread_normalized: Record<string, number>; toMedian: Record<string, number>; toMedian_normalized: Record<string, number> } {
    // Extract parameters from the data clump

    // Da wir im Data Clumps Dataset keine Informationen haben (zumindest direkt) welche anderen Parameter vorhanden sind
    // Bringt es nichts die column distance zu berechnen. In einer Methode sind die Parameter in der Regel in einer Zeile bzw. nahe beieinander
    // Daher würde es mehr Sinn machen zu schauen, ob die gleich in der richtigen Reihenfolge sind.
    // "from_method_key": "com.nostra13.universalimageloader.core.ImageLoader/method/displayImage(java.lang.String uri, com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.imageaware.ImageAware imageAware, com.nostra13.universalimageloader.core.DisplayImageOptions options, com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingListener listener, com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingProgressListener progressListener)",
    // Die idee ist, dass wir die Position der variables aus dem from_method_key extrahieren und dann schauen ob die in der richtigen Reihenfolge sind, bzw. die Information davon ableiten
    let method_parameters_list = AnalyseHelper.getUnsafeMethodParameterListFromMethod(data_clump);
    if(!method_parameters_list){
        console.error("ERROR: Could not extract method parameters from fromMethodKey for data clump: "+data_clump.key)
        return {
            pairwise: {},
            spread: {},
            spread_normalized: {},
            toMedian: {},
            toMedian_normalized: {}
        };
    }

    if(method_parameters_list.length<=0){
        console.error("ERROR: Could not extract method parameters from fromMethodKey: "+data_clump.from_method_key+ " for data clump: "+data_clump.key)
        return {
            pairwise: {},
            spread: {},
            spread_normalized: {},
            toMedian: {},
            toMedian_normalized: {}
        };
    }

    // method_parameters_list = ["java.lang.String uri", "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.imageaware.ImageAware imageAware", "com.nostra13.universalimageloader.core.DisplayImageOptions options", "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingListener listener", "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingProgressListener progressListener"]

    let dict_method_parameter_positions: Record<string, number> = {};
    for(let i = 0; i < method_parameters_list.length; i++){
        let method_parameter = method_parameters_list[i];
        dict_method_parameter_positions[method_parameter] = i
    }
    // dict_method_parameter_positions = {
    // "java.lang.String uri": 0,
    // "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.imageaware.ImageAware imageAware": 1,
    // "com.nostra13.universalimageloader.core.DisplayImageOptions options": 2,
    // "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingListener listener": 3,
    // "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingProgressListener progressListener": 4
    // }

    // variables sind z. B. nur 3 von den 5 Parametern

    let variables_index_position: Record<string, number> = {};

    function getVariableKeyForMethodParameter(variable: DataClumpsVariableFromContext | DataClumpsVariableToContext): string {
        // "name": "uri",
        // "type": "java.lang.String",
        return variable.type+" "+variable.name;
    }

    function getVariableIndexInMethodParameters(variable: DataClumpsVariableFromContext | DataClumpsVariableToContext): number {
        let key = getVariableKeyForMethodParameter(variable);
        return dict_method_parameter_positions[key] || -1;
    }


    for(let i = 0; i < data_clump_variables.length; i++){
        let variable = data_clump_variables[i];
        let key = getVariableKeyForMethodParameter(variable);
        if(dict_method_parameter_positions[key] !== undefined){
            variables_index_position[key] = dict_method_parameter_positions[key];
        }
    }

    let sortedVariables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[] = data_clump_variables.sort((a, b) => {
        let position_a = getVariableIndexInMethodParameters(a);
        let position_b = getVariableIndexInMethodParameters(b);
        // smaller values first
        return position_a - position_b;
    });

    let pairwise: Record<string, number> = {};
    let spread: Record<string, number> = {};
    let spread_normalized: Record<string, number> = {};
    let toMedian: Record<string, number> = {};
    let toMedian_normalized: Record<string, number> = {};

    // Calculate pairwise distances
    for(let i = 1; i < sortedVariables.length; i++){
        let position_a = getVariableIndexInMethodParameters(sortedVariables[i-1]);
        let position_b = getVariableIndexInMethodParameters(sortedVariables[i]);
        let pairwise_distance = Math.abs(position_a - position_b);
        pairwise[pairwise_distance.toString()] = (pairwise[pairwise_distance.toString()] || 0) + 1;
    }

    // Calculate spread
    let start = getVariableIndexInMethodParameters(sortedVariables[0]);
    let end = getVariableIndexInMethodParameters(sortedVariables[sortedVariables.length-1]);
    let spread_distance = Math.abs(end - start);
    spread[spread_distance.toString()] = (spread[spread_distance.toString()] || 0) + 1;

    // Calculate normalized spread
    // Normalize the spread by dividing by the number of parameters - 1
    let normalized_spread_distance = spread_distance / (sortedVariables.length - 1);
    spread_normalized[normalized_spread_distance.toString()] = (spread_normalized[normalized_spread_distance.toString()] || 0) + 1;

    // Calculate distances to median
    let median_index = Math.floor(sortedVariables.length / 2);
    let median = getVariableIndexInMethodParameters(sortedVariables[median_index]);
    for(let i = 0; i < sortedVariables.length; i++){
        let position = getVariableIndexInMethodParameters(sortedVariables[i]);
        let distance = Math.abs(position - median);
        toMedian[distance.toString()] = (toMedian[distance.toString()] || 0) + 1;

        // Calculate normalized distances to median
        // Normalize the distance by dividing by ((the number of parameters - 1) / 2)
        // so that the minimum distance is 1 and we are referencing the median
        let normalized_distance = distance / ((sortedVariables.length - 1) / 2);
        toMedian_normalized[normalized_distance.toString()] = (toMedian_normalized[normalized_distance.toString()] || 0) + 1;
    }

    return {
        pairwise: pairwise,
        spread: spread,
        spread_normalized: spread_normalized,
        toMedian: toMedian,
        toMedian_normalized: toMedian_normalized
    };
}


function sortVariablesByPosition(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[]): DataClumpsVariableFromContext[] | DataClumpsVariableToContext[] {
    return variables.sort((a, b) => {
        if (a.position.startLine !== b.position.startLine) {
            return a.position.startLine - b.position.startLine;
        }
        return a.position.startColumn - b.position.startColumn;
    });
}

function calculateVariableLength(position: Position): number {
    return position.endColumn - position.startColumn;
}

export function calculateVariableLengths(positions: Position[]): Record<string, number> {
    let lengths: Record<string, number> = {};
    for(let i = 0; i < positions.length; i++){
        let position = positions[i];
        let length = calculateVariableLength(position);
        lengths[length.toString()] = (lengths[length.toString()] || 0) + 1;
    }
    return lengths;
}

function addDistances(distances: Record<string, number>, newDistances: Record<string, number>): Record<string, number> {
    for (const key in newDistances) {
        if (newDistances.hasOwnProperty(key)) {
            distances[key] = (distances[key] || 0) + newDistances[key];
        }
    }
    return distances;
}

function getNumberVariablesInWrongOrderAsOtherVariables(data_clump: DataClumpTypeContext): number {
    let data_clump_data = data_clump.data_clump_data;
    const variables = Object.values(data_clump_data);
    const sortedVariables = sortVariablesByPosition(variables) as DataClumpsVariableFromContext[];
    let otherVariables: DataClumpsVariableToContext[] = [];
    for(let variable_key in data_clump_data){
        let variableFrom = data_clump_data[variable_key];
        let variableTo = variableFrom.to_variable
        otherVariables.push(variableTo);
    }
    let otherSortedVariables = sortVariablesByPosition(otherVariables) as DataClumpsVariableToContext[];
    let numberOfVariablesInWrongOrder = 0;
    for(let i = 0; i < sortedVariables.length; i++){
        let fromVariable = sortedVariables[i];
        let expectedVariable = otherSortedVariables[i];
        if(fromVariable.to_variable.key !== expectedVariable.key){
            numberOfVariablesInWrongOrder++;
        }
    }
    return numberOfVariablesInWrongOrder;
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "" +
        "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "import textwrap\n" +
        "from numpy import nan\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "#matplotlib.rcParams.update({'font.size': 18})\n" +
        "NaN = nan\n" +
        "def expand_frequency_dict(freq_dict):\n" +
        "    expanded_list = []\n" +
        "    for number, count in freq_dict.items():\n" +
        "        number = float(number)  # Convert keys to integers\n" +
        "        expanded_list.extend([number] * count)\n" +
        "    return expanded_list\n" +
        "\n";

    let fields_distance_pairwise: Record<string, number> = {}; // key:distance, value:amount
    let fields_distance_spread: Record<string, number> = {}; // key:distance, value:amount
    let fields_distance_to_median: Record<string, number> = {}; // key:distance, value:amount
    let fields_in_different_order_as_other_variables: Record<string, number> = {}; // key:distance, value:amount

    let parameters_distance_with_delimiters_pairwise: Record<string, number> = {}; // key:distance, value:amount
    let parameters_distance_with_delimiters_spread: Record<string, number> = {}; // key:distance, value:amount
    let parameters_distance_with_delimiters_spread_normalized: Record<string, number> = {}; // key:distance, value:amount
    let parameters_distance_with_delimiters_to_median: Record<string, number> = {}; // key:distance, value:amount
    let parameters_distance_with_delimiters_to_median_normalized: Record<string, number> = {}; // key:distance, value:amount
    let parameters_in_different_order_as_other_variables: Record<string, number> = {}; // key:distance, value:amount

    let parameter_length_with_type_and_modifiers: Record<string, number> = {}; // key:distance, value:amount
    let parameter_length_without_type_and_modifiers: Record<string, number> = {}; // key:distance, value:amount


    let timer = new Timer()
    timer.start();
    let lastElapsedTime = 0;

    let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

    //let parameter_data_clump_found = false;
    //let field_data_clump_found = false;
    for(let i = 0; i < total_amount_of_report_files; i++){
        let progress_files = i+1;
        let report_file_path = all_report_files_paths[i];

        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;

            let elaspedTime = timer.getElapsedTime();
            if(elaspedTime > lastElapsedTime + 1000){
                console.log("Analysing file: "+report_file_path);
                AnalyseHelper.printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                timer.printElapsedTime()
                timer.printEstimatedTimeRemaining(progress_files, total_amount_of_report_files)
                lastElapsedTime = elaspedTime
            }

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

                    let parameters_distance_with_delimiters = calculateParameterDistances(data_clump, variables);
                    addDistances(parameters_distance_with_delimiters_pairwise, parameters_distance_with_delimiters.pairwise);
                    addDistances(parameters_distance_with_delimiters_spread, parameters_distance_with_delimiters.spread);
                    addDistances(parameters_distance_with_delimiters_spread_normalized, parameters_distance_with_delimiters.spread_normalized);
                    addDistances(parameters_distance_with_delimiters_to_median, parameters_distance_with_delimiters.toMedian);
                    addDistances(parameters_distance_with_delimiters_to_median_normalized, parameters_distance_with_delimiters.toMedian_normalized);

                    let positionsWithTypes = getFixedAdjustedPositionFromDataClumpTypeContext(variables, true);
                    let positionsWithoutTypes = getFixedAdjustedPositionFromDataClumpTypeContext(variables, false);
                    addDistances(parameter_length_with_type_and_modifiers, calculateVariableLengths(positionsWithTypes));
                    addDistances(parameter_length_without_type_and_modifiers, calculateVariableLengths(positionsWithoutTypes));

                    let numberOfVariablesInWrongOrder = getNumberVariablesInWrongOrderAsOtherVariables(data_clump);
                    parameters_in_different_order_as_other_variables[numberOfVariablesInWrongOrder.toString()] = (parameters_in_different_order_as_other_variables[numberOfVariablesInWrongOrder.toString()] || 0) + 1;
                } else if(data_clump_type === "fields_to_fields_data_clump"){
                    const variables = Object.values(data_clump.data_clump_data);

                    let fields_distances = calculateFieldDistances(variables);
                    addDistances(fields_distance_pairwise, fields_distances.pairwise);
                    addDistances(fields_distance_spread, fields_distances.spread);
                    addDistances(fields_distance_to_median, fields_distances.toMedian);

                    let numberOfVariablesInWrongOrder = getNumberVariablesInWrongOrderAsOtherVariables(data_clump);
                    fields_in_different_order_as_other_variables[numberOfVariablesInWrongOrder.toString()] = (fields_in_different_order_as_other_variables[numberOfVariablesInWrongOrder.toString()] || 0) + 1;
                } else if(data_clump_type === "parameters_to_fields_data_clump"){
                    let parameters = Object.values(data_clump.data_clump_data);
                    let fields: DataClumpsVariableToContext[] = [];
                    for(let variable_key in data_clump_data){
                        let parameter_from = data_clump_data[variable_key];
                        let field_to = parameter_from.to_variable
                        fields.push(field_to);
                    }

                    let parameters_distance_with_delimiters = calculateParameterDistances(data_clump, parameters);
                    addDistances(parameters_distance_with_delimiters_pairwise, parameters_distance_with_delimiters.pairwise);
                    addDistances(parameters_distance_with_delimiters_spread, parameters_distance_with_delimiters.spread);
                    addDistances(parameters_distance_with_delimiters_to_median_normalized, parameters_distance_with_delimiters.spread_normalized);
                    addDistances(parameters_distance_with_delimiters_to_median, parameters_distance_with_delimiters.toMedian);
                    addDistances(parameters_distance_with_delimiters_to_median_normalized, parameters_distance_with_delimiters.toMedian_normalized);

                    let positionsWithTypes = getFixedAdjustedPositionFromDataClumpTypeContext(parameters, true);
                    let positionsWithoutTypes = getFixedAdjustedPositionFromDataClumpTypeContext(parameters, false);
                    addDistances(parameter_length_with_type_and_modifiers, calculateVariableLengths(positionsWithTypes));
                    addDistances(parameter_length_without_type_and_modifiers, calculateVariableLengths(positionsWithoutTypes));


                    let fields_distance_with_modifiers = calculateFieldDistances(fields);
                    addDistances(fields_distance_pairwise, fields_distance_with_modifiers.pairwise);
                    addDistances(fields_distance_spread, fields_distance_with_modifiers.spread);
                    addDistances(fields_distance_to_median, fields_distance_with_modifiers.toMedian);

                    let numberOfVariablesInWrongOrder = getNumberVariablesInWrongOrderAsOtherVariables(data_clump);
                    parameters_in_different_order_as_other_variables[numberOfVariablesInWrongOrder.toString()] = (parameters_in_different_order_as_other_variables[numberOfVariablesInWrongOrder.toString()] || 0) + 1;
                }
            }
        }

    }

    console.log("Start analysing distances");

    let analysis_objects: Record<string, Record<string, number>> = {
        "fields_pairwise": fields_distance_pairwise,
        "fields_spread": fields_distance_spread,
        "fields_to_median": fields_distance_to_median,
        "fields_in_different_order_as_other_variables": fields_in_different_order_as_other_variables,
        "parameters_with_delimiters_pairwise": parameters_distance_with_delimiters_pairwise,
        "parameters_with_delimiters_spread": parameters_distance_with_delimiters_spread,
        "parameters_with_delimiters_spread_normalized": parameters_distance_with_delimiters_spread_normalized,
        "parameters_with_delimiters_to_median": parameters_distance_with_delimiters_to_median,
        "parameters_with_delimiters_to_median_normalized": parameters_distance_with_delimiters_to_median_normalized,
        "parameters_in_different_order_as_other_variables_in_same_class_or_interface": parameters_in_different_order_as_other_variables,
        "parameter_length_with_type_and_modifiers": parameter_length_with_type_and_modifiers,
        "parameter_length_without_type_and_modifiers": parameter_length_without_type_and_modifiers
    }

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
    fileContent += "\n" +
        "# Berechnung der Statistik-Werte\n" +
        "statistics = {}\n" +
        "for label, values in all_data.items():\n" +
        "    values_sorted = np.sort(values)\n" +
        "    q1 = np.percentile(values_sorted, 25)\n" +
        "    median = np.median(values_sorted)\n" +
        "    q3 = np.percentile(values_sorted, 75)\n" +
        "    # Whisker-Berechnung\n" +
        "    iqr = q3 - q1\n" +
        "    lower_whisker = np.min(values_sorted[values_sorted >= (q1 - 1.5 * iqr)])\n" +
        "    upper_whisker = np.max(values_sorted[values_sorted <= (q3 + 1.5 * iqr)])\n" +
        "    statistics[label] = {\n" +
        "        'Q1': q1, 'Median': median, 'Q3': q3,\n" +
        "        'Lower Whisker': lower_whisker, 'Upper Whisker': upper_whisker\n" +
        "    }\n" +
        "\n" +
        "    print(f\"{label}: Q1 = {q1:.2f}, Median = {median:.2f}, Q3 = {q3:.2f}, \"\n" +
        "          f\"Lower Whisker = {lower_whisker:.2f}, Upper Whisker = {upper_whisker:.2f}\")" +
        "\n";
    fileContent += "fig, ax1 = plt.subplots()\n";
    fileContent += "plt.boxplot(data, medianprops={'color': (172/255, 6/255, 52/255)})  # RGB umgerechnet auf 0-1 Skala\n";
    fileContent += "ax1.set(ylabel='Distance Line/Column')\n";
    // Replace underscores with spaces in labels
    fileContent += "wrapped_labels = ['\\n'.join(textwrap.wrap(label.replace('_', ' '), width=15)) for label in labels]\n";
    fileContent += "plt.xticks(range(1, len(labels) + 1), wrapped_labels)\n";
    // Set the visible y-axis range
    fileContent += "ax1.set_ylim([0, 100])\n"; // Adjust range to your desired limits

    fileContent += "plt.subplots_adjust(left=0.15, right=0.95, top=0.98, bottom=0.10)\n"; // Adjust bottom for better label display
    fileContent += "fig.set_size_inches(6, 4, forward=True)\n";
    fileContent += "fig.set_dpi(200)\n";
    fileContent += "plt.show()\n";

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

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

