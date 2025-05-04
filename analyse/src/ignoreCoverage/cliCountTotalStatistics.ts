#!/usr/bin/env node

import fs from 'fs';
import {Timer} from "./Timer";
import {AnalyseHelper, NumberOccurenceDict} from "./AnalyseHelper";
import path from "path";


/**
 * Analyzes the distribution of data clumps across a set of report files.
 * This function processes each report file to gather statistics about data clumps,
 * classes, interfaces, and methods, and logs the results to the console.
 *
 * @param {string[]} all_report_files_paths - An array of file paths to the report files to be analyzed.
 * @returns {void} This function does not return a value. It logs the analysis results directly to the console.
 *
 * @throws {Error} Throws an error if any report file cannot be processed or if the data structure is invalid.
 */
function printDataClumpsClusterDistribution(all_report_files_paths: string[]){

    console.log("Counting data clumps cluster distribution ...")


    let total_amount_data_clumps = 0;
    let total_amount_parameter_to_parameter_data_clumps = 0;
    let total_amount_parameter_to_fields_data_clumps = 0;
    let total_amount_fields_to_fields_data_clumps = 0;

    let reports_with_data_clumps = 0;
    let numberOccurenceDictAmountClassesOrInterfaces = new NumberOccurenceDict();
    let numberOccurenceDictAmountMethods = new NumberOccurenceDict();
    let numberOccurenceDictAmountDataClumps = new NumberOccurenceDict();

    let numberOccurenceDictAmountClassesOrInterfacesInReportsWithDataClumps = new NumberOccurenceDict();
    let numberOccurenceDictAmountMethodsInReportsWithDataClumps = new NumberOccurenceDict();
    let numberOccurenceDictAmountDataClumpsInReportsWithDataClumps = new NumberOccurenceDict();

    let total_amount_classes_or_interfaces = 0;
    let total_amount_methods = 0;
    let total_amount_fields = 0;
    let total_amount_parameters = 0;

    let amount_variables_in_data_clumps = new NumberOccurenceDict();

    let uniqueDataClumpKeys: Record<string, boolean> = {};
    let uniqueFieldToFieldDataClumpKeys: Record<string, boolean> = {};
    let uniqueParameterToParameterDataClumpKeys: Record<string, boolean> = {};
    let uniqueParameterToFieldDataClumpKeys: Record<string, boolean> = {};

    console.log("Amount timestamps: "+all_report_files_paths.length)

    type StatisticsForProject = {
        project_name: string,
        number_class_and_interfaces_latest_commit: number,
        number_class_and_interfaces_total: number,
        number_methods_latest_commit: number,
        number_methods_total: number,
        number_fields_total: number,
        number_parameters_total: number,
        maturity_development_years: number,
        oldest_commit_date: Date,
        oldest_report_file_path: string,
        oldest_project_tag: string | null,
        newest_commit_date: Date,
        newest_report_file_path: string,
        newest_project_tag: string | null,
        number_of_data_clumps_latest_commit: number,
    }

    function analyseReportFileForProject(report_file_path: string, project_name: string){
        let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);
        let project_commit_date = AnalyseHelper.getDateFromDataClumpsContext(report_file_json);
        if(!!project_commit_date){
            if(!!project_name){
                if(dictStatisticsForProject[project_name] === undefined){
                    dictStatisticsForProject[project_name] = {
                        project_name: project_name,
                        number_class_and_interfaces_latest_commit: 0,
                        number_class_and_interfaces_total: 0,
                        number_methods_latest_commit: 0,
                        number_methods_total: 0,
                        number_fields_total: 0,
                        number_parameters_total: 0,
                        maturity_development_years: 0,
                        oldest_commit_date: project_commit_date,
                        oldest_report_file_path: report_file_path,
                        oldest_project_tag: report_file_json.project_info.project_tag,
                        newest_commit_date: project_commit_date,
                        newest_report_file_path: report_file_path,
                        newest_project_tag: report_file_json.project_info.project_tag,
                        number_of_data_clumps_latest_commit: 0,
                    }
                }

                let statisticsForProject = dictStatisticsForProject[project_name];

                statisticsForProject.number_class_and_interfaces_total += report_file_json?.project_info.number_of_classes_or_interfaces || 0;
                statisticsForProject.number_methods_total += report_file_json?.project_info.number_of_methods || 0;
                statisticsForProject.number_fields_total += report_file_json?.project_info.number_of_data_fields || 0;
                statisticsForProject.number_parameters_total += report_file_json?.project_info.number_of_method_parameters || 0;

                let saved_oldest_commit_date = statisticsForProject.oldest_commit_date;
                if(project_commit_date.getTime() < saved_oldest_commit_date.getTime()){
                    statisticsForProject.oldest_commit_date = project_commit_date;
                    statisticsForProject.oldest_report_file_path = report_file_path;
                    statisticsForProject.oldest_project_tag = report_file_json.project_info.project_tag;
                }


                let saved_newest_commit_date = statisticsForProject.newest_commit_date;
                let is_newest_commit_date = project_commit_date.getTime() > saved_newest_commit_date.getTime();

                if(is_newest_commit_date){
                    statisticsForProject.newest_commit_date = project_commit_date;
                    statisticsForProject.newest_report_file_path = report_file_path;
                    statisticsForProject.newest_project_tag = report_file_json.project_info.project_tag;
                }

                let maturity_development_time_milli_seconds = statisticsForProject.newest_commit_date.getTime() - statisticsForProject.oldest_commit_date.getTime();
                let maturity_development_time = maturity_development_time_milli_seconds / 1000;
                let maturity_development_time_days = maturity_development_time / (60 * 60 * 24);
                let maturity_development_time_years = maturity_development_time_days / 365;
                statisticsForProject.maturity_development_years = maturity_development_time_years;

                if(is_newest_commit_date){
                    statisticsForProject.number_class_and_interfaces_latest_commit = report_file_json?.project_info.number_of_classes_or_interfaces || 0;
                    statisticsForProject.number_methods_latest_commit = report_file_json?.project_info.number_of_methods || 0;
                    statisticsForProject.number_of_data_clumps_latest_commit = report_file_json?.report_summary.amount_data_clumps || 0;
                }

                dictStatisticsForProject[project_name] = statisticsForProject;
            }
        }
    }

    let dictStatisticsForProject: Record<string, StatisticsForProject> = {};

    let timer = new Timer();
    timer.start();
    for(let i = 0; i < all_report_files_paths.length; i++){
        let report_file_path = all_report_files_paths[i];
        let file_name = path.basename(report_file_path);
        let folder_name = path.dirname(report_file_path);

        let prefix = "Proccessing report file";
        timer.printEstimatedTimeRemaining({
            progress: i,
            total: all_report_files_paths.length,
            suffix: " - "+folder_name+" - "+file_name,
        });

        let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);

        let amount_data_clumps = report_file_json?.report_summary.amount_data_clumps || 0;
        total_amount_data_clumps += amount_data_clumps;
        numberOccurenceDictAmountDataClumps.addOccurence(amount_data_clumps, 1);

        let amount_classes_or_interfaces = report_file_json?.project_info.number_of_classes_or_interfaces || 0;
        total_amount_classes_or_interfaces += amount_classes_or_interfaces;
        numberOccurenceDictAmountClassesOrInterfaces.addOccurence(amount_classes_or_interfaces, 1);

        let amount_methods = report_file_json?.project_info.number_of_methods || 0;
        total_amount_methods += amount_methods;
        total_amount_fields += report_file_json?.project_info.number_of_data_fields || 0;
        total_amount_parameters += report_file_json?.project_info.number_of_method_parameters || 0;
        numberOccurenceDictAmountMethods.addOccurence(amount_methods, 1);



        if(amount_data_clumps > 0){
            reports_with_data_clumps++;

            numberOccurenceDictAmountClassesOrInterfacesInReportsWithDataClumps.addOccurence(amount_classes_or_interfaces, 1);
            numberOccurenceDictAmountMethodsInReportsWithDataClumps.addOccurence(amount_methods, 1);
            numberOccurenceDictAmountDataClumpsInReportsWithDataClumps.addOccurence(amount_data_clumps, 1);
        }

        let parameters_to_parameters_data_clump = report_file_json?.report_summary.parameters_to_parameters_data_clump || 0;
        total_amount_parameter_to_parameter_data_clumps += parameters_to_parameters_data_clump;

        let parameters_to_fields_data_clump = report_file_json?.report_summary.parameters_to_fields_data_clump || 0;
        total_amount_parameter_to_fields_data_clumps += parameters_to_fields_data_clump;

        let fields_to_fields_data_clump = report_file_json?.report_summary.fields_to_fields_data_clump || 0;
        total_amount_fields_to_fields_data_clumps += fields_to_fields_data_clump;

        let project_name = report_file_json.project_info.project_name;

        if(!!project_name){
            analyseReportFileForProject(report_file_path, project_name);
        }

        analyseReportFileForProject(report_file_path, "ALL PROJECTS");



        let data_clumps = report_file_json?.data_clumps || {}
        let data_clumps_keys = Object.keys(data_clumps);
        for(let j = 0; j < data_clumps_keys.length; j++) {
            let key = data_clumps_keys[j];
            uniqueDataClumpKeys[key] = true;
            let data_clump_key = data_clumps_keys[j];
            let data_clump = data_clumps[data_clump_key];
            let data_clump_data = data_clump.data_clump_data
            let amount_variables = Object.keys(data_clump_data).length;
            amount_variables_in_data_clumps.addOccurence(amount_variables, 1);
            if(data_clump.data_clump_type == AnalyseHelper.DataClumpType.PARAMETER_FIELD){
                uniqueParameterToFieldDataClumpKeys[key] = true;
            }
            else if(data_clump.data_clump_type == AnalyseHelper.DataClumpType.PARAMETER_PARAMETER){
                uniqueParameterToParameterDataClumpKeys[key] = true;
            }
            else if(data_clump.data_clump_type == AnalyseHelper.DataClumpType.FIELD_FIELD){
                uniqueFieldToFieldDataClumpKeys[key] = true;
            }
        }
    }

    // print information about the projects
    let projectNames = Object.keys(dictStatisticsForProject);
    console.log("Amount projects: "+projectNames.length);
    for(let i = 0; i < projectNames.length; i++){
        let projectName = projectNames[i];
        let statisticsForProject = dictStatisticsForProject[projectName];
        console.log(JSON.stringify(statisticsForProject, null, 2));
        console.log("----")
    }

    console.log("Total amount of reports: "+all_report_files_paths.length);
    console.log("total_amount_classes_or_interfaces: "+total_amount_classes_or_interfaces);
    console.log("total_amount_methods: "+total_amount_methods);
    console.log("total_amount_fields: "+total_amount_fields);
    console.log("total_amount_parameters: "+total_amount_parameters);
    const average_amount_fields_per_class = total_amount_fields / total_amount_classes_or_interfaces;
    console.log("average_amount_fields_per_class: "+average_amount_fields_per_class);
    const average_amount_parameters_per_method = total_amount_parameters / total_amount_methods;
    console.log("average_amount_parameters_per_method: "+average_amount_parameters_per_method);

    console.log("reports_with_data_clumps: "+reports_with_data_clumps);
    console.log("Median amount classes or interfaces: "+numberOccurenceDictAmountClassesOrInterfaces.getMedian());
    console.log("Median amount methods: "+numberOccurenceDictAmountMethods.getMedian());
    console.log("Median amount data clumps: "+numberOccurenceDictAmountDataClumps.getMedian());
    console.log("Median amount classes or interfaces in reports with data clumps: "+numberOccurenceDictAmountClassesOrInterfacesInReportsWithDataClumps.getMedian());
    console.log("Median amount methods in reports with data clumps: "+numberOccurenceDictAmountMethodsInReportsWithDataClumps.getMedian());
    console.log("Median amount data clumps in reports with data clumps: "+numberOccurenceDictAmountDataClumpsInReportsWithDataClumps.getMedian());

    let amountUniqueKeys = Object.keys(uniqueDataClumpKeys);
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
    let medianAmountVariablesInDataClumps = amount_variables_in_data_clumps.getMedian();
    console.log("medianAmountVariablesInDataClumps: "+medianAmountVariablesInDataClumps);




}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps-Clusters");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
    console.log("all_report_files_paths: "+all_report_files_paths.length);

    //printHistogram(sorted_timestamps, timestamp_to_file_paths);
    let filecontent = printDataClumpsClusterDistribution(all_report_files_paths);
    return filecontent;
}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        description: "General Statistics",
        require_report_path: true,
        require_output_path: false,
    })

    const report_folder = options.report_folder;
    let filecontent = await analyse(report_folder, options);

}

main();

