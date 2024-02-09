#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
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
    .option('--report_folder <path>', 'Report path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') /**
 * Retrieves all report files recursively in the specified folder path.
 * 
 * @param folder_path The path of the folder to search for report files.
 * @returns An array containing the paths of all report files found in the specified folder and its subfolders.
 * @throws Throws an error if there is an issue with reading the directory or file system operations.
 */
// Default value is './data-clumps.json'
//    .option('--output <path>', 'Output path for script', current_working_directory+'/GenerateDataClumpsClusterToAmountDataClumpsDistributionForBoxplots.py') // Default value is './data-clumps.json'

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
 * Counts the amount of data clumps groups and classifies them into single node groups, two node groups, and larger groups.
 * 
 * @param data_clumps_dict - A dictionary containing data clumps with keys as the class or interface key and values as the data clump information.
 * 
 * @returns An object containing the count of single node groups, two node groups, and larger groups of data clumps.
 * 
 * @throws {TypeError} - If the input data_clumps_dict is not a valid dictionary.
 */
function countDataClumpsGroupsToAmountDataClumps(data_clumps_dict){
    let data_clumps_keys = Object.keys(data_clumps_dict);

    let graph = {};
    for(let j = 0; j < data_clumps_keys.length; j++){
        let data_clump_key = data_clumps_keys[j];
        let data_clump = data_clumps_dict[data_clump_key];
        let to_class = data_clump.to_class_or_interface_key;
        let from_class = data_clump.from_class_or_interface_key;

        if(graph[from_class] === undefined){
            graph[from_class] = [];
        }
        if(graph[to_class] === undefined){
            graph[to_class] = [];
        }
        graph[from_class].push(to_class);
        graph[to_class].push(from_class);  // Assuming the graph is undirected
    }

    let visited = {};
    /**
     * Perform a depth-first search to calculate the size of a group of connected nodes.
     * @param node The starting node for the depth-first search.
     * @returns The size of the group of connected nodes.
     * @throws {Error} If the node is not found in the graph.
     */
    function dfs(node): number {
        visited[node] = true;
        let neighbors = graph[node];
        let groupSize = 1;  // Start with 1 to count the current node
        for(let i = 0; i < neighbors.length; i++){
            let neighbor = neighbors[i];
            if(!visited[neighbor]){
                groupSize += dfs(neighbor);  // Accumulate the size from each connected node
            }
        }
        return groupSize;
    }

    let singleNodeGroups_amount_data_clumps = 0;
    let twoNodeGroups_amount_data_clumps = 0;
    let largerGroups_amount_data_clumps = 0;


    for(let j = 0; j < data_clumps_keys.length; j++) {
        let data_clump_key = data_clumps_keys[j];
        let data_clump = data_clumps_dict[data_clump_key];
        let from_class = data_clump.from_class_or_interface_key;
        let node = from_class;
        let groupSize: number = dfs(node);
        if(groupSize === 1){
            singleNodeGroups_amount_data_clumps++;
        } else if(groupSize === 2){
            twoNodeGroups_amount_data_clumps++;
        } else {
            largerGroups_amount_data_clumps++;
        }
    }

    return {
        singleNodeGroups_amount_data_clumps: singleNodeGroups_amount_data_clumps,
        twoNodeGroups_amount_data_clumps: twoNodeGroups_amount_data_clumps,
        largerGroups_amount_data_clumps: largerGroups_amount_data_clumps
    };
}

/**
 * Calculate the median of a list of values
 * @param listOfValues - The list of values for which to calculate the median
 * @returns The median value of the list
 * @throws {Error} If the list of values is empty
 */
function getMedian(listOfValues){
    // Sort the list of values
    let sortedValues = [...listOfValues].sort((a, b) => a - b);

    let lowestValue = sortedValues[0];
    let highestValue = sortedValues[sortedValues.length - 1];
    console.log("Lowest amount data clumps variables: "+lowestValue)
    console.log("Highest amount data clumps variables: "+highestValue)

    let amountSingleGroups = listOfValues.length

    // Calculate the median
    let median;
    if (amountSingleGroups % 2 === 0) {
        // If even, average the two middle values
        median = (sortedValues[amountSingleGroups / 2 - 1] + sortedValues[amountSingleGroups / 2]) / 2;
    } else {
        // If odd, take the middle value
        median = sortedValues[Math.floor(amountSingleGroups / 2)];
    }
    return median;
}

/**
 * Retrieves values for a given variable and list of values.
 * 
 * @param nameOfVariable - The name of the variable.
 * @param listOfValues - The list of values for the variable.
 * @returns A string containing the file content.
 * @throws Error if the list of values is empty.
 */
