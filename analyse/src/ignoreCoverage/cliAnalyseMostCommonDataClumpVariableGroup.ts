#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext, DataClumpsVariableToContext,
    DataClumpTypeContext,
    Dictionary, Position
} from "data-clumps-type-context";
import {Timer} from "./Timer";
import {DetectorOptionsInformation} from "./detector/Detector";

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const default_path_to_counted_variable_groups = "/Users/nilsbaumgartner/Desktop/tmp_counted_variable_groups"

const program = new Command();

const current_working_directory = process.cwd();

let timer = new Timer();
timer.start()
let lastElapsedTime = 0;

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
    return variable.name + ":"+variable.type;
}

// Helper function to generate combinations
function generateCombinations(arr: string[], length: number): string[][] {
    let result: string[][] = [];
    let f = function (prefix: string[], arr: string[]) {
        for (let i = 0; i < arr.length; i++) {
            let newPrefix = prefix.concat(arr[i]);
            if (newPrefix.length === length) {
                result.push(newPrefix);
            } else {
                f(newPrefix, arr.slice(i + 1));
            }
        }
    }
    f([], arr);
    return result;
}

// Function to check for existing file with any prefix
function findFileWithAnyPrefix(directory, baseFilename, progress_files) {
    for (let i = 1; i <= progress_files.length; i++) {
        let file_name_with_index = `${baseFilename}${i}.json`;
        let full_path = path.join(directory, file_name_with_index);
        if (fs.existsSync(full_path)) {
            return file_name_with_index;
        }
    }
    return null;
}

/**
 * From {A,B,C,D,E}
 * Generate: [{A,B,C}, {A,B,D}, ..., {A,B,C,D}, {A,B,C,E}, ...., {A,B,C,D,E}]
 * @param data_clump_data
 */
function analyseForAllPairs(data_clump_data: Dictionary<DataClumpsVariableFromContext>, project_name: string, progress_files: number, total_amount_of_report_files: number, progress_data_clumps: number, amount_of_data_clumps: number) {
    let min_amount_from_variables = DetectorOptionsInformation.sharedFieldsToFieldsAmountMinimum.defaultValue;
    let amountVariables = Object.keys(data_clump_data).length;
    let full_variable_keys = Object.keys(data_clump_data);

    for (let i = min_amount_from_variables; i <= amountVariables; i++) {
        console.log("Get Combinations for "+i+"/"+amountVariables+" variables | progress_files: "+progress_files);
        let combinations = generateCombinations(full_variable_keys, i);
        let combo_index = 0;
        let max_combos = combinations.length;
        for (let combo of combinations) {
            let elaspedTime = timer.getCurrentElapsedTime();
            if(elaspedTime > lastElapsedTime + 1000){
                printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                timer.printElapsedTime()
                timer.printEstimatedTimeRemaining({
                    progress: progress_files,
                    total: total_amount_of_report_files
                });
                console.log("Get Combinations for "+i+"/"+amountVariables+" variables | progress_files: "+progress_files+" | combo: "+combo_index+"/"+max_combos);
                lastElapsedTime = elaspedTime
            }

            let pair: Dictionary<DataClumpsVariableFromContext> = {};
            for (let key of combo) {
                pair[key] = data_clump_data[key];
            }

            let data_clump_variable_pair = pair;

            let pair_key = getDataClumpPairSortedKey(data_clump_variable_pair);

            let file_name_with_prefix = getShortenedFileNameForDataClumpKey(pair_key, progress_files);
            let splits = file_name_with_prefix.split(AnalyzedResultFileSplit);
            let file_name_without_prefix = splits[1];

            // Check if a file with any prefix exists
            let existing_file = findFileWithAnyPrefix(default_path_to_counted_variable_groups, file_name_without_prefix, progress_files);
            let file_name = existing_file ? path.parse(existing_file).name : file_name_with_prefix;

            let path_to_counted_pair_json = path.join(default_path_to_counted_variable_groups, file_name + ".json");
            let does_file_exist = fs.existsSync(path_to_counted_pair_json);

            if (!does_file_exist) {
                let variables_name_and_type = getDataClumpPairListOfNameAndType(data_clump_variable_pair);
                let data = {
                    occurrences: 0,
                    variables_name_and_type: variables_name_and_type,
                    projects: {}
                };
                fs.writeFileSync(path_to_counted_pair_json, JSON.stringify(data, null, 2), 'utf8');
            }

            let data = JSON.parse(fs.readFileSync(path_to_counted_pair_json, 'utf8'));
            data.occurrences += 1;
            data.projects[project_name] = true;
            fs.writeFileSync(path_to_counted_pair_json, JSON.stringify(data, null, 2), 'utf8');
        }
    }
}

