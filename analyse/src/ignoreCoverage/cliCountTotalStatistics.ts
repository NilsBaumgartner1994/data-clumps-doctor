#!/usr/bin/env node

import fs from 'fs';
import {Timer} from "./Timer";
import {AnalyseHelper, NumberOccurenceDict} from "./AnalyseHelper";
import path from "path";


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

    let numberFieldToFieldDataClumpsPerClassOrInterface = new NumberOccurenceDict();
    let numberParameterToParameterAndParameterToFieldDataClumpsPerMethod = new NumberOccurenceDict();
    let numberOccurenceDataClumpsPerReport = new NumberOccurenceDict();

    let numberOccurenceDictAmountClassesOrInterfacesInReportsWithDataClumps = new NumberOccurenceDict();
    let numberOccurenceDictAmountMethodsInReportsWithDataClumps = new NumberOccurenceDict();
    let numberOccurenceDictAmountDataClumpsInReportsWithDataClumps = new NumberOccurenceDict();

    let numberOccurenceDictFieldToClasses = new NumberOccurenceDict();
    let highestMedianFieldToClasses = 0;
    let highestMaximumFieldToClasses = 0;
    let numberOccurenceDictParameterToMethods = new NumberOccurenceDict();
    let highestMedianParameterToMethods = 0;
    let highestMaximumParameterToMethods = 0;
    let numberOccurenceDictParameterToFields = new NumberOccurenceDict();
    let highestMedianParameterToFields = 0;
    let highestMaximumParameterToFields = 0;

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

    /**
     * Analyzes a report file for a given project and updates statistics accordingly.
     *
     * @param {string} report_file_path - The path to the report file to be analyzed.
     * @param {string} project_name - The name of the project associated with the report file.
     */
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

                let reportSummaryAdditional = report_file_json.report_summary.additional;
                if(!!reportSummaryAdditional){
                    let invertedIndexSoftwareProjectStatistics = reportSummaryAdditional.invertedIndexSoftwareProjectStatistics;
                    // "invertedIndexSoftwareProjectStatistics": {
                    //         "invertedFieldToClasses": {
                    //           "median": 1.5,
                    //           "maximum": 4,
                    //           "average": 1.11864406779661,
                    //           "amountSavedValuesForKeys": 264,
                    //           "amountKeys": 4
                    //         },
                    //         "invertedParameterToMethods": {
                    //         },
                    //         "invertedParameterToClasses": {
                    //         }
                    if(!!invertedIndexSoftwareProjectStatistics){
                        //console.log("invertedIndexSoftwareProjectStatistics")
                        //console.log(JSON.stringify(invertedIndexSoftwareProjectStatistics, null, 2));
                        let invertedFieldToClasses = invertedIndexSoftwareProjectStatistics.invertedFieldToClasses;
                        if(!!invertedFieldToClasses){
                            let amountKeys = invertedFieldToClasses.amountKeys;
                            let average = invertedFieldToClasses.average;
                            let amountSavedValuesForKeys = invertedFieldToClasses.amountSavedValuesForKeys;
                            if(!!average && !!amountSavedValuesForKeys){
                                numberOccurenceDictFieldToClasses.addOccurence(average, amountSavedValuesForKeys);
                            }
                            let median = invertedFieldToClasses.median;
                            if(median > highestMedianFieldToClasses){
                                highestMedianFieldToClasses = median;
                            }
                            let maximum = invertedFieldToClasses.maximum;
                            if(maximum > highestMaximumFieldToClasses){
                                highestMaximumFieldToClasses = maximum;
                            }
                        }
                        let invertedParameterToMethods = invertedIndexSoftwareProjectStatistics.invertedParameterToMethods;
                        if(!!invertedParameterToMethods){
                            let amountKeys = invertedParameterToMethods.amountKeys;
                            let average = invertedParameterToMethods.average;
                            let amountSavedValuesForKeys = invertedParameterToMethods.amountSavedValuesForKeys;
                            if(!!average && !!amountSavedValuesForKeys){
                                numberOccurenceDictParameterToMethods.addOccurence(average, amountSavedValuesForKeys);
                            }
                            let median = invertedParameterToMethods.median;
                            if(median > highestMedianParameterToMethods){
                                highestMedianParameterToMethods = median;
                            }
                            let maximum = invertedParameterToMethods.maximum;
                            if(maximum > highestMaximumParameterToMethods){
                                highestMaximumParameterToMethods = maximum;
                            }
                        }
                        let invertedParameterToClasses = invertedIndexSoftwareProjectStatistics.invertedParameterToClasses;
                        if(!!invertedParameterToClasses){
                            let amountKeys = invertedParameterToClasses.amountKeys;
                            let average = invertedParameterToClasses.average;
                            let amountSavedValuesForKeys = invertedParameterToClasses.amountSavedValuesForKeys;
                            if(!!average && !!amountSavedValuesForKeys){
                                numberOccurenceDictParameterToFields.addOccurence(average, amountSavedValuesForKeys);
                            }
                            let median = invertedParameterToClasses.median;
                            if(median > highestMedianParameterToFields){
                                highestMedianParameterToFields = median;
                            }
                            let maximum = invertedParameterToClasses.maximum;
                            if(maximum > highestMaximumParameterToFields){
                                highestMaximumParameterToFields = maximum;
                            }
                        }
                    }
                }

                let number_of_classes_or_interfaces = report_file_json?.project_info.number_of_classes_or_interfaces || 0;
                statisticsForProject.number_class_and_interfaces_total += number_of_classes_or_interfaces;
                let number_of_methods = report_file_json?.project_info.number_of_methods || 0;
                statisticsForProject.number_methods_total += number_of_methods
                let number_of_fields = report_file_json?.project_info.number_of_data_fields || 0;
                statisticsForProject.number_fields_total += number_of_fields
                statisticsForProject.number_parameters_total += report_file_json?.project_info.number_of_method_parameters || 0;

                let number_of_fields_to_fields_data_clumps = report_file_json?.report_summary.fields_to_fields_data_clump || 0;
                if(number_of_fields_to_fields_data_clumps > 0){
                    let average_number_field_to_field_data_clumps_per_class_or_interface = number_of_fields_to_fields_data_clumps / number_of_classes_or_interfaces;
                    numberFieldToFieldDataClumpsPerClassOrInterface.addOccurence(Math.round(average_number_field_to_field_data_clumps_per_class_or_interface), 1);
                }

                let numner_of_parameters_to_parameters_data_clump = report_file_json?.report_summary.parameters_to_parameters_data_clump || 0;
                let number_of_parameters_to_fields_data_clump = report_file_json?.report_summary.parameters_to_fields_data_clump || 0;
                let number_of_parameter_to_parameter_and_parameter_to_field_data_clumps = numner_of_parameters_to_parameters_data_clump + number_of_parameters_to_fields_data_clump;
                if(number_of_parameter_to_parameter_and_parameter_to_field_data_clumps > 0){
                    let average_number_parameter_to_parameter_and_parameter_to_field_data_clumps_per_method = number_of_parameter_to_parameter_and_parameter_to_field_data_clumps / number_of_methods;
                    numberParameterToParameterAndParameterToFieldDataClumpsPerMethod.addOccurence(Math.round(average_number_parameter_to_parameter_and_parameter_to_field_data_clumps_per_method), 1);
                }

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
    const average_amount_classes_or_interfaces_per_report = total_amount_classes_or_interfaces / all_report_files_paths.length;
    console.log("average_amount_classes_or_interfaces_per_report: "+average_amount_classes_or_interfaces_per_report);
    const average_amount_methods_per_class_or_interface = total_amount_methods / total_amount_classes_or_interfaces;
    console.log("average_amount_methods_per_class_or_interface: "+average_amount_methods_per_class_or_interface);
    const average_amount_fields_per_class = total_amount_fields / total_amount_classes_or_interfaces;
    console.log("average_amount_fields_per_class: "+average_amount_fields_per_class);
    const average_amount_parameters_per_method = total_amount_parameters / total_amount_methods;
    console.log("average_amount_parameters_per_method: "+average_amount_parameters_per_method);
    console.log("---");
    const average_amount_data_clumps_per_report = total_amount_data_clumps / all_report_files_paths.length;
    console.log("average_amount_data_clumps_per_report: "+average_amount_data_clumps_per_report);
    const average_amount_data_clumps_per_class_or_interface = total_amount_data_clumps / total_amount_classes_or_interfaces;
    console.log("average_amount_data_clumps_per_class_or_interface: "+average_amount_data_clumps_per_class_or_interface);
    const average_amount_data_clumps_per_method = total_amount_data_clumps / total_amount_methods;
    console.log("average_amount_data_clumps_per_method: "+average_amount_data_clumps_per_method);
    const average_amount_field_to_field_data_clumps_per_class_or_interface = total_amount_fields_to_fields_data_clumps / total_amount_classes_or_interfaces;
    console.log("average_amount_field_to_field_data_clumps_per_class_or_interface: "+average_amount_field_to_field_data_clumps_per_class_or_interface);
    const average_amount_parameter_to_parameter_and_parameter_to_field_data_clumps_per_method = (total_amount_parameter_to_parameter_data_clumps + total_amount_parameter_to_fields_data_clumps) / total_amount_methods;
    console.log("average_amount_parameter_to_parameter_and_parameter_to_field_data_clumps_per_method: "+average_amount_parameter_to_parameter_and_parameter_to_field_data_clumps_per_method);
    console.log("---");
    console.log("invertedFieldToClasses: ");
    console.log("  highestMedianFieldToClasses: "+highestMedianFieldToClasses);
    console.log("  highestMaximumFieldToClasses: "+highestMaximumFieldToClasses);
    console.log("  average: "+numberOccurenceDictFieldToClasses.getAverage());
    console.log("invertedParameterToMethods: ");
    console.log("  highestMedianParameterToMethods: "+highestMedianParameterToMethods);
    console.log("  highestMaximumParameterToMethods: "+highestMaximumParameterToMethods);
    console.log("  average: "+numberOccurenceDictParameterToMethods.getAverage());
    console.log("invertedParameterToFields: ");
    console.log("  highestMedianParameterToFields: "+highestMedianParameterToFields);
    console.log("  highestMaximumParameterToFields: "+highestMaximumParameterToFields);
    console.log("  average: "+numberOccurenceDictParameterToFields.getAverage());
    console.log("----")
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

    let medianAverageFieldToFieldDataClumpsPerClassOrInterface = numberFieldToFieldDataClumpsPerClassOrInterface.getMedian();
    console.log("medianAverageFieldToFieldDataClumpsPerClassOrInterface: "+medianAverageFieldToFieldDataClumpsPerClassOrInterface);
    let medianAverageParameterToParameterAndParameterToFieldDataClumpsPerMethod = numberParameterToParameterAndParameterToFieldDataClumpsPerMethod.getMedian();
    console.log("medianAmountParameterToParameterAndParameterToFieldDataClumpsPerMethod: "+medianAverageParameterToParameterAndParameterToFieldDataClumpsPerMethod);


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