function getValuesFor(nameOfVariable, listOfValues){
    let fileContent = "";
    let median = getMedian(listOfValues);
    console.log("Median for "+nameOfVariable+": "+median)
    fileContent += "\n";
    fileContent += +"# "+nameOfVariable+"_median = "+median+"\n";
    fileContent += nameOfVariable+"= [\n";
    let amountSingleGroups = listOfValues.length
    for(let i = 0; i < amountSingleGroups; i++){
        fileContent += "  "+listOfValues[i];
        if(i < amountSingleGroups - 1){
            fileContent += ",\n";
        }
    }
    fileContent += "\n";
    fileContent += "]\n";
    fileContent += "\n";

    return fileContent;
}

/**
 * Counts the data clumps cluster distribution based on the provided report file paths.
 * @param {string[]} all_report_files_paths - Array of paths to the report files
 * @throws {Error} - Throws an error if there is an issue processing the report files
 */
function printDataClumpsClusterDistribution(all_report_files_paths){

    console.log("Counting data clumps cluster distribution ...")

    let total_amount_data_clumps = 0;
    let total_amount_parameter_to_parameter_data_clumps = 0;
    let total_amount_parameter_to_fields_data_clumps = 0;
    let total_amount_fields_to_fields_data_clumps = 0;

    let amount_variables_in_data_clumps: any = [];

    for(let i = 0; i < all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        console.log("Processing report_file_path: "+i+" with "+all_report_files_paths.length+" report files")

            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

            let amount_data_clumps = report_file_json?.report_summary.amount_data_clumps || 0;
            total_amount_data_clumps += amount_data_clumps;

            let parameters_to_parameters_data_clump = report_file_json?.report_summary.parameters_to_parameters_data_clump || 0;
            total_amount_parameter_to_parameter_data_clumps += parameters_to_parameters_data_clump;

            let parameters_to_fields_data_clump = report_file_json?.report_summary.parameters_to_fields_data_clump || 0;
            total_amount_parameter_to_fields_data_clumps += parameters_to_fields_data_clump;

            let fields_to_fields_data_clump = report_file_json?.report_summary.fields_to_fields_data_clump || 0;
            total_amount_fields_to_fields_data_clumps += fields_to_fields_data_clump;

            let data_clumps = report_file_json?.data_clumps || {}
            let data_clumps_keys = Object.keys(data_clumps);
            for(let j = 0; j < data_clumps_keys.length; j++) {
                let data_clump_key = data_clumps_keys[j];
                let data_clump = data_clumps[data_clump_key];
                let data_clump_data = data_clump.data_clump_data
                let amount_variables = Object.keys(data_clump_data).length;
                amount_variables_in_data_clumps.push(amount_variables);
            }

    }

    console.log("total_amount_data_clumps: "+total_amount_data_clumps);
    console.log("total_amount_parameter_to_parameter_data_clumps: "+total_amount_parameter_to_parameter_data_clumps);
    console.log("total_amount_parameter_to_fields_data_clumps: "+total_amount_parameter_to_fields_data_clumps);
    console.log("total_amount_fields_to_fields_data_clumps: "+total_amount_fields_to_fields_data_clumps);
    let medianAmountVariablesInDataClumps = getMedian(amount_variables_in_data_clumps);
    console.log("medianAmountVariablesInDataClumps: "+medianAmountVariablesInDataClumps);




}

/**
 * Asynchronously analyses the report folder with the specified options.
 * @param {string} report_folder - The path to the report folder to be analysed.
 * @param {any} options - The options for the analysis.
 * @throws {Error} - If the specified path to the report folder does not exist.
 * @returns {Promise<string>} - A promise that resolves to the content of the analysed report.
 */
async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps-Clusters");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
    console.log("all_report_files_paths: "+all_report_files_paths.length);

    //printHistogram(sorted_timestamps, timestamp_to_file_paths);
    let filecontent = printDataClumpsClusterDistribution(all_report_files_paths);
    return filecontent;
}

/**
 * Asynchronous function to execute the main program.
 * 
 * @throws {Error} Throws an error if there is an issue with the execution of the main program.
 */
async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;
    let filecontent = await analyse(report_folder, options);

    /**
    let output = options.output;
    // delete output file if it exists
    if (fs.existsSync(output)) {
        fs.unlinkSync(output);
    }

    console.log("Writing output to file: "+output)
    fs.writeFileSync(output, filecontent);
     */

}

main();