/**
 * From {A,C,A,B}
 * Generate: A_A_B_C
 * @param data_clump_data
 */
function getDataClumpPairSortedKey(data_clump_data: Dictionary<DataClumpsVariableFromContext>): string {
    let keys: string[] = [];
    let raw_keys = Object.keys(data_clump_data);

    for (let key of raw_keys) {
        let variable: DataClumpsVariableFromContext = data_clump_data[key];
        let name_and_type_key = getVariableKeyNameAndType(variable);
        keys.push(name_and_type_key);
    }

    // Sort keys alphabetically
    keys.sort();

    // Concatenate sorted keys with underscores
    return keys.join('_');
}


function getDataClumpPairListOfNameAndType(data_clump_data: Dictionary<DataClumpsVariableFromContext>): string[] {
    let name_and_types: string[] = [];
    let raw_keys = Object.keys(data_clump_data);

    for (let key of raw_keys) {
        let variable: DataClumpsVariableFromContext = data_clump_data[key];
        let name_and_type_key = getVariableKeyNameAndType(variable);
        name_and_types.push(name_and_type_key);
    }

    // Sort keys alphabetically
    name_and_types.sort();

    // Concatenate sorted keys with underscores
    return name_and_types
}



function printProgress(files, total_files, data_clumps, total_data_clumps){
    console.log("Progress analysing files: "+files.toString().padStart(4, "0")+
        "/"+total_files.toString().padStart(4, "0")+
        " - Data Clumps: "+data_clumps.toString().padStart(6, "0")+
        "/"+total_data_clumps.toString().padStart(6, "0"));
}

function getTestDataClumps():  Dictionary<DataClumpTypeContext>{
    return  {
        // @ts-ignore
        "1": {
            data_clump_data: {
                // @ts-ignore
                "A": {
                    type: "A",
                    name: "A",
                },
                // @ts-ignore
                "B": {
                    type: "B",
                    name: "B",
                },
                // @ts-ignore
                "C": {
                    type: "C",
                    name: "C",
                },
                // @ts-ignore
                "D": {
                    type: "D",
                    name: "D",
                },
                // @ts-ignore
                "E": {
                    type: "E",
                    name: "E",
                },
            }
        },
        // @ts-ignore
        "2": {
            data_clump_data: {
                // @ts-ignore
                "A": {
                    type: "A",
                    name: "A",
                },
                // @ts-ignore
                "B": {
                    type: "B",
                    name: "B",
                },
                // @ts-ignore
                "C": {
                    type: "C",
                    name: "C",
                },
                // @ts-ignore
                "D": {
                    type: "D",
                    name: "D",
                },
                // @ts-ignore
                "E": {
                    type: "E",
                    name: "E",
                },
            }
        },
        // @ts-ignore
        "3": {
            data_clump_data: {
                // @ts-ignore
                "A": {
                    type: "A",
                    name: "A",
                },
                // @ts-ignore
                "B": {
                    type: "B",
                    name: "B",
                },
                // @ts-ignore
                "C": {
                    type: "C",
                    name: "C",
                },
                // @ts-ignore
                "D": {
                    type: "D",
                    name: "D",
                },
            }
        },
    }
}

function getAllAnalyzedPairResultFiles(){
    console.log("Get all analyzed pair result files");
    if(fs.existsSync(default_path_to_counted_variable_groups)){
        console.log("Path exists: "+default_path_to_counted_variable_groups)
        let file_names_for_analyzed_variable_groups = fs.readdirSync(default_path_to_counted_variable_groups).filter(file => !file.includes('DS_Store'));
        return file_names_for_analyzed_variable_groups;
    } else {
        return []
    }
}

