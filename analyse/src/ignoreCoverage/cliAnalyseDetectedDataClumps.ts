#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {AnalyseHelper} from "./AnalyseHelper";

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

function printAmountDataClumpsOverTime(sorted_report_file_paths: string[]){

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

    for(let i = 0; i < sorted_report_file_paths.length; i++){
        let report_file_path = sorted_report_file_paths[i];
        let report_file_json = AnalyseHelper.getReportFileJson(report_file_path)

        let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps;
        let date_string: any = AnalyseHelper.getDateFromDataClumpsContext(report_file_json)?.toISOString();

        let project_tag = report_file_json?.project_info?.project_tag;
        // pad project_tag with spaces to make it 10 characters long
        if(!!project_tag){
            project_tag = project_tag.padEnd(35, "_");
        }

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

async function analyse(report_project_folder_path, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_project_folder_path)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_project_folder_path);
        process.exit(1);
    }

    let sorted_report_file_paths = AnalyseHelper.getSortedReportFilePathsByTimestamps(report_project_folder_path);

    //printHistogram(sorted_timestamps, timestamp_to_file_paths);
    printAmountDataClumpsOverTime(sorted_report_file_paths);


}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDetectedDataClumps",
    })

    const report_folder = options.report_folder;
    await analyse(report_folder, options);
}

main();

