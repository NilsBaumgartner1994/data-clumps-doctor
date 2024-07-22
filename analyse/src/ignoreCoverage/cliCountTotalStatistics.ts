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
    .option('--report_folder <path>', 'Report path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
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

function printDataClumpsClusterDistribution(all_report_files_paths){

    console.log("Counting data clumps cluster distribution ...")

    let total_amount_data_clumps = 0;
    let total_amount_parameter_to_parameter_data_clumps = 0;
    let total_amount_parameter_to_fields_data_clumps = 0;
    let total_amount_fields_to_fields_data_clumps = 0;

    let amount_variables_in_data_clumps: any = [];

    let allKeys = {};
    let uniqueFieldToFieldDataClumpKeys = {};
    let uniqueParameterToParameterDataClumpKeys = {};
    let uniqueParameterToFieldDataClumpKeys = {};

    let earliest_timestamp: number | undefined = undefined
    let latest_timestamp: number | undefined = undefined
    let latest_report_file_path: string | undefined = undefined
    let latest_report_file_json: DataClumpsTypeContext | undefined = undefined

    for(let i = 0; i < all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        console.log("Processing report_file: "+(i+1)+" / "+all_report_files_paths.length+" report files")
        console.log("report_file_path: "+report_file_path)

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

            let project_commit_date = report_file_json.project_info.project_commit_date
            if(!!project_commit_date){
                // project_commit_date: '1360449946',
                let timestamp = parseInt(project_commit_date);
                console.log("Timestamp: "+timestamp)
                // check if valid timestamp
                if(!isNaN(timestamp)){
                    // check if it is not 1970
                    let earliest_allowed_timestamp = 10;

                    if(earliest_timestamp === undefined || timestamp < earliest_timestamp && timestamp >= earliest_allowed_timestamp){
                        earliest_timestamp = timestamp;
                    }
                    if(latest_timestamp === undefined || timestamp > latest_timestamp && timestamp >= earliest_allowed_timestamp){
                        latest_timestamp = timestamp;
                        latest_report_file_path = report_file_path;
                        latest_report_file_json = report_file_json;
                    }
                }
            }


            let data_clumps = report_file_json?.data_clumps || {}
            let data_clumps_keys = Object.keys(data_clumps);
            for(let j = 0; j < data_clumps_keys.length; j++) {
                let key = data_clumps_keys[j];
                allKeys[key] = true;
                let data_clump_key = data_clumps_keys[j];
                let data_clump = data_clumps[data_clump_key];
                let data_clump_data = data_clump.data_clump_data
                let amount_variables = Object.keys(data_clump_data).length;
                amount_variables_in_data_clumps.push(amount_variables);
                if(data_clump.data_clump_type == "parameters_to_fields_data_clump"){
                    uniqueParameterToFieldDataClumpKeys[key] = true;
                }
                else if(data_clump.data_clump_type == "parameters_to_parameters_data_clump"){
                    uniqueParameterToParameterDataClumpKeys[key] = true;
                }
                else if(data_clump.data_clump_type == "fields_to_fields_data_clump"){
                    uniqueFieldToFieldDataClumpKeys[key] = true;
                }
            }
    }

    if(!!earliest_timestamp){
        let earliest_date = new Date(earliest_timestamp * 1000);
        console.log("Earliest date: "+earliest_date)
        console.log("earliest_timestamp: "+earliest_timestamp)
    }
    if(!!latest_timestamp){
        let latest_date = new Date(latest_timestamp * 1000);
        console.log("Latest date: "+latest_date)
        console.log("Latest report file path: "+latest_report_file_path)
        console.log(latest_report_file_json?.project_info);
        console.log(latest_report_file_json?.report_summary)
    }

    if(earliest_timestamp !== undefined && latest_timestamp !== undefined){
        let maturity_development_time = latest_timestamp - earliest_timestamp;
        let maturity_development_time_days = maturity_development_time / (60 * 60 * 24);
        console.log("Maturity development time in days: "+maturity_development_time_days)
        let maturity_development_time_years = maturity_development_time_days / 365;
        console.log("Maturity development time in years: "+maturity_development_time_years)
    }

    let amountUniqueKeys = Object.keys(allKeys);
    console.log("UNIQUE total_amount_data_clumps: "+amountUniqueKeys.length);
    let amountUniqueFieldToFieldDataClumpKeys = Object.keys(uniqueFieldToFieldDataClumpKeys);
    console.log("UNIQUE total_amount_field_to_field_data_clumps: "+amountUniqueFieldToFieldDataClumpKeys.length);
    let amountUniqueParameterToParameterDataClumpKeys = Object.keys(uniqueParameterToParameterDataClumpKeys);
    console.log("UNIQUE total_amount_parameter_to_parameter_data_clumps: "+amountUniqueParameterToParameterDataClumpKeys.length);
    let amountUniqueParameterToFieldDataClumpKeys = Object.keys(uniqueParameterToFieldDataClumpKeys);
    console.log("UNIQUE total_amount_parameter_to_field_data_clumps: "+amountUniqueParameterToFieldDataClumpKeys.length);
    console.log("----")

    console.log("total_amount_data_clumps: "+total_amount_data_clumps);
    console.log("total_amount_parameter_to_parameter_data_clumps: "+total_amount_parameter_to_parameter_data_clumps);
    console.log("total_amount_parameter_to_fields_data_clumps: "+total_amount_parameter_to_fields_data_clumps);
    console.log("total_amount_fields_to_fields_data_clumps: "+total_amount_fields_to_fields_data_clumps);
    let medianAmountVariablesInDataClumps = getMedian(amount_variables_in_data_clumps);
    console.log("medianAmountVariablesInDataClumps: "+medianAmountVariablesInDataClumps);




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