async function analyse(report_folder, options, largest_prefix: number | undefined){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "";

    let all_report_files_paths = getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;

    let dict_of_analysed_data_clumps_keys = {};




    for(let i = 0; i < total_amount_of_report_files; i++){
        let progress_files = i+1;



        let report_file_path = all_report_files_paths[i];
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

        let data_clumps = report_file_json?.data_clumps;

        // FOR TESTING
        //data_clumps = getTestDataClumps();




        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;

            let elaspedTime = timer.getCurrentElapsedTime();
            if(elaspedTime > lastElapsedTime + 1000){
                printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                timer.printElapsedTime()
                timer.printEstimatedTimeRemaining({
                    progress: progress_files,
                    total: total_amount_of_report_files
                });
                lastElapsedTime = elaspedTime
            }

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true;

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data

                // MOST COMMON VARIABLE GROUP

                printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                let project_name = report_file_json.project_info.project_name || "undefined_project"

                if(largest_prefix !== undefined && progress_files<largest_prefix){
                    console.log("Skip already analyzed progress file");
                    continue;
                } else {
                    analyseForAllPairs(data_clump_data, project_name, progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                }
            }
        }

    }

    console.log("dict_of_analysed_data_clumps_keys unique amount: " + Object.keys(dict_of_analysed_data_clumps_keys).length);

    let file_names_for_analyzed_variable_groups = getAllAnalyzedPairResultFiles();

    let amount_data_clump_pairs_keys = file_names_for_analyzed_variable_groups.length
    console.log("Out of total " + amount_data_clump_pairs_keys + " variable pairs analyzed");

    // Sort most common variable keys
    let amount_show = 10
    if(amount_data_clump_pairs_keys < amount_show){
        amount_show = amount_data_clump_pairs_keys
    }

    console.log("Sort the analyzed group pairs and search for the top "+amount_show);

    let timerFindMostCommonVariable = new Timer();
    timerFindMostCommonVariable.start();

    let most_group_pairs_in_any_project = {} // Holds account of the "amount_show" most occurences of data clumps "data"
    let most_group_pairs_in_all_project = {} // Holds account of the "amount_show" most occurences of data clumps "data" which are in most projects

    let i = 0;
    for (let pair_file_name of file_names_for_analyzed_variable_groups) {
        timerFindMostCommonVariable.printEstimatedTimeRemaining({
            progress: (i + 1),
            total: amount_data_clump_pairs_keys
        });

        let path_to_pair_file_name = path.join(default_path_to_counted_variable_groups, pair_file_name);
        console.log("Read analyzed file: " + path_to_pair_file_name);
        let data = JSON.parse(fs.readFileSync(path_to_pair_file_name, 'utf8'));
        let occurrences = data.occurrences;
        let variables_name_and_type = data.variables_name_and_type;
        let projects = data.projects;
        let amount_projects = Object.keys(projects).length;

        // Search in all most_group_pairs_in_any_project if current occurrences is higher than the smallest one. If yes, kick the smallest entry out
        let keys_in_most_group_pairs_in_any_project = Object.keys(most_group_pairs_in_any_project);
        if (keys_in_most_group_pairs_in_any_project.length >= amount_show) {
            let smallest_key = keys_in_most_group_pairs_in_any_project[0];
            for (let key of keys_in_most_group_pairs_in_any_project) {
                if (most_group_pairs_in_any_project[key].occurrences < most_group_pairs_in_any_project[smallest_key].occurrences) {
                    smallest_key = key;
                }
            }
            if (occurrences > most_group_pairs_in_any_project[smallest_key].occurrences) {
                delete most_group_pairs_in_any_project[smallest_key];
                most_group_pairs_in_any_project[pair_file_name] = {
                    occurrences: occurrences,
                    variables_name_and_type: variables_name_and_type,
                    projects: projects
                };
            }
        } else {
            most_group_pairs_in_any_project[pair_file_name] = {
                occurrences: occurrences,
                variables_name_and_type: variables_name_and_type,
                projects: projects
            };
        }

        // Search in all most_group_pairs_in_all_project and check if amount_projects is higher than the smallest one. If yes kick it out. If same, then check for smallest occurrences and kick it out.
        let keys_in_most_group_pairs_in_all_project = Object.keys(most_group_pairs_in_all_project);
        if (keys_in_most_group_pairs_in_all_project.length >= amount_show) {
            let smallest_key = keys_in_most_group_pairs_in_all_project[0];
            for (let key of keys_in_most_group_pairs_in_all_project) {
                if (most_group_pairs_in_all_project[key].amount_projects < most_group_pairs_in_all_project[smallest_key].amount_projects ||
                    (most_group_pairs_in_all_project[key].amount_projects === most_group_pairs_in_all_project[smallest_key].amount_projects &&
                        most_group_pairs_in_all_project[key].occurrences < most_group_pairs_in_all_project[smallest_key].occurrences)) {
                    smallest_key = key;
                }
            }
            if (amount_projects > most_group_pairs_in_all_project[smallest_key].amount_projects ||
                (amount_projects === most_group_pairs_in_all_project[smallest_key].amount_projects && occurrences > most_group_pairs_in_all_project[smallest_key].occurrences)) {
                delete most_group_pairs_in_all_project[smallest_key];
                most_group_pairs_in_all_project[pair_file_name] = {
                    occurrences: occurrences,
                    variables_name_and_type: variables_name_and_type,
                    projects: projects
                };
            }
        } else {
            most_group_pairs_in_all_project[pair_file_name] = {
                occurrences: occurrences,
                variables_name_and_type: variables_name_and_type,
                projects: projects
            };
        }
        i++;
    }

    console.log("Out of total " + amount_data_clump_pairs_keys + " variable pairs analyzed");

    console.log("most_group_pairs_in_any_project");
    let most_group_pairs_in_any_project_keys = Object.keys(most_group_pairs_in_any_project);
    // Print sorted by occurrences each object
    most_group_pairs_in_any_project_keys.sort((a, b) => most_group_pairs_in_any_project[b].occurrences - most_group_pairs_in_any_project[a].occurrences);
    most_group_pairs_in_any_project_keys.forEach(key => {
        console.log({
            pair_file_name: key,
            occurrences: most_group_pairs_in_any_project[key].occurrences,
            variables_name_and_type: most_group_pairs_in_any_project[key].variables_name_and_type,
            projects: most_group_pairs_in_any_project[key].projects
        });
    });

    console.log("##############")
    console.log("most_group_pairs_in_all_project");
    let most_group_pairs_in_all_project_keys = Object.keys(most_group_pairs_in_all_project);
    // Print sorted by amount_projects and then by occurrences each object
    most_group_pairs_in_all_project_keys.sort((a, b) => {
        if (most_group_pairs_in_all_project[b].projects.length === most_group_pairs_in_all_project[a].projects.length) {
            return most_group_pairs_in_all_project[b].occurrences - most_group_pairs_in_all_project[a].occurrences;
        }
        return most_group_pairs_in_all_project[b].projects.length - most_group_pairs_in_all_project[a].projects.length;
    });
    most_group_pairs_in_all_project_keys.forEach(key => {
        console.log({
            pair_file_name: key,
            occurrences: most_group_pairs_in_all_project[key].occurrences,
            variables_name_and_type: most_group_pairs_in_all_project[key].variables_name_and_type,
            projects: most_group_pairs_in_all_project[key].projects
        });
    });




    fileContent += "";

    return fileContent

}

