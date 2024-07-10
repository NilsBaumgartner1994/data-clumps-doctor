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
    .option('--report_folder <path>', 'Output path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
    .option('--output <path>', 'Output path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/'+Analyzer.project_commit_variable_placeholder+'.json') // Default value is './data-clumps.json'

function time_stamp_to_file_paths(report_folder){
    let all_report_files = fs.readdirSync(report_folder);
    console.log("Amount of files in folder: "+all_report_files.length);
    let all_report_files_paths: any = [];
    for (let i = 0; i < all_report_files.length; i++) {
        let report_file = all_report_files[i];
        if(report_file.endsWith(".json")){
            let report_file_path = path.join(report_folder, report_file);
            all_report_files_paths.push(report_file_path);
        }
    }
    console.log("Amount of report files: "+all_report_files_paths.length);

    console.log("Reading all report files and extracting data clumps amount per commit date");
    let timestamp_to_file_path = {};
    let time_start = new Date();
    for(let i = 0; i <all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let now = new Date();
        let time_diff = now.getTime() - time_start.getTime();
        let time_per_file = time_diff/(i+1);
        let time_left = time_per_file*(all_report_files_paths.length-(i+1));
        let time_running = time_diff;
        let time_left_hh_mm_ss = new Date(time_left).toISOString().substr(11, 8);
        let time_running_hh_mm_ss = new Date(time_running).toISOString().substr(11, 8);
        let file_name_with_extension = path.basename(report_file_path);
        console.log("parsing "+(i+1)+"/"+all_report_files_paths.length+" files | time estimated left: "+time_left_hh_mm_ss+" | time running: "+time_running_hh_mm_ss+" | file: "+file_name_with_extension);
        let report_file_json = JSON.parse(report_file);
        let project_commit_date = report_file_json?.project_info?.project_commit_date;
        project_commit_date = parseInt(project_commit_date); // unix timestamp
        if(timestamp_to_file_path[project_commit_date] === undefined){
            timestamp_to_file_path[project_commit_date] = [report_file_path]
        }
        else{
            timestamp_to_file_path[project_commit_date].push(report_file_path)
        }
    }

    console.log("Amount of timestamps: "+Object.keys(timestamp_to_file_path).length);

    return timestamp_to_file_path;
}

function getSortedTimestamps(timestamp_to_file_path){
    let sorted_timestamps = Object.keys(timestamp_to_file_path)
    return sorted_timestamps;
}


function getAllDataClumpsKeys(sorted_timestamps, timestamp_to_file_paths){
    let all_data_clump_keys = {};

    for(let i = 0; i < sorted_timestamps.length; i++){
        let report_file_paths = timestamp_to_file_paths[sorted_timestamps[i]];

        for(let j = 0; j < report_file_paths.length; j++){
            let report_file_path = report_file_paths[j];
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file);

            let data_clumps_dict = report_file_json?.data_clumps;
            let data_clumps_keys = Object.keys(data_clumps_dict);

            // check if data clump key is already in histogram and if not add it
            for(let j = 0; j < data_clumps_keys.length; j++){
                let data_clump_key = data_clumps_keys[j];

                all_data_clump_keys[data_clump_key] = true;
            }
        }

    }

    return all_data_clump_keys;
}

function printHistogram(sorted_timestamps, timestamp_to_file_paths){
    let all_data_clump_keys = getAllDataClumpsKeys(sorted_timestamps, timestamp_to_file_paths);
    let all_data_clump_keys_list = Object.keys(all_data_clump_keys);
    for(let i = 0; i < all_data_clump_keys_list.length; i++){
        let data_clump_key = all_data_clump_keys_list[i];

        let data_clump_print_string = "|";
        for(let j = 0; j < sorted_timestamps.length; j++){
            let timestamp = sorted_timestamps[j];
            let report_file_paths = timestamp_to_file_paths[timestamp];

            for(let report_file_path of report_file_paths){
                let report_file = fs.readFileSync(report_file_path, 'utf8');
                let report_file_json = JSON.parse(report_file);

                let data_clumps_dict = report_file_json?.data_clumps;

                let print_string = "";

                if(data_clumps_dict[data_clump_key]){ // data clump key is in current time frame
                    print_string = "X";
                } else {
                    print_string = " ";
                }
                data_clump_print_string += print_string;
            }

        }
        console.log(data_clump_print_string);
    }
}


