#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const debugNumber = 63845
let debug = false

const program = new Command();

const current_working_directory = process.cwd();

program
    .description('Analyse Detected Data-Clumps\n\n' +
        'This script performs data clumps detection in a given directory.\n\n' +
        'npx data-clumps-doctor [options] <path_to_folder>')
    .version(version)
    .option('--report_folder <path>', 'Report path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
    .option('--output <path>', 'Output path for script', current_working_directory+'/GenerateDataClumpsClusterToAmountDataClumpsDistributionForBoxplots.py') /**
 * Retrieves all report files recursively in the specified folder.
 * 
 * @param folder_path The path of the folder to search for report files.
 * @returns An array containing the paths of all report files found.
 * @throws Throws an error if the specified folder_path is invalid or inaccessible.
 */
// Default value is './data-clumps.json'

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
 * Counts the amount of data clumps groups and their sizes.
 * 
 * @param data_clumps_dict - The dictionary containing data clumps information.
 * @returns An object containing the amount of single node groups, two node groups, and larger groups.
 * @throws {Error} - If the data_clumps_dict is not provided or is not a valid dictionary.
 */
function countDataClumpsGroupsToAmountDataClumps(data_clumps_dict){
    if(debug) console.log("countDataClumpsGroupsToAmountDataClumps")

    if(debug) console.log("get keys")
    let data_clumps_keys = Object.keys(data_clumps_dict);

    let graph = {};
    if(debug) console.log("create graph")
    for(let j = 0; j < data_clumps_keys.length; j++){
        let data_clump_key = data_clumps_keys[j];
        let data_clump = data_clumps_dict[data_clump_key];
        let to_class = data_clump.to_class_or_interface_key;
        let from_class = data_clump.from_class_or_interface_key;

        if(graph[from_class] === undefined){
            graph[from_class] = {};
        }
        if(graph[to_class] === undefined){
            graph[to_class] = {};
        }
        graph[from_class][to_class] = true;
        graph[to_class][from_class] = true;  // Assuming the graph is undirected
    }

    if(debug) console.log(JSON.stringify(graph, null, 2));

    
    let class_belongs_to_group = {};
    let group_has_amount_nodes = {};

    /**
     * Calculates the depth-first search (DFS) for the given data clumps.
     * 
     * @throws {Error} Throws an error if there is an issue with the data clumps.
     */
    function calcDfs(){
        let latest_group_number = 1;
        for(let j = 0; j < data_clumps_keys.length; j++) {
            let data_clump_key = data_clumps_keys[j];
            let data_clump = data_clumps_dict[data_clump_key];
            let from_class = data_clump.from_class_or_interface_key;
            let node = from_class;
            let group_number = class_belongs_to_group[node];
            if(!group_number){ // if we have no group number yet, we choose the latest
                class_belongs_to_group[node] = latest_group_number;
                let neighbors_dict = graph[node];
                let neighbors = Object.keys(neighbors_dict);
                for(let i=0; i<neighbors.length; i++){ // since we had no number yet, this means our neighbors dont have one too.
                    let neighbor = neighbors[i];
                    class_belongs_to_group[neighbor] = latest_group_number;
                }
                latest_group_number++; // increase the amount of groups found
            }
        }

        // calc now the amount of nodes in each group
        let nodes_keys = Object.keys(class_belongs_to_group);
        for(let j = 0; j < nodes_keys.length; j++) {
            let node_key = nodes_keys[j];
            let group_number = class_belongs_to_group[node_key];
            let amount_nodes_in_group = group_has_amount_nodes[group_number] || 0;
            amount_nodes_in_group++;
            group_has_amount_nodes[group_number] = amount_nodes_in_group
        }

    }

    /**
     * Perform a depth-first search to calculate the number of nodes belonging to the same group.
     * @param node The node for which to perform the depth-first search.
     * @returns The number of nodes belonging to the same group as the input node.
     * @throws {Error} Throws an error if the input node is invalid or if there is an issue with the group data.
     */
    function dfs(node): number {
        let group_number = class_belongs_to_group[node];
        let number_of_nodes_belong_together = group_has_amount_nodes[group_number];
        return number_of_nodes_belong_together
    }

    calcDfs();

    let singleNodeGroups_amount_data_clumps = 0;
    let twoNodeGroups_amount_data_clumps = 0;
    let largerGroups_amount_data_clumps = 0;

    if(debug) console.log("start visit for all keys")
    for(let j = 0; j < data_clumps_keys.length; j++) {
        if(debug) console.log("j: "+j+"/"+data_clumps_keys.length)
        let data_clump_key = data_clumps_keys[j];
        let data_clump = data_clumps_dict[data_clump_key];
        let from_class = data_clump.from_class_or_interface_key;
        let to_class = data_clump.to_class_or_interface_key;
        let different_class = from_class !== to_class;
        let node = from_class;
        let groupSize: number = dfs(node);
        let data_clump_type = data_clump.data_clump_type;
        if(debug) console.log("groupSize: "+groupSize+" - different_class: "+different_class+" - from_class: "+from_class+" --> to_class: "+to_class+" - data_clump_type: "+data_clump_type);
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
 * @param listOfValues - The list of values for which the median needs to be calculated
 * @returns The median value of the list
 * @throws {TypeError} - If listOfValues is not an array
 */
function getMedian(listOfValues){
    // Sort the list of values
    let sortedValues = [...listOfValues].sort((a, b) => a - b);

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
 * @param nameOfVariable - The name of the variable for which values are being retrieved.
 * @param listOfValues - The list of values for the variable.
 * @returns A formatted string containing the median and values for the variable.
 * @throws Error if the list of values is empty.
 */
function getValuesFor(nameOfVariable, listOfValues){
    let fileContent = "";
    let median = getMedian(listOfValues);
    console.log("Median for "+nameOfVariable+": "+median)
    fileContent += "\n";
    fileContent += "# "+nameOfVariable+"_median = "+median+"\n";
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
 * Counts the data clumps cluster distribution based on the provided report files paths.
 * @param all_report_files_paths An array of paths to the report files.
 * @throws Error if there is an issue processing the report files or generating the python file.
 */
function printDataClumpsClusterDistribution(all_report_files_paths){

    console.log("Counting data clumps cluster distribution ...")

    let data_clumps_cluster_distribution: any = {
        singleNodeGroups: [],
        twoNodeGroups: [],
        largerGroups: []
    };

    for(let i = 0; i < all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        console.log("Processing report_file_path: "+i+" with "+all_report_files_paths.length+" report files")
        debug = i==debugNumber

        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json = JSON.parse(report_file);

        let data_clumps_dict = report_file_json?.data_clumps;
        let groups = countDataClumpsGroupsToAmountDataClumps(data_clumps_dict)
        let singleNodeGroups_amount_data_clumps = groups.singleNodeGroups_amount_data_clumps;

        let twoNodeGroups_amount_data_clumps = groups.twoNodeGroups_amount_data_clumps;

        let largerGroups_amount_data_clumps = groups.largerGroups_amount_data_clumps;

        let amountDataClumps = singleNodeGroups_amount_data_clumps + twoNodeGroups_amount_data_clumps + largerGroups_amount_data_clumps;

        if(amountDataClumps>0){
            let singleNodeGroupsPercentage = (singleNodeGroups_amount_data_clumps / amountDataClumps) * 100;
            singleNodeGroupsPercentage = parseFloat(singleNodeGroupsPercentage.toFixed(2))

            let twoNodeGroupsPercentage = (twoNodeGroups_amount_data_clumps / amountDataClumps) * 100;
            twoNodeGroupsPercentage = parseFloat(twoNodeGroupsPercentage.toFixed(2))

            let largerGroupsPercentage = (largerGroups_amount_data_clumps / amountDataClumps) * 100;
            largerGroupsPercentage = parseFloat(largerGroupsPercentage.toFixed(2))

            data_clumps_cluster_distribution.singleNodeGroups.push(singleNodeGroupsPercentage);
            data_clumps_cluster_distribution.twoNodeGroups.push(twoNodeGroupsPercentage);
            data_clumps_cluster_distribution.largerGroups.push(largerGroupsPercentage);
        }
        if(debug) console.log("Proceed to next")
    }

    console.log("Generating python file to generate boxplot ...")

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "matplotlib.rcParams.update({'font.size': 18})\n" +
        "\n" +
        "";

    fileContent += getValuesFor("singleNodeGroups", data_clumps_cluster_distribution.singleNodeGroups);
    fileContent += getValuesFor("twoNodeGroups", data_clumps_cluster_distribution.twoNodeGroups);
    fileContent += getValuesFor("largerGroups", data_clumps_cluster_distribution.largerGroups);

    fileContent += "all_data = {}\n"
    fileContent += "all_data['Type 1'] = singleNodeGroups\n"
    fileContent += "all_data['Type 2'] = twoNodeGroups\n"
    fileContent += "all_data['Type 3'] = largerGroups\n"
    fileContent += "\n"
    fileContent += "labels, data = all_data.keys(), all_data.values()\n"
    fileContent += "\n"
    fileContent += "fig, ax1 = plt.subplots()\n"
    fileContent += "plt.boxplot(data)\n"
    fileContent += "ax1.set(ylabel='Percentage of Data Clumps')\n"
    fileContent += "plt.xticks(range(1, len(labels) + 1), labels)\n"
    fileContent += "plt.subplots_adjust(left=0.15, right=0.95, top=0.98, bottom=0.10)\n"
    fileContent += "fig.set_size_inches(6, 4, forward=True)\n"
    fileContent += "fig.set_dpi(200)\n"
    fileContent += "plt.show()\n"

    return fileContent;

}

/**
 * Asynchronously analyses the report folder with the specified options.
 * @param {string} report_folder - The path to the report folder to be analysed.
 * @param {any} options - The options for the analysis.
 * @throws {Error} - If the specified path to the report folder does not exist.
 * @returns {Promise<string>} - A promise that resolves with the content of the analysis.
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
 * @throws {Error} Throws an error if any exception occurs during the execution.
 */
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

