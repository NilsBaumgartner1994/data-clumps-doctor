#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {DataClumpsTypeContext, DataClumpsVariableFromContext, DataClumpTypeContext} from "data-clumps-type-context";

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
    .option('--report_folder <path>', 'Output path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') /**
 * Retrieves the file paths of all JSON files in the specified report folder and maps them to their respective timestamps.
 * 
 * @param report_folder The folder containing the report files
 * @returns An object mapping timestamps to file paths
 * @throws Throws an error if there is an issue reading or parsing the report files
 */
// Default value is './data-clumps.json'

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
    for(let i = 0; i <all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        console.log("parsing report file: "+report_file_path+" ...")
        let report_file_json = JSON.parse(report_file);
        let project_commit_date = report_file_json?.project_info?.project_commit_date;
        project_commit_date = parseInt(project_commit_date); // unix timestamp
        let project_commit_date_date = project_commit_dateToDate(project_commit_date);
        console.log("project_commit_date: "+project_commit_date);

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

/**
 * Retrieves sorted timestamps from the given timestamp_to_file_path object.
 * @param timestamp_to_file_path The object containing timestamp to file path mapping.
 * @returns An array of sorted timestamps.
 */
function getSortedTimestamps(timestamp_to_file_path){
    let sorted_timestamps = Object.keys(timestamp_to_file_path)
    return sorted_timestamps;
}


/**
 * Retrieves the data clump key by variables from the provided DataClumpTypeContext.
 * 
 * @param data_clumps - The DataClumpTypeContext containing the data clump data.
 * @returns The data clump key generated from the variables.
 * @throws - Throws an error if the data_clumps parameter is null or undefined.
 */
function getDataClumpKeyByVariables(data_clumps: DataClumpTypeContext){
    let from_to_variables = data_clumps.data_clump_data;
    let from_composite_names = {};
    let from_variable_keys = Object.keys(from_to_variables);
    for(let i = 0; i < from_variable_keys.length; i++){
        let from_variable_key = from_variable_keys[i];
        let from_variable: DataClumpsVariableFromContext = from_to_variables[from_variable_key];
        from_composite_names[from_variable.name] = from_variable.type;
    }

    // sort by variable name
    let from_composite_names_keys = Object.keys(from_composite_names);
    //from_composite_names_keys = from_composite_names_keys.sort();

    let data_clump_key = "";
    for(let i = 0; i < from_composite_names_keys.length; i++){
        let from_composite_name_key = from_composite_names_keys[i];

        let from_composite_type = from_composite_names[from_composite_name_key];
        data_clump_key += "("+from_composite_type+")";
        data_clump_key += from_composite_name_key;
    }


    return data_clump_key;
}

/**
 * Retrieves a dictionary of variable keys by report file.
 * @param report_file_json The JSON object representing the report file.
 * @param i The index parameter.
 * @returns A dictionary of variable keys.
 * @throws {Error} If the report file JSON is invalid or if an error occurs during the process.
 */
function getVariableKeysDictByReportFile(report_file_json, i){
    let data_clumps_dict = report_file_json?.data_clumps;
    let data_clumps_keys = Object.keys(data_clumps_dict);
    let variable_keys_dict = {};
    for(let j = 0; j < data_clumps_keys.length; j++){
        let data_clump_key = data_clumps_keys[j];
        let data_clumps: DataClumpTypeContext = data_clumps_dict[data_clump_key];
        let variable_key = getDataClumpKeyByVariables(data_clumps);
        variable_keys_dict[variable_key] = variable_key;
    }

    return variable_keys_dict;

}


/**
 * Retrieves all data clump keys from the given sorted timestamps and timestamp to file paths.
 * 
 * @param sorted_timestamps The array of sorted timestamps.
 * @param timestamp_to_file_paths The object mapping timestamps to file paths.
 * @returns An object containing all the data clump keys.
 * @throws This method may throw an exception if there is an error reading or parsing the report files.
 */
function getAllDataClumpsKeys(sorted_timestamps, timestamp_to_file_paths){
    let all_data_clump_keys = {};
    console.log("Getting all data clump keys");

    for(let i = 0; i < sorted_timestamps.length; i++){
        console.log("Total Keys: Timestamp: "+i+" / "+sorted_timestamps.length)
        let report_file_paths = timestamp_to_file_paths[sorted_timestamps[i]];

        for(let j = 0; j < report_file_paths.length; j++){
            let report_file_path = report_file_paths[j];
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file);

            let data_clumps_keys = Object.keys(getVariableKeysDictByReportFile(report_file_json, i));

            // check if data clump key is already in histogram and if not add it
            for(let j = 0; j < data_clumps_keys.length; j++){
                let data_clump_key = data_clumps_keys[j];

                all_data_clump_keys[data_clump_key] = true;
            }
        }

    }

    return all_data_clump_keys;
}

