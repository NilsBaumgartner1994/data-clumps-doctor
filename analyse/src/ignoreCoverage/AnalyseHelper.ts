#!/usr/bin/env node

import fs from "fs";
import path from "path";
import {DataClumpTypeContext} from "data-clumps-type-context";

export class AnalyseHelper {

    static printProgress(files, total_files, data_clumps, total_data_clumps){
        console.log("Progress analysing files: "+files.toString().padStart(4, "0")+
            "/"+total_files.toString().padStart(4, "0")+
            " - Data Clumps: "+data_clumps.toString().padStart(6, "0")+
            "/"+total_data_clumps.toString().padStart(6, "0"));
    }

    /**
     * Processes an array of report file paths and maps each unique project commit date
     * to its corresponding file paths.
     *
     * This method reads each report file, extracts the project commit date, and organizes
     * the file paths based on these timestamps. The commit date is expected to be in
     * Unix timestamp format.
     *
     * @param {string[]} all_report_files_paths - An array of strings representing the
     * paths to the report files to be processed.
     *
     * @returns {Object<number, string[]>} An object where each key is a Unix timestamp
     * representing the project commit date, and the value is an array of file paths
     * associated with that timestamp.
     *
     * @throws {Error} Throws an error if a report file cannot be read or if the JSON
     * parsing fails.
     */
    static time_stamp_to_file_paths(all_report_files_paths: string[]){

        console.log("Get timestamps for all report files");
        let timestamp_to_file_path = {};
        for(let i = 0; i <all_report_files_paths.length; i++){
            console.log("Progress: "+(i+1)+"/"+all_report_files_paths.length);
            let report_file_path = all_report_files_paths[i];
            let report_file = fs.readFileSync(report_file_path, 'utf8');
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

    /**
     * Recursively retrieves all report files with a .json extension from a specified folder and its subfolders.
     *
     * This method scans the provided folder path for files and directories. If a directory is found, it will
     * recursively search within that directory for additional report files. Only files ending with the .json
     * extension are collected and returned in an array of file paths.
     *
     * @param {string} folder_path - The path to the folder to search for report files.
     * @returns {string[]} An array of file paths for all found report files with a .json extension.
     *
     * @throws {Error} Throws an error if the folder_path is invalid or if there are issues reading the directory.
     */
    static getAllReportFilesRecursiveInFolder(folder_path){
        let all_report_files = fs.readdirSync(folder_path);
        let all_report_files_paths: any = [];
        for (let i = 0; i < all_report_files.length; i++) {
            let report_file = all_report_files[i];
            let report_file_path = path.join(folder_path, report_file);
            if(fs.lstatSync(report_file_path).isDirectory()){
                let all_report_files_paths_in_subfolder = AnalyseHelper.getAllReportFilesRecursiveInFolder(report_file_path);
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
     * Calculates the median of a list of numerical values.
     *
     * The median is the value separating the higher half from the lower half of a data sample.
     * If the list has an odd number of observations, the median is the middle number.
     * If the list has an even number of observations, the median is the average of the two middle numbers.
     *
     * @param {number[]} listOfValues - An array of numbers for which the median is to be calculated.
     * @returns {number} The median value of the provided list of numbers.
     *
     * @throws {Error} Throws an error if the input array is empty.
     */
    static getMedian(listOfValues: number[]): number {
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
     * Generates a string representation of a variable assignment
     * in the format of "variableName = JSON.stringify(values)".
     *
     * @param {string} nameOfVariable - The name of the variable to be assigned.
     * @param {Record<string, number>} values - An object containing key-value pairs
     *        where keys are strings and values are numbers.
     * @returns {string} A formatted string that represents the variable assignment.
     *
     * @throws {Error} Throws an error if the input values are not in the expected format.
     */
    static getValuesForRecord(nameOfVariable: string, values: Record<string, number>): string {
        let fileContent = "";
        fileContent += "\n";
        fileContent += nameOfVariable+"= "+JSON.stringify(values);+"\n";
        fileContent += "\n";

        return fileContent;
    }

    /**
     * Get the method parameter list from a parameter-parameter or parameter-field data clump from the method key. This is not safe, because the method key does not neccessarily have to be a method signature.
     * @deprecated
     * @param data_clump
     */
    static getUnsafeMethodParameterListFromMethod(data_clump: DataClumpTypeContext){
        let fromMethodKey = data_clump.from_method_key;
        if(!fromMethodKey){
            console.error("ERROR: No fromMethodKey provided for data clump: "+data_clump.key)
            return null;
        }
        let method_parameters_list = fromMethodKey.split("(")[1].split(")")[0].split(", ");
        return method_parameters_list;
    }

    /**
     * Generates a formatted string containing the median value and a list of values
     * for a specified variable name.
     *
     * @param {string} nameOfVariable - The name of the variable for which the values are being processed.
     * @param {number[]} listOfValues - An array of numerical values to analyze.
     * @returns {string} A formatted string that includes the median of the provided values
     *                  and the list of values in a specific format.
     *
     * @throws {Error} Throws an error if the input listOfValues is empty.
     */
    static getValuesFor(nameOfVariable: string, listOfValues: number[]){
        let fileContent = "";
        let median = AnalyseHelper.getMedian(listOfValues);
        //console.log("Median for "+nameOfVariable+": "+median)
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
}