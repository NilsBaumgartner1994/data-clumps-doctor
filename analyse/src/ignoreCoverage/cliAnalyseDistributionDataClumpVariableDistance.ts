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
function calculateLinePairwiseDistances(positions: Position[]): number[] {
    // sort the positions by start line
    const startLines = positions.map(pos => pos.startLine).sort((a, b) => a - b);
    const distances: number[] = [];
    for(let i = 1; i < startLines.length; i++){
        distances.push(Math.abs(startLines[i] - startLines[i - 1]));
    }
    return distances;
}

/**
 * Pairwise Column Distances:
 *
 * Calculate the distance between the end column of one position (A) and
 * the start column of the next position (B). Add +1 if A and B are on different lines.
 * @param positions
 */
function calculateColumnPairwiseDistances(positions: Position[]): number[] {
    const distances: number[] = [];
    for(let i = 1; i < positions.length; i++){
        let j = i - 1;
        const sameLine = positions[i].startLine === positions[j].startLine;
        const columnDistance = Math.abs(positions[i].endColumn - positions[j].startColumn);
        const lineBreakPenalty = sameLine ? 0 : 1; // Add +1 for line breaks
        distances.push(columnDistance + lineBreakPenalty);
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
function calculateLineSpread(positions: Position[]): number[] {
    const startLines = positions.map(pos => pos.startLine);
    return [Math.max(...startLines) - Math.min(...startLines)];
}

/**
 * Column Spread:
 *
 * Measure the span of the positions as the difference between the
 * start column of the first position and the end column of the last position.
 * Add +1 if the positions span multiple lines.
 * @param positions
 */
function calculateColumnSpread(positions: Position[]): number[] {
    const sortedPositions = positions.sort((a, b) => {
        if (a.startLine !== b.startLine) return a.startLine - b.startLine;
        return a.startColumn - b.startColumn;
    });

    const first = sortedPositions[0];
    const last = sortedPositions[sortedPositions.length - 1];

    const columnDistance = Math.abs(first.startColumn - last.endColumn);
    const lineBreakPenalty = first.startLine === last.startLine ? 0 : 1;

    return [columnDistance + lineBreakPenalty];
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
function calculateLineDistancesToMedian(positions: Position[]): number[] {
    const startLines = positions.map(pos => pos.startLine).sort((a, b) => a - b);
    const median = startLines[Math.floor(startLines.length / 2)];
    return positions.map(pos => Math.abs(pos.startLine - median));
}

/**
 * Column Distances to Median:
 *
 * Calculate the distances of each position's column to the median column position,
 * considering the difference between the start and end columns.
 * Add +1 for line breaks when applicable.
 * @param positions
 */
function calculateColumnDistancesToMedian(positions: Position[]): number[] {
    const sortedPositions = positions.sort((a, b) => {
        if (a.startLine !== b.startLine) return a.startLine - b.startLine;
        return a.startColumn - b.startColumn;
    });

    // Calculate median start column
    const startColumns = sortedPositions.map(pos => pos.startColumn);
    const endColumns = sortedPositions.map(pos => pos.endColumn);
    const medianStart = startColumns[Math.floor(startColumns.length / 2)];
    const medianEnd = endColumns[Math.floor(endColumns.length / 2)];

    return positions.map(pos => {
        const distanceToStart = Math.abs(pos.startColumn - medianStart);
        const distanceToEnd = Math.abs(pos.endColumn - medianEnd);

        const columnDistance = Math.min(distanceToStart, distanceToEnd); // Closer of the two
        const lineBreakPenalty = pos.startLine === sortedPositions[Math.floor(startColumns.length / 2)].startLine ? 0 : 1;
        return columnDistance + lineBreakPenalty;
    });
}

function adjustPositionForModifiersTypeAndDelimiters(
    position: Position,
    modifiers: string[] | undefined,
    fullyQualifiedType: string,
    variableName: string,
    adjustForModifiersAndTypes: boolean,
    adjustForDelimiters: boolean,
    isFirst: boolean
): Position {
    if(!adjustForModifiersAndTypes && !adjustForDelimiters){
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
    adjustForDelimiters: boolean
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
                adjustForDelimiters,
                isFirst
            )
        }
    );
}



function getFixedAdjustedPositions(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[], adjustForTypeModifier: boolean, adjustForDelimiters: boolean): Position[] {
    const sortedVariables = sortVariablesByPosition(variables);
    const positions = adjustPositionsForModifiersAndType(sortedVariables, adjustForTypeModifier, adjustForDelimiters);
    return fixSortedAdjustedPositions(positions);
}

export function getFixedAdjustedPositionFromDataClumpTypeContext(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[], adjustForTypeModifier: boolean, adjustForDelimiters: boolean): Position[] {
    return getFixedAdjustedPositions(variables, adjustForTypeModifier, adjustForDelimiters);
}


function calculateFieldDistances(
    variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[],
    adjustForModifiersAndDelimiters: boolean
): { pairwise: number[]; spread: number[]; toMedian: number[] } {
    let positions = getFixedAdjustedPositionFromDataClumpTypeContext(variables, adjustForModifiersAndDelimiters, adjustForModifiersAndDelimiters);

    return {
        pairwise: calculateLinePairwiseDistances(positions),
        spread: calculateLineSpread(positions),
        toMedian: calculateLineDistancesToMedian(positions)
    };
}


function calculateParameterDistances(
    variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[],
    adjustForModifiersAndDelimiters: boolean
): { pairwise: number[]; spread: number[]; toMedian: number[] } {
    // Extract parameters from the data clump

    let adjustedPositions = getFixedAdjustedPositionFromDataClumpTypeContext(variables, adjustForModifiersAndDelimiters, adjustForModifiersAndDelimiters);

    return {
        pairwise: calculateColumnPairwiseDistances(adjustedPositions),
        spread: calculateColumnSpread(adjustedPositions),
        toMedian: calculateColumnDistancesToMedian(adjustedPositions)
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

export function calculateVariableLengths(positions: Position[]): number[] {
    return positions.map(calculateVariableLength);
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "import textwrap\n" +
        "from numpy import nan\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "matplotlib.rcParams.update({'font.size': 18})\n" +
        "NaN = nan\n" +
        "";

    let fields_distance_pairwise: number[] = [];
    let fields_distance_spread: number[] = [];
    let fields_distance_to_median: number[] = [];

    let parameters_distance_with_delimiters_pairwise: number[] = [];
    let parameters_distance_with_delimiters_spread: number[] = [];
    let parameters_distance_with_delimiters_to_median: number[] = [];
    let parameters_distance_without_delimiters_pairwise: number[] = [];
    let parameters_distance_without_delimiters_spread: number[] = [];
    let parameters_distance_without_delimiters_to_median: number[] = [];

    let parameter_length_with_type_and_modifiers: number[] = [];
    let parameter_length_without_type_and_modifiers: number[] = [];


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
                    // skip


                    //if(!parameter_data_clump_found){
                        //console.log("Analysing data clump: "+data_clump_key+" - "+data_clump_type);
                        const variables = Object.values(data_clump.data_clump_data);

                        let parameters_distance_with_delimiters = calculateParameterDistances(variables, true);
                        parameters_distance_with_delimiters_pairwise.push(...parameters_distance_with_delimiters.pairwise);
                        parameters_distance_with_delimiters_spread.push(...parameters_distance_with_delimiters.spread);
                        parameters_distance_with_delimiters_to_median.push(...parameters_distance_with_delimiters.toMedian);

                        let parameters_distance_without_delimiters = calculateParameterDistances(variables, false);
                        parameters_distance_without_delimiters_pairwise.push(...parameters_distance_without_delimiters.pairwise);
                        parameters_distance_without_delimiters_spread.push(...parameters_distance_without_delimiters.spread);
                        parameters_distance_without_delimiters_to_median.push(...parameters_distance_without_delimiters.toMedian);
                    //}

                    const adjustForDelimiters = false;
                    let positionsWithTypes = getFixedAdjustedPositionFromDataClumpTypeContext(variables, true, adjustForDelimiters);
                    let positionsWithoutTypes = getFixedAdjustedPositionFromDataClumpTypeContext(variables, false, adjustForDelimiters);
                    parameter_length_with_type_and_modifiers.push(...calculateVariableLengths(positionsWithTypes));
                    parameter_length_without_type_and_modifiers.push(...calculateVariableLengths(positionsWithoutTypes));

                    //parameter_data_clump_found = true;
                } else if(data_clump_type === "fields_to_fields_data_clump"){
                    //console.log("Analysing data clump: "+data_clump_key+" - "+data_clump_type);

                    //if(!field_data_clump_found){
                        //console.log("Analysing data clump: "+data_clump_key+" - "+data_clump_type);
                    const variables = Object.values(data_clump.data_clump_data);

                        let fields_distances = calculateFieldDistances(variables, false);
                        fields_distance_pairwise.push(...fields_distances.pairwise);
                        fields_distance_spread.push(...fields_distances.spread);
                        fields_distance_to_median.push(...fields_distances.toMedian);
                        //console.log("Fields distances")
                        //console.log(fields_distances)
                    //}

                    //field_data_clump_found = true;
                } else if(data_clump_type === "parameters_to_fields_data_clump"){
                    // Special case, we need to analyse both fields and parameters

                    let parameters = Object.values(data_clump.data_clump_data);
                    let fields: DataClumpsVariableToContext[] = [];
                    for(let variable_key in data_clump_data){
                        let parameter_from = data_clump_data[variable_key];
                        let field_to = parameter_from.to_variable
                        fields.push(field_to);
                    }

                    let parameters_distance_with_delimiters = calculateParameterDistances(parameters, true);
                    parameters_distance_with_delimiters_pairwise.push(...parameters_distance_with_delimiters.pairwise);
                    parameters_distance_with_delimiters_spread.push(...parameters_distance_with_delimiters.spread);
                    parameters_distance_with_delimiters_to_median.push(...parameters_distance_with_delimiters.toMedian);

                    let parameters_distance_without_delimiters = calculateParameterDistances(parameters, false);
                    parameters_distance_without_delimiters_pairwise.push(...parameters_distance_without_delimiters.pairwise);
                    parameters_distance_without_delimiters_spread.push(...parameters_distance_without_delimiters.spread);
                    parameters_distance_without_delimiters_to_median.push(...parameters_distance_without_delimiters.toMedian);

                    const adjustForDelimiters = false;
                    let positionsWithTypes = getFixedAdjustedPositionFromDataClumpTypeContext(parameters, true, adjustForDelimiters);
                    let positionsWithoutTypes = getFixedAdjustedPositionFromDataClumpTypeContext(parameters, false, adjustForDelimiters);
                    parameter_length_with_type_and_modifiers.push(...calculateVariableLengths(positionsWithTypes));
                    parameter_length_without_type_and_modifiers.push(...calculateVariableLengths(positionsWithoutTypes));


                    let fields_distance_with_modifiers = calculateFieldDistances(fields, false);
                    fields_distance_pairwise.push(...fields_distance_with_modifiers.pairwise);
                    fields_distance_spread.push(...fields_distance_with_modifiers.spread);
                    fields_distance_to_median.push(...fields_distance_with_modifiers.toMedian);

                }
            }
        }

    }

    function calculateAndPrintDistanceStatistic(analysis_name: string, values: number[]){
        let values_amount = values.length;
        let values_sum = 0;
        let value_max = 0;
        let value_min = 0;
        let value_median = 0;
        let sorted_values = values.sort((a, b) => a - b);
        let value_median_index = Math.floor(values_amount / 2);
        value_median = sorted_values[value_median_index];
        for(let i = 0; i < values_amount; i++){
            let value = values[i];
            values_sum += value;
            if(value > value_max){
                value_max = value;
            }
            if(value < value_min){
                value_min = value;
            }
        }
        console.log("SUMMARY FOR: "+analysis_name);
        console.log("Values amount: "+values_amount);
        console.log("Values sum: "+values_sum);
        console.log("Values average: "+values_sum/values_amount);
        console.log("Values max: "+value_max);
        console.log("Values min: "+value_min);
        console.log("Values median: "+value_median);
        console.log("-------------")
    }

    console.log("Start analysing distances");

    let analysis_objects = {
        "fields_pairwise": fields_distance_pairwise,
        "fields_spread": fields_distance_spread,
        "fields_to_median": fields_distance_to_median,
        "parameters_with_delimiters_pairwise": parameters_distance_with_delimiters_pairwise,
        "parameters_with_delimiters_spread": parameters_distance_with_delimiters_spread,
        "parameters_with_delimiters_to_median": parameters_distance_with_delimiters_to_median,
        "parameters_without_delimiters_pairwise": parameters_distance_without_delimiters_pairwise,
        "parameters_without_delimiters_spread": parameters_distance_without_delimiters_spread,
        "parameters_without_delimiters_to_median": parameters_distance_without_delimiters_to_median,
        "parameter_length_with_type_and_modifiers": parameter_length_with_type_and_modifiers,
        "parameter_length_without_type_and_modifiers": parameter_length_without_type_and_modifiers
    }

    let anylsis_keys = Object.keys(analysis_objects);
    for(let i = 0; i < anylsis_keys.length; i++){
        let analysis_name = anylsis_keys[i];
        let values = analysis_objects[analysis_name];
        calculateAndPrintDistanceStatistic(analysis_name, values);
        fileContent += AnalyseHelper.getValuesFor("values_"+analysis_name, values);
    }

    fileContent += "all_data = {}\n";
    for (let i = 0; i < anylsis_keys.length; i++) {
        let analysis_name = anylsis_keys[i];
        fileContent += "all_data['" + analysis_name + "'] = " + "values_"+analysis_name + "\n";
    }
    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += "\n";
    fileContent += "fig, ax1 = plt.subplots()\n";
    fileContent += "plt.boxplot(data)\n";
    fileContent += "ax1.set(ylabel='Distance Line/Column')\n";
    // Replace underscores with spaces in labels
    fileContent += "wrapped_labels = ['\\n'.join(textwrap.wrap(label.replace('_', ' '), width=15)) for label in labels]\n";
    fileContent += "plt.xticks(range(1, len(labels) + 1), wrapped_labels)\n";
    // Set the visible y-axis range
    fileContent += "ax1.set_ylim([0, 100])\n"; // Adjust range to your desired limits

    fileContent += "plt.subplots_adjust(left=0.15, right=0.95, top=0.98, bottom=0.20)\n"; // Adjust bottom for better label display
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