/**
 * Retrieves a dictionary of keys for type A based on sorted timestamps and corresponding file paths.
 * 
 * @param sorted_timestamps - Array of sorted timestamps.
 * @param timestamp_to_file_paths - Object mapping timestamps to file paths.
 * @returns Dictionary of keys for type A.
 * @throws {Error} - If there is an error reading or parsing the report files.
 */
function getTypeAKeysDict(sorted_timestamps, timestamp_to_file_paths){

    console.log("Getting type A keys dict");

    let keys_type_a = {};

    let amount_timestamps = sorted_timestamps.length;
    let amount_report_files = 0;

    let dict_data_clump_key_to_amount_found: any = {};

    let first_timestamp = sorted_timestamps[0];

    for(let j = 0; j < amount_timestamps; j++){
        console.log("A Timestamp: "+j+" / "+sorted_timestamps.length)

        let timestamp = sorted_timestamps[j];
        let report_file_paths = timestamp_to_file_paths[timestamp];

        let is_first_timestamp = timestamp === first_timestamp;

        amount_report_files += report_file_paths.length;

        for(let report_file_path of report_file_paths){
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

            let data_clumps_keys = Object.keys(getVariableKeysDictByReportFile(report_file_json, j));
            for(let data_clumps_key of data_clumps_keys){
                let amount_found = dict_data_clump_key_to_amount_found[data_clumps_key] || 0;
                amount_found += 1;
                dict_data_clump_key_to_amount_found[data_clumps_key] = amount_found;
            }
        }

    }

    let data_clump_keys = Object.keys(dict_data_clump_key_to_amount_found);
    for(let data_clump_key of data_clump_keys){
        let amount_found = dict_data_clump_key_to_amount_found[data_clump_key];

        if(amount_found === amount_report_files){
            keys_type_a[data_clump_key] = true;
        }
    }

    return keys_type_a;
}

/**
 * Retrieves the keys that are found in the last timestamp but not in the first timestamp.
 * 
 * @param sorted_timestamps - Array of sorted timestamps.
 * @param timestamp_to_file_paths - Object mapping timestamps to file paths.
 * @returns Object containing keys found in the last timestamp but not in the first timestamp.
 * @throws Error if there is an issue reading or parsing the report files.
 */
// keys that are found in the last timestamp but not in the first timestamp
function getTypeBKeysDict(sorted_timestamps, timestamp_to_file_paths){

    console.log("Getting type B keys dict");

    let keys_in_first_timestamp = {};
    let keys_in_last_timestamp = {};

    let amount_timestamps = sorted_timestamps.length;

    let first_timestamp = sorted_timestamps[0];
    let last_timestamp = sorted_timestamps[amount_timestamps-1];

    for(let j = 0; j < amount_timestamps; j++){
        console.log("B Timestamp: "+j+" / "+sorted_timestamps.length)
        let timestamp = sorted_timestamps[j];
        let report_file_paths = timestamp_to_file_paths[timestamp];

        for(let report_file_path of report_file_paths){
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

            let data_clumps_keys = Object.keys(getVariableKeysDictByReportFile(report_file_json, j));
            for(let data_clumps_key of data_clumps_keys){
                if(timestamp === first_timestamp){
                    keys_in_first_timestamp[data_clumps_key] = true;
                }

                if(timestamp === last_timestamp){
                    keys_in_last_timestamp[data_clumps_key] = true;
                }
            }
        }

    }

    let keys_type_b = keys_in_last_timestamp;

    // remove keys that are in last timestamp
    for(let data_clump_key in keys_in_first_timestamp){
        delete keys_type_b[data_clump_key];
    }

    return keys_type_b;
}