const AnalyzedResultFileSplit = "_";
function getShortenedFileNameForDataClumpKey(long_data_clump_key: string, progress_files: number) {
    // Create an MD5 hash of the key
    const hash = crypto.createHash('md5').update(long_data_clump_key).digest('hex');

    // Optionally, you can shorten the hash further if you want
    // For example, take the first 8 characters of the hash
    return progress_files+AnalyzedResultFileSplit+hash;
}

function deleteLastUncompleteFileAllAnalyzedReportsOfLastAnalyzedReportFile(): number | undefined{
    let file_names_for_analyzed_variable_groups = getAllAnalyzedPairResultFiles();

    let timerForDeletion = new Timer();
    timerForDeletion.start()

    let largest_prefix: number | undefined = undefined;
    let i=0;
    for(let file_name_for_analyzed_variable_groups of file_names_for_analyzed_variable_groups){
        timerForDeletion.printEstimatedTimeRemaining(
            {
                progress: (i+1),
                total: file_names_for_analyzed_variable_groups.length,
                prefix: "Search largest prefix: "
            });
        i++;

        // Split the files by AnalyzedResultFileSplit
        // ...
        // 13_siuefhsef
        // 13_sfesefisuh
        // 14_soiuehfesif
        // TODO: find the largest prefix number:
        let splits = file_name_for_analyzed_variable_groups.split(AnalyzedResultFileSplit);
        let prefix = splits[0];
        let prefix_number = parseInt(prefix);
        if(!largest_prefix || prefix_number > largest_prefix){
            largest_prefix = prefix_number;
        }
    }

    console.log("Largest Prefix: "+largest_prefix);

    timerForDeletion.start()

    // Delete all files with "largest_prefix AnalyzedResultFileSplit"
    if (largest_prefix !== undefined) {
        i=0;
        for (let file_name_for_analyzed_variable_groups of file_names_for_analyzed_variable_groups) {
            timerForDeletion.printEstimatedTimeRemaining({
                progress: (i+1),
                total: file_names_for_analyzed_variable_groups.length,
                prefix: "Delete files with largest prefix: "
            });
            i++;

            let splits = file_name_for_analyzed_variable_groups.split(AnalyzedResultFileSplit);
            let prefix = splits[0];
            let prefix_number = parseInt(prefix);
            if (prefix_number === largest_prefix) {
                let path_to_counted_pair_json = path.join(default_path_to_counted_variable_groups, file_name_for_analyzed_variable_groups);
                fs.unlinkSync(path_to_counted_pair_json);
            }
        }
    }

    return largest_prefix;


}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;


    let largest_prefix = deleteLastUncompleteFileAllAnalyzedReportsOfLastAnalyzedReportFile();
    await analyse(report_folder, options, largest_prefix);
}

main();
