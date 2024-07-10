#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";

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
    .option('--report_folder <path>', 'Report path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
    .option('--output <path>', 'Output path for script', current_working_directory+'/DataClumpsClusterDistribution.py') // Default value is './data-clumps.json'

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

function countDataClumpsGroups(data_clumps_dict){
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
    let groupSizes: any = [];

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

    let group_keys = Object.keys(graph);
    for(let i = 0; i < group_keys.length; i++){
        let node = group_keys[i];
        if(!visited[node]){
            let groupSize: number = dfs(node);
            groupSizes.push(groupSize);
        }
    }

    let singleNodeGroups = 0;
    let twoNodeGroups = 0;
    let largerGroups = 0;

    for(let i = 0; i < groupSizes.length; i++){
        if(groupSizes[i] === 1){
            singleNodeGroups++;
        } else if(groupSizes[i] === 2){
            twoNodeGroups++;
        } else {
            largerGroups++;
        }
    }

    return {
        singleNodeGroups: singleNodeGroups,
        twoNodeGroups: twoNodeGroups,
        largerGroups: largerGroups
    };
}

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

            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file);

            let data_clumps_dict = report_file_json?.data_clumps;
            let groups = countDataClumpsGroups(data_clumps_dict)

            let singleNodeGroups = groups.singleNodeGroups;

            let twoNodeGroups = groups.twoNodeGroups;

            let largerGroups = groups.largerGroups;

            let amountGroups = singleNodeGroups + twoNodeGroups + largerGroups;
            if(amountGroups>0){
                let singleNodeGroupsPercentage = (singleNodeGroups / amountGroups) * 100;
                singleNodeGroupsPercentage = parseFloat(singleNodeGroupsPercentage.toFixed(2))

                let twoNodeGroupsPercentage = (twoNodeGroups / amountGroups) * 100;
                twoNodeGroupsPercentage = parseFloat(twoNodeGroupsPercentage.toFixed(2))

                let largerGroupsPercentage = (largerGroups / amountGroups) * 100;
                largerGroupsPercentage = parseFloat(largerGroupsPercentage.toFixed(2))

                data_clumps_cluster_distribution.singleNodeGroups.push(singleNodeGroupsPercentage);
                data_clumps_cluster_distribution.twoNodeGroups.push(twoNodeGroupsPercentage);
                data_clumps_cluster_distribution.largerGroups.push(largerGroupsPercentage);
            }
    }

    console.log("Generating python file to generate boxplot ...")

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "from numpy import nan\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "matplotlib.rcParams.update({'font.size': 18})" +
        "NaN = nan\n" +
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
    fileContent += "ax1.set(ylabel='Percentage of Data Clumps Groups')\n"
    fileContent += "plt.xticks(range(1, len(labels) + 1), labels)\n"
    fileContent += "plt.subplots_adjust(left=0.15, right=0.95, top=0.98, bottom=0.10)\n"
    fileContent += "fig.set_size_inches(6, 4, forward=True)\n"
    fileContent += "fig.set_dpi(200)\n"
    fileContent += "plt.show()\n"

    return fileContent;

}

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