/**
 * Get dictionary of keys that are found in the last but not in the first timestamp
 * @param sorted_timestamps - Array of sorted timestamps
 * @param timestamp_to_file_paths - Object mapping timestamp to file paths
 * @returns Dictionary of keys found in the last but not in the first timestamp
 * @throws Error if file reading or JSON parsing fails
 */
// keys that are found in the last but not in the first timestamp
function getTypeCKeysDict(sorted_timestamps, timestamp_to_file_paths){

    console.log("Getting type C keys dict");

    let keys_in_first_timestamp = {};
    let keys_in_last_timestamp = {};

    let amount_timestamps = sorted_timestamps.length;

    let first_timestamp = sorted_timestamps[0];
    let last_timestamp = sorted_timestamps[amount_timestamps-1];

    for(let j = 0; j < amount_timestamps; j++){
        console.log("C Timestamp: "+j+" / "+sorted_timestamps.length)
        let timestamp = sorted_timestamps[j];
        let report_file_paths = timestamp_to_file_paths[timestamp];

        for(let report_file_path of report_file_paths){
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

            let data_clumps_keys = Object.keys(getVariableKeysDictByReportFile(report_file_json, j));
            for(let data_clumps_key of data_clumps_keys){
                if(timestamp === first_timestamp){
                    keys_in_first_timestamp[data_clumps_key] = true;
                }

                if(timestamp === last_timestamp){
                    keys_in_last_timestamp[data_clumps_key] = true;
                }
            }
        }

    }

    let keys_type_c = keys_in_first_timestamp;

    // remove keys that are in last timestamp
    for(let data_clump_key in keys_in_last_timestamp){
        delete keys_type_c[data_clump_key];
    }

    return keys_type_c;
}

/**
 * Retrieves a dictionary of type D keys from the given sorted timestamps and timestamp to file paths mapping.
 * 
 * @param sorted_timestamps An array of sorted timestamps.
 * @param timestamp_to_file_paths A mapping of timestamp to file paths.
 * @returns A dictionary containing the type D keys.
 * @throws This method does not throw any exceptions.
 */
function getTypeDKeysDict(sorted_timestamps, timestamp_to_file_paths){
    console.log("Getting type D keys dict");

    let keys_type_d = {};

    let keys_in_first_timestamp = {};
    let keys_in_last_timestamp = {};

    let amount_timestamps = sorted_timestamps.length;

    let first_timestamp = sorted_timestamps[0];
    let last_timestamp = sorted_timestamps[amount_timestamps-1];

    for(let j = 0; j < amount_timestamps; j++){
        console.log("D Timestamp: "+j+" / "+sorted_timestamps.length)
        let timestamp = sorted_timestamps[j];
        let report_file_paths = timestamp_to_file_paths[timestamp];

        for(let report_file_path of report_file_paths){
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

            let data_clumps_keys = Object.keys(getVariableKeysDictByReportFile(report_file_json, j));
            for(let data_clumps_key of data_clumps_keys){
                if(timestamp === first_timestamp){
                    keys_in_first_timestamp[data_clumps_key] = true;
                }

                if(timestamp === last_timestamp){
                    keys_in_last_timestamp[data_clumps_key] = true;
                }

                keys_type_d[data_clumps_key] = true;
            }
        }

    }

    // remove keys that are in first timestamp
    for(let data_clump_key in keys_in_first_timestamp){
        delete keys_type_d[data_clump_key];
    }

    // remove keys that are in last timestamp
    for(let data_clump_key in keys_in_last_timestamp){
        delete keys_type_d[data_clump_key];
    }

    return keys_type_d;
}


/**
 * Retrieves a dictionary of type E keys based on sorted timestamps and corresponding file paths.
 * 
 * @param sorted_timestamps An array of sorted timestamps.
 * @param timestamp_to_file_paths A dictionary mapping timestamps to file paths.
 * @returns A dictionary containing type E keys.
 * @throws Throws an error if there is an issue reading or parsing the report files.
 */
