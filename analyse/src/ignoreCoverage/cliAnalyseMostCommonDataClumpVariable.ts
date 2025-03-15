#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext,
    DataClumpTypeContext,
    Dictionary
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

function getVariableKeyNameAndType(variable: DataClumpsVariableFromContext){
    return variable.name + variable.type;;
}

function printProgress(files, total_files, data_clumps, total_data_clumps){
    console.log("Progress analysing files: "+files.toString().padStart(4, "0")+
        "/"+total_files.toString().padStart(4, "0")+
        " - Data Clumps: "+data_clumps.toString().padStart(6, "0")+
        "/"+total_data_clumps.toString().padStart(6, "0"));
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "";

    let most_common_variable = {};

    let timer = new Timer()
    timer.start();
    let lastElapsedTime = 0;

    let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

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
                printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                timer.printElapsedTime()
                timer.printEstimatedTimeRemaining(progress_files, total_amount_of_report_files)
                lastElapsedTime = elaspedTime
            }

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true;

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data


                let variables = Object.keys(data_clump_data);
                // MOST COMMON VARIABLE
                for(let k = 0; k < variables.length; k++){
                    let variable_key = variables[k];
                    let variable = data_clump_data[variable_key];
                    let variable_key_name_and_type = getVariableKeyNameAndType(variable);
                    if(most_common_variable[variable_key_name_and_type] === undefined){
                        most_common_variable[variable_key_name_and_type] = {
                            occurrences: 0,
                            name: variable.name,
                            type: variable.type,
                            projects: {}
                        }
                    }
                    most_common_variable[variable_key_name_and_type].occurrences = most_common_variable[variable_key_name_and_type].occurrences+1;
                    if(!!report_file_json.project_info.project_name){
                        most_common_variable[variable_key_name_and_type].projects[report_file_json.project_info.project_name] = true;
                        project_names[report_file_json.project_info.project_name] = true;
                    }
                }
            }
        }

    }

    // Sort most common variable keys
    let most_common_variable_keys = Object.keys(most_common_variable);
    most_common_variable_keys.sort((key_a, key_b) => {
        let info_a = most_common_variable[key_a];
        let info_b = most_common_variable[key_b];
        let occurrences_a = info_a.occurrences;
        let occurrences_b = info_b.occurrences;
        return occurrences_b - occurrences_a;
    });

    console.log("dict_of_analysed_data_clumps_keys unique amount: " + Object.keys(dict_of_analysed_data_clumps_keys).length);
    console.log("Out of total " + most_common_variable_keys.length + " variables analyzed");
    let amount_show = 10;
    console.log(amount_show + ". Most common variable:");
    for (let i = 0; i < amount_show; i++) {
        let variable_key = most_common_variable_keys[i];
        let information = most_common_variable[variable_key];
        let name = information.name;
        let type = information.type;
        let occurrences = information.occurrences;
        console.log("#" + (i + 1) + " " + occurrences + " - name: " + name + " - type: " + type);
    }

    console.log("-------");
    console.log("Most common variable in all projects");
    let most_common_variable_in_all_projects_keys = Object.keys(most_common_variable);
    most_common_variable_in_all_projects_keys.sort((key_a, key_b) => {
        let info_a = most_common_variable[key_a];
        let info_b = most_common_variable[key_b];
        let occurrences_projects_a = Object.keys(info_a.projects).length;
        let occurrences_projects_b = Object.keys(info_b.projects).length;

        if (occurrences_projects_a === occurrences_projects_b) {
            return info_b.occurrences - info_a.occurrences;
        }
        return occurrences_projects_b - occurrences_projects_a;
    });
    console.log(amount_show + ". Most common variables in all projects:");
    for (let i = 0; i < amount_show; i++) {
        let variable_key = most_common_variable_in_all_projects_keys[i];
        let information = most_common_variable[variable_key];
        let name = information.name;
        let type = information.type;
        let occurrences = information.occurrences;
        let amount_projects = Object.keys(information.projects).length;
        console.log("#" + (i + 1) + " " + occurrences + " - name: " + name + " - type: " + type + " - amount projects: " + amount_projects);
    }

    fileContent += "";

    return fileContent

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