function countDataClumpsGroups(data_clumps_dict){
    let data_clumps_keys = Object.keys(data_clumps_dict);

    let graph = {};
    for(let j = 0; j < data_clumps_keys.length; j++){
        let data_clump_key = data_clumps_keys[j];
        let data_clump = data_clumps_dict[data_clump_key];
        let to_file_path = data_clump.to_file_path;
        let from_file_path = data_clump.from_file_path;

        if(graph[from_file_path] === undefined){
            graph[from_file_path] = [];
        }
        if(graph[to_file_path] === undefined){
            graph[to_file_path] = [];
        }
        graph[from_file_path].push(to_file_path);
        graph[to_file_path].push(from_file_path);  // Assuming the graph is undirected
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


function project_commit_dateToDate(project_commit_date){
    try{
        let date = new Date(project_commit_date*1000);
        // date to string
        let date_string = date.toISOString().slice(0,10);
        return date_string;
    } catch (err){
        console.log("Error: "+err);
        console.log("project_commit_date: "+project_commit_date);
        return project_commit_date;
    }
}

function printTableHeader(rowPrintOptions){
    let rowPrintOptionsKeys = Object.keys(rowPrintOptions);
    let header = "";
    for(let i = 0; i < rowPrintOptionsKeys.length; i++){
        let rowPrintOptionKey = rowPrintOptionsKeys[i];
        let rowPrintOption = rowPrintOptions[rowPrintOptionKey];
        if(rowPrintOption.display){
            header += rowPrintOption.title.padEnd(rowPrintOption.width, " ");
        }
    }
    console.log(header);
}

function printTableRow(rowPrintOptions, row){
    let rowPrintOptionsKeys = Object.keys(rowPrintOptions);
    let row_string = "";
    for(let i = 0; i < rowPrintOptionsKeys.length; i++){
        let rowPrintOptionKey = rowPrintOptionsKeys[i];
        let rowPrintOption = rowPrintOptions[rowPrintOptionKey];
        if(rowPrintOption.display){
            let value = row[rowPrintOptionKey];
            if(value === undefined){
                value = "";
            }
            let padChar = " ";
            let padLength = rowPrintOption.width;
            if(rowPrintOption.title.length > rowPrintOption.width){
                padLength = rowPrintOption.title.length;
            }

            let missingChars = padLength - value.toString().length;

            if(rowPrintOption.alignment === 'left'){
                value = value.toString() + padChar.repeat(missingChars);
            } else if(rowPrintOption.alignment === 'right'){
                value = padChar.repeat(missingChars) + value.toString();
            }
            row_string += value;
        }
    }
    console.log(row_string);
}

function printAmountDataClumpsOverTime(sorted_timestamps, timestamp_to_file_paths){

    let rowPrintOptions = {
        date_string: {
            width: "1004020656XX".length,
            alignment: 'left',
            title: 'Date',
            display: true
        },
        project_tag: {
            width: "Xerces-J_2_10_0-xml-schema-1.1-beta2".length,
            alignment: 'left',
            title: 'Tag',
            display: true
        },
        amount_data_clumps: {
            width: 10,
            alignment: 'right',
            title: '# DC',
            display: true
        },
        number_of_classes_or_interfaces: {
            width: 10,
            alignment: 'right',
            title: '# Classes or Interfaces',
            display: true
        },
        number_of_methods: {
            width: 10,
            alignment: 'right',
            title: '# Methods',
            display: true
        },
        number_of_data_fields: {
            width: 10,
            alignment: 'right',
            title: '# Data Fields',
            display: true
        },
        number_of_method_parameters: {
            width: 10,
            alignment: 'right',
            title: '# Method Parameters',
            display: true
        },
        singleNodeGroups: {
            width: 10,
            alignment: 'right',
            title: '# Single Node Groups',
            display: true
        },
        twoNodeGroups: {
            width: 10,
            alignment: 'right',
            title: '# Two Node Groups',
            display: true
        },
        largerGroups: {
            width: 10,
            alignment: 'right',
            title: '# Larger Groups',
            display: true
        },
        amountGroups: {
            width: 10,
            alignment: 'right',
            title: '# DC Groups',
            display: true
        },
    }

    printTableHeader(rowPrintOptions);

    for(let i = 0; i < sorted_timestamps.length; i++){
        let report_file_paths = timestamp_to_file_paths[sorted_timestamps[i]];

        for(let j = 0; j < report_file_paths.length; j++){
            let report_file_path = report_file_paths[j];

            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file);

            let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps;
            let project_commit_date = parseInt(report_file_json?.project_info?.project_commit_date);
            let project_commit_hash = report_file_json?.project_info?.project_commit_hash;

            let date_string: any = project_commit_dateToDate(project_commit_date);
            //date_string = project_commit_date;

            let project_tag = report_file_json?.project_info?.project_tag;
            // pad project_tag with spaces to make it 10 characters long
            project_tag = project_tag.padEnd(35, "_");

            let number_of_classes_or_interfaces = report_file_json?.project_info?.number_of_classes_or_interfaces;
            let number_of_methods = report_file_json?.project_info?.number_of_methods;
            let number_of_data_fields = report_file_json?.project_info?.number_of_data_fields;
            let number_of_method_parameters = report_file_json?.project_info?.number_of_method_parameters;

            let data_clumps_dict = report_file_json?.data_clumps;
            let groups = countDataClumpsGroups(data_clumps_dict)
            let singleNodeGroups = groups.singleNodeGroups;
            let twoNodeGroups = groups.twoNodeGroups;
            let largerGroups = groups.largerGroups;

            let amountGroups = singleNodeGroups + twoNodeGroups + largerGroups;

            let rowInfo = {
                date_string: date_string,
                project_tag: project_tag,
                amount_data_clumps: amount_data_clumps,
                number_of_classes_or_interfaces: number_of_classes_or_interfaces,
                number_of_methods: number_of_methods,
                number_of_data_fields: number_of_data_fields,
                number_of_method_parameters: number_of_method_parameters,
                singleNodeGroups: singleNodeGroups,
                twoNodeGroups: twoNodeGroups,
                largerGroups: largerGroups,
                amountGroups: amountGroups
            }

            printTableRow(rowPrintOptions, rowInfo);

        }
    }
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let timestamp_to_file_paths = time_stamp_to_file_paths(report_folder);
    let sorted_timestamps = getSortedTimestamps(timestamp_to_file_paths);
    console.log("sorted_timestamps: "+sorted_timestamps.length);

    //printHistogram(sorted_timestamps, timestamp_to_file_paths);
    printAmountDataClumpsOverTime(sorted_timestamps, timestamp_to_file_paths);


}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;



    await analyse(report_folder, options);
}

main();