function getTypeEKeysDict(sorted_timestamps, timestamp_to_file_paths){

    console.log("Getting type E keys dict");


    let amount_timestamps = sorted_timestamps.length;
    let amount_report_files = 0;

    let dict_data_clump_key_to_amount_found: any = {};

    let keys_in_first_timestamp = {};
    let keys_in_last_timestamp = {};

    let first_timestamp = sorted_timestamps[0];
    let last_timestamp = sorted_timestamps[sorted_timestamps.length-1];

    for(let j = 0; j < amount_timestamps; j++){
        console.log("E Timestamp: "+j+" / "+sorted_timestamps.length)

        let timestamp = sorted_timestamps[j];
        let report_file_paths = timestamp_to_file_paths[timestamp];;

        amount_report_files += report_file_paths.length;

        for(let report_file_path of report_file_paths){
            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

            let data_clumps_keys = Object.keys(getVariableKeysDictByReportFile(report_file_json, j));
            for(let data_clumps_key of data_clumps_keys){
                let amount_found = dict_data_clump_key_to_amount_found[data_clumps_key] || 0;
                amount_found += 1;
                dict_data_clump_key_to_amount_found[data_clumps_key] = amount_found;

                if(timestamp === first_timestamp){
                    keys_in_first_timestamp[data_clumps_key] = true;
                }

                if(timestamp === last_timestamp){
                    keys_in_last_timestamp[data_clumps_key] = true;
                }
            }
        }

    }

    // Get keys which are in first and last
    let keys_in_first_an_last = {}
    for(let data_clump_key_in_first in keys_in_first_timestamp){
        for(let data_clump_key_in_last in keys_in_last_timestamp){
            if(data_clump_key_in_first===data_clump_key_in_last){
                keys_in_first_an_last[data_clump_key_in_first] = true;
            }
        }
    }

    let keys_type_e = {};
    let key_in_first_an_last_list = Object.keys(keys_in_first_an_last);
    for(let data_clump_key of key_in_first_an_last_list){
        let amount_found = dict_data_clump_key_to_amount_found[data_clump_key];
        if(amount_found < amount_report_files){ // but are missing somewhere in between
            keys_type_e[data_clump_key] = true;
        }
    }

    return keys_type_e;
}

/**
 * Calculates the history distribution of keys based on sorted timestamps and corresponding file paths.
 * @param {Array<number>} sorted_timestamps - The sorted timestamps array.
 * @param {Object} timestamp_to_file_paths - The mapping of timestamps to file paths.
 * @returns {Object} - The history distribution object containing keys of different types.
 * @throws {Error} - If the control sum does not match the amount of data clumps keys.
 */
function getHistoryDistribution(sorted_timestamps, timestamp_to_file_paths){

    console.log("getHistoryDistribution");

    let all_data_clumps_keys = getAllDataClumpsKeys(sorted_timestamps, timestamp_to_file_paths);
    let amount_data_clumps_keys = Object.keys(all_data_clumps_keys).length;


    let keys_type_a = getTypeAKeysDict(sorted_timestamps, timestamp_to_file_paths);
    let keys_type_b = getTypeBKeysDict(sorted_timestamps, timestamp_to_file_paths);
    let keys_type_c = getTypeCKeysDict(sorted_timestamps, timestamp_to_file_paths);
    let keys_type_d = getTypeDKeysDict(sorted_timestamps, timestamp_to_file_paths);
    let keys_type_e = getTypeEKeysDict(sorted_timestamps, timestamp_to_file_paths);

    let history_distribution = {
        fromStartTillEnd: keys_type_a, // Type A, a key in in all timestamps
        afterStartButTillEnd: keys_type_b, // Type B a key is in the last timestamp but is missing in any other
        fromStartButNotTillEnd: keys_type_c, // Type C a key is in the first timestamp but is missing in any other
        afterStartAndBeforeEnd: keys_type_d, // Type D a key is not in the first and not in the last timestamp but is in any other
        fromStartTillEndButMissingInBetween: keys_type_e // New Type E
    };

    let amount_keys_type_a = Object.keys(keys_type_a).length;
    let amount_keys_type_b = Object.keys(keys_type_b).length;
    let amount_keys_type_c = Object.keys(keys_type_c).length;
    let amount_keys_type_d = Object.keys(keys_type_d).length;
    let amount_keys_type_e = Object.keys(keys_type_e).length;

    let control_sum = amount_keys_type_a + amount_keys_type_b + amount_keys_type_c + amount_keys_type_d + amount_keys_type_e;
    if(control_sum !== amount_data_clumps_keys){
        console.log("ERROR: Control sum does not match");
        console.log("control_sum: "+control_sum);
        console.log("amount_data_clumps_keys: "+amount_data_clumps_keys);
        console.log("amount_keys_type_a: "+amount_keys_type_a);
        console.log("amount_keys_type_b: "+amount_keys_type_b);
        console.log("amount_keys_type_c: "+amount_keys_type_c);
        console.log("amount_keys_type_d: "+amount_keys_type_d);
        console.log("amount_keys_type_e: "+amount_keys_type_e);

        process.exit(1);
    }


    console.log("amount_data_clumps_keys: "+amount_data_clumps_keys);
    let percentage_type_a = (amount_keys_type_a / amount_data_clumps_keys) * 100;
    percentage_type_a = parseFloat(percentage_type_a.toFixed(2))
    let percentage_type_b = (amount_keys_type_b / amount_data_clumps_keys) * 100;
    percentage_type_b = parseFloat(percentage_type_b.toFixed(2))
    let percentage_type_c = (amount_keys_type_c / amount_data_clumps_keys) * 100;
    percentage_type_c = parseFloat(percentage_type_c.toFixed(2))
    let percentage_type_d = (amount_keys_type_d / amount_data_clumps_keys) * 100;
    percentage_type_d = parseFloat(percentage_type_d.toFixed(2))
    let percentage_type_e = (amount_keys_type_e / amount_data_clumps_keys) * 100;
    percentage_type_e = parseFloat(percentage_type_e.toFixed(2))

    console.log("percentage_type_a: "+percentage_type_a+"% --- "+amount_keys_type_a+" / "+amount_data_clumps_keys);
    console.log("percentage_type_b: "+percentage_type_b+"% --- "+amount_keys_type_b+" / "+amount_data_clumps_keys);
    console.log("percentage_type_c: "+percentage_type_c+"% --- "+amount_keys_type_c+" / "+amount_data_clumps_keys);
    console.log("percentage_type_d: "+percentage_type_d+"% --- "+amount_keys_type_d+" / "+amount_data_clumps_keys);
    console.log("percentage_type_e: "+percentage_type_e+"% --- "+amount_keys_type_e+" / "+amount_data_clumps_keys);



    return history_distribution;
}


/**
 * Converts a Unix timestamp to a date string.
 * 
 * @param project_commit_date The Unix timestamp to convert to a date string.
 * @returns The date string in the format 'YYYY-MM-DD'.
 * @throws If project_commit_date is not a valid Unix timestamp.
 */
function project_commit_dateToDate(project_commit_date){
    let date = new Date(project_commit_date*1000);
    // date to string
    let date_string = date.toISOString().slice(0,10);
    return date_string;
}

/**
 * Asynchronously analyses the report folder with the given options.
 * 
 * @param {string} report_folder - The path to the report folder to be analysed.
 * @param {any} options - The options for the analysis.
 * @throws {Error} - If the specified path to the report folder does not exist.
 */
async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let timestamp_to_file_paths = time_stamp_to_file_paths(report_folder);
    let sorted_timestamps = getSortedTimestamps(timestamp_to_file_paths);
    console.log("sorted_timestamps: "+sorted_timestamps.length);

    getHistoryDistribution(sorted_timestamps, timestamp_to_file_paths);


}

/**
 * Asynchronous function to execute the main logic.
 * 
 * @throws {Error} Throws an error if there is an issue with the execution.
 */
async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;



    await analyse(report_folder, options);
}

main();

