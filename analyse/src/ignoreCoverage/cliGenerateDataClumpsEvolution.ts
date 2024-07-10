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
    .option('--report_folder <path>', 'Output path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
    .option('--output <path>', 'Output path', current_working_directory+'/AmountDataClumpsOverProjectVersions.py') // Default value is './data-clumps.json'



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

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "import matplotlib.pyplot as plt\n" +
        "import numpy as np"
    fileContent += "\n";

    let all_report_projects= fs.readdirSync(report_folder);

    let amount_data_clumps_keys: number[] = [];
    let percentage_type_a: number[] = []; // A: A code smell existed at all examined points of a project.
    let percentage_type_b: number[] = []; // B: A code smell occurred after the first examined point and remains until the current point.
    let percentage_type_c: number[] = []; // C: A code smell existed since the first examined point and was removed before the current point
    let percentage_type_d: number[] = []; // D: A code smell occurred between the first point examined and disappeared before the current point

    let projects: string[] = [];
    for (let i = 0; i < all_report_projects.length; i++) {
        let report_project = all_report_projects[i];
        // check if project is .DS_Store or non

        let report_file_path = path.join(report_folder, report_project);
        if (fs.lstatSync(report_file_path).isDirectory()) {
            projects.push(report_project);
            let path_to_analyzed_tag_folders = path.join(report_file_path, "tags");

            console.log("Check project: "+report_project);
            console.log("path_to_analyzed_tag_folders: "+path_to_analyzed_tag_folders);

            let timestamp_to_file_paths = time_stamp_to_file_paths(path_to_analyzed_tag_folders);
            let sorted_timestamps = getSortedTimestamps(timestamp_to_file_paths);
            console.log("sorted_timestamps: "+sorted_timestamps.length);

            let distribution = getHistoryDistribution(sorted_timestamps, timestamp_to_file_paths);
            percentage_type_a.push(distribution.percentage_type_a);
            percentage_type_b.push(distribution.percentage_type_b);
            percentage_type_c.push(distribution.percentage_type_c);
            percentage_type_d.push(distribution.percentage_type_d);
            amount_data_clumps_keys.push(distribution.amount_data_clumps_keys);

        }
        fileContent += "]\n";
    }


    fileContent += "projects = ["+projects.map(project => {
        // add line breaks when project name is too long. Every 12 characters a line break or when more than 6 characters and a space or a dash is found
        let project_name_with_line_breaks = "";
        let current_line_length = 0;
        for(let i = 0; i < project.length; i++){
            let character = project.charAt(i);
            if(character === " " || character === "-"){
                if(current_line_length > 6){
                    project_name_with_line_breaks += "\n";
                    current_line_length = 0;
                }
            }
            project_name_with_line_breaks += character;
            current_line_length += 1;
            if(current_line_length > 12){
                project_name_with_line_breaks += "\n";
                current_line_length = 0;
            }
        }
        return "'"+project_name_with_line_breaks+"'";
    }).join(", ")+"]\n";
    fileContent += "amount_data_clumps_keys = "+JSON.stringify(amount_data_clumps_keys)+"\n";
    fileContent += "percentage_type_a = "+JSON.stringify(percentage_type_a)+"\n";
    fileContent += "percentage_type_b = "+JSON.stringify(percentage_type_b)+"\n";
    fileContent += "percentage_type_c = "+JSON.stringify(percentage_type_c)+"\n";
    fileContent += "percentage_type_d = "+JSON.stringify(percentage_type_d)+"\n";

    fileContent += "\n";
    fileContent += "x = np.arange(len(projects))  # the label locations\n" +
        "width = 0.15  # the width of the bars, adjusted to fit the new Type E\n" +
        "\n" +
        "fig, ax = plt.subplots()\n" +
        "rects1 = ax.bar(x - 2*width, percentage_type_a, width, label='Category A')\n" +
        "rects2 = ax.bar(x - width, percentage_type_b, width, label='Category B')\n" +
        "rects3 = ax.bar(x, percentage_type_c, width, label='Category C')\n" +
        "rects4 = ax.bar(x + width, percentage_type_d, width, label='Category D')\n" +
        "\n" +
        "# Add some text for labels, title and custom x-axis tick labels, etc.\n" +
        "ax.set_xlabel('Projects')\n" +
        "ax.set_ylabel('Percentage of Data Clumps')\n" +
        "ax.set_xticks(x)\n" +
        "ax.set_xticklabels(projects)\n" +
        "\n" +
        "# Move legend below the diagram\n" +
        "ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.35), fancybox=True, shadow=True, ncol=5)\n" +
        "\n" +
        "fig.tight_layout()\n" +
        "plt.subplots_adjust(left=0.12, right=0.93, top=0.90, bottom=0.30)\n" +
        "fig.set_size_inches(6, 5, forward=True)\n" +
        "plt.xticks(rotation=45)\n" +
        "plt.show()";

    return fileContent

}

function getSortedTimestamps(timestamp_to_file_path){
    let sorted_timestamps = Object.keys(timestamp_to_file_path)
    return sorted_timestamps;
}

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

            let data_clumps_dict = report_file_json?.data_clumps;
            let data_clumps_keys = Object.keys(data_clumps_dict);
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

            let data_clumps_dict = report_file_json?.data_clumps;
            let data_clumps_keys = Object.keys(data_clumps_dict);
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

            let data_clumps_dict = report_file_json?.data_clumps;
            let data_clumps_keys = Object.keys(data_clumps_dict);
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

            let data_clumps_dict = report_file_json?.data_clumps;
            let data_clumps_keys = Object.keys(data_clumps_dict);
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

function getTypeEKeysDict(sorted_timestamps, timestamp_to_file_paths){

    console.log("Getting type E keys dict");

    let keys_type_e = {};

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

            let data_clumps_dict = report_file_json?.data_clumps;
            let data_clumps_keys = Object.keys(data_clumps_dict);
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

    let key_in_first_an_last_list = Object.keys(keys_in_first_an_last);
    for(let data_clump_key of key_in_first_an_last_list){
        let amount_found = dict_data_clump_key_to_amount_found[data_clump_key];
        if(amount_found < amount_report_files){ // but are missing somewhere in between
            keys_type_e[data_clump_key] = true;
        }
    }

    return keys_type_e;
}

type HistoryDistribution = {
    percentage_type_a: number // A: A code smell existed at all examined points of a project.
    percentage_type_b: number // B: A code smell occurred after the first examined point and remains until the current point.
    percentage_type_c: number // C: A code smell existed since the first examined point and was removed before the current point
    percentage_type_d: number, // D: A code smell occurred between the first point examined and disappeared before the current point
    percentage_type_e: number, // E: A code smell is present at the initial time point examined, disappears in subsequent examinations, but then reappears and persists up to the currenttime point
    amount_data_clumps_keys: number // amount of data clumps keys
}


function getHistoryDistribution(sorted_timestamps, timestamp_to_file_paths): HistoryDistribution{

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
        fromStartTillEndButMissingInBetween: keys_type_e // New Type E: A code smell is present at the initial time point examined, disappears in subsequent examinations, but then reappears and persists up to the currenttime point
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

    return {
        percentage_type_a: percentage_type_a,
        percentage_type_b: percentage_type_b,
        percentage_type_c: percentage_type_c,
        percentage_type_d: percentage_type_d,
        percentage_type_e: percentage_type_e,
        amount_data_clumps_keys: amount_data_clumps_keys
    }
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

