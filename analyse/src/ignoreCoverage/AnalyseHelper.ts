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