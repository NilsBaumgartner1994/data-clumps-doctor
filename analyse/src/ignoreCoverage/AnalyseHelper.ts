#!/usr/bin/env node

import fs from "fs";
import path from "path";
import {DataClumpsTypeContext, DataClumpTypeContext} from "data-clumps-type-context";
import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {Timer} from "./Timer";

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

export type PartialTimerProgressObject = {
    progressOffset: number,
    totalAmountFiles: number,
    timer: Timer,
    suffix?: string,
}

export class AnalyseHelper {

    static DataClumpType = {
        PARAMETER_PARAMETER: "parameters_to_parameters_data_clump",
        PARAMETER_FIELD: "parameters_to_fields_data_clump",
        FIELD_FIELD: "fields_to_fields_data_clump",
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
     * @param partialTimerProgressObject
     * @returns {Object<number, string[]>} An object where each key is a Unix timestamp
     * representing the project commit date, and the value is an array of file paths
     * associated with that timestamp.
     *
     * @throws {Error} Throws an error if a report file cannot be read or if the JSON
     * parsing fails.
     */
    private static time_stamp_to_file_paths(all_report_files_paths: string[], partialTimerProgressObject?: PartialTimerProgressObject): Record<number, string[]> {

        let timestamp_to_file_path = {};
        for(let i = 0; i <all_report_files_paths.length; i++){
            let report_file_path = all_report_files_paths[i];
            let report_file_name = path.basename(report_file_path);

            if(partialTimerProgressObject){
                partialTimerProgressObject.timer.printEstimatedTimeRemaining({
                    progress: partialTimerProgressObject.progressOffset+i,
                    total: partialTimerProgressObject.totalAmountFiles,
                    suffix: partialTimerProgressObject.suffix+" - File: "+report_file_name,
                })
            }


            let report_file = fs.readFileSync(report_file_path, 'utf8');
            let report_file_json = JSON.parse(report_file);
            let project_commit_date = report_file_json?.project_info?.project_commit_date;
            project_commit_date = parseInt(project_commit_date); // unix timestamp

            if(timestamp_to_file_path[project_commit_date] === undefined){
                timestamp_to_file_path[project_commit_date] = [report_file_path]
            }
            else{
                console.log("WARNING: Multiple reports with the same timestamp: "+project_commit_date);
                console.log(" - "+report_file_path);
                console.log(" - "+timestamp_to_file_path[project_commit_date]);
                //timestamp_to_file_path[project_commit_date].push(report_file_path)
            }
        }

        return timestamp_to_file_path;
    }

    private static getSortedTimestamps(timestamp_to_file_path: Record<number, string[]>){
        let sorted_timestamps = Object.keys(timestamp_to_file_path)
        return sorted_timestamps;
    }

    static getSortedReportFilePathsByTimestamps(folder_path: string, partialTimerProgressObject?: PartialTimerProgressObject){
        let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(folder_path);
        let timestamp_to_file_paths = AnalyseHelper.time_stamp_to_file_paths(all_report_files_paths, partialTimerProgressObject);
        let sorted_timestamps = AnalyseHelper.getSortedTimestamps(timestamp_to_file_paths);
        let sorted_report_file_paths = [];
        for(let i = 0; i < sorted_timestamps.length; i++){
            let timestamp = sorted_timestamps[i];
            let file_paths = timestamp_to_file_paths[timestamp];
            sorted_report_file_paths = sorted_report_file_paths.concat(file_paths);
        }
        return sorted_report_file_paths;
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
    static getAllReportFilePathsRecursiveInFolder(folder_path): string[]{
        let all_report_files = fs.readdirSync(folder_path);
        let all_report_files_paths: any = [];
        for (let i = 0; i < all_report_files.length; i++) {
            let report_file = all_report_files[i];
            let report_file_path = path.join(folder_path, report_file);
            if(fs.lstatSync(report_file_path).isDirectory()){
                let all_report_files_paths_in_subfolder = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_file_path);
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
    static getPythonValuesFor(nameOfVariable: string, listOfValues: number[]){
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

    static getPythonAllDataValuesForOccurenceDict(nameOfVariable: string, occurenceDict: GenericOccurenceDict<number>){
        let fileContent = "";
        fileContent += `${nameOfVariable}_occurence_dict = ${JSON.stringify(occurenceDict.occurenceDict)};\n`;
        fileContent += `all_data['${nameOfVariable}'] = expand_frequency_dict(${nameOfVariable}_occurence_dict);\n`;
        fileContent += `manual_labels_array.append('${nameOfVariable}');\n`;
        return fileContent;
    }

    static getReportFileJson(report_file_path: string): DataClumpsTypeContext{
        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json = JSON.parse(report_file);
        return report_file_json;
    }

    static getDateFromDataClumpsContext(report_file_json: DataClumpsTypeContext): Date | null {
        let project_commit_date = report_file_json.project_info.project_commit_date
        if(!!project_commit_date){
            // project_commit_date: '1360449946',
            let timestamp = parseInt(project_commit_date);
            if(!isNaN(timestamp)){
                let earliest_allowed_timestamp = 10;
                // check if not 1970
                if(timestamp >= earliest_allowed_timestamp){
                    // transform unix timestamp to date
                    let date = new Date(timestamp*1000);
                    return date;
                }
            }
        }
        return null;
    }

    static getCommandForAnalysis(argv: NodeJS.Process | string[], options: {
        description?: string,
        require_report_path: boolean,
        require_output_path: boolean,
        default_output_filename_without_extension?: string,
    }) {
        const current_working_directory = process.cwd();
        const program = new Command();
        program
            .description(options?.description || 'Analyse Detected Data-Clumps\n\n' +
                'This script performs data clumps detection in a given directory.\n\n' +
                'npx data-clumps-doctor [options] <path_to_folder>')
            .version(version);

        program.option('--report_folder <path>', 'Report path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/') // Default value is './data-clumps.json'
        program.option('--output <path>', 'Output path for script', current_working_directory+'/'+
            (options.default_output_filename_without_extension || 'data-clumps-doctor-output-'+Analyzer.project_name_variable_placeholder)
            +'.py') // Default value is './data-clumps.json'

        if(argv instanceof Array){
            program.parse(argv);
        } else {
            program.parse(argv.argv);
        }

        let options_values = program.opts();

        if(options.require_output_path){
            if(!options_values.output && !options.default_output_filename_without_extension){
                console.error("ERROR: No output path provided");
                process.exit(1);
            }
        }

        if(options.require_report_path){
            if(!options_values.report_folder){
                console.error("ERROR: No report folder provided");
                process.exit(1);
            }
        }

        let program_options = program.opts();
        if(!program_options.output && options.default_output_filename_without_extension){
            program_options.output = options.default_output_filename_without_extension;
        }

        // get from output path split the last part and set it as output_filename without extension
        let output_filename_without_extension = program_options.output.split('/').pop().split('.').shift();
        program_options.output_filename_without_extension = output_filename_without_extension;

        return program_options;
    }


    static getPythonLibrariesFileContent(){
        return "import matplotlib.pyplot as plt\n" +
            "import numpy as np\n" +
            "import textwrap\n" +
            "from numpy import nan\n" +
            "import pandas as pd\n" +
            "import math\n" +
            "import csv\n" +
            "import matplotlib\n" +
            "#matplotlib.rcParams.update({'font.size': 18})\n" +
            "NaN = nan\n" +
            ""+"\n"+
            "def expand_frequency_dict(freq_dict):\n" +
            "    expanded_list = []\n" +
            "    for number, count in freq_dict.items():\n" +
            "        number = float(number)  # Convert keys to integers\n" +
            "        expanded_list.extend([number] * count)\n" +
            "    return expanded_list\n" +
            "\n";
    }

    static getPythonStatisticsForDataValues(){
        return `
# Berechnung der Statistik-Werte
statistics = {}
for label, values in all_data.items():
    values_sorted = np.sort(values)
    sum_value = sum(values_sorted)
    q1 = np.percentile(values_sorted, 25)
    median = np.median(values_sorted)
    q3 = np.percentile(values_sorted, 75)
    # Whisker-Berechnung
    iqr = q3 - q1
    lower_whisker = np.min(values_sorted[values_sorted >= (q1 - 1.5 * iqr)])
    upper_whisker = np.max(values_sorted[values_sorted <= (q3 + 1.5 * iqr)])
    min_value = np.min(values_sorted)
    max_value = np.max(values_sorted)
    statistics[label] = {
        'Q1': q1, 'Median': median, 'Q3': q3,
        'Lower Whisker': lower_whisker, 'Upper Whisker': upper_whisker,
        'Min': min_value, 'Max': max_value
    }

    print(f"{label}: Q1 = {q1:.2f}, Median = {median:.2f}, Q3 = {q3:.2f}, "
          f"Lower Whisker = {lower_whisker:.2f}, Upper Whisker = {upper_whisker:.2f}, "
          f"Min = {min_value:.2f}, Max = {max_value:.2f}, Sum = {sum_value:.2f}")        
`+"\n";
    }

    static getPrimaryColor(){
        return "#AC0634";
    }

    static getPrimaryColorRGB(){
        let hex = AnalyseHelper.getPrimaryColor();
        let rgb = AnalyseHelper.hexToRgb(hex);
        return rgb;
    }

    static hexToRgb(hex: string){
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        return {
            r: r,
            g: g,
            b: b
        }
    }

    static getPythonPrimaryColor(){
        return "(172/255, 6/255, 52/255)"
    }

    static getPythonMedianColor(){
        let rgb = AnalyseHelper.getPrimaryColorRGB();
        return `medianprops={'color': (${rgb.r}/255, ${rgb.g}/255, ${rgb.b}/255)}`;
    }

    static getPythonSubplot(output_filename_without_extension?: string){
        return `plt.subplots(num='${output_filename_without_extension? output_filename_without_extension+".pdf" : "Figure_1"}')`
    }

    static getPythonPlot(options: {
        output_filename_without_extension?: string,
        y_label: string,
        y_max?: number,
        y_ticks?: number,
        offset_left: number,
        offset_right: number,
        offset_top: number,
        offset_bottom: number,
        width_inches: number,
        height_inches: number,
        w_bar_width?: number,
        x_labels?: string[],
        use_manual_labels?: boolean,
    }){
        let pltXticks = "plt.xticks(range(1, len(labels) + 1), labels)";
        if(options.x_labels){
            pltXticks = "plt.xticks(range(1, len(labels) + 1), "+JSON.stringify(options.x_labels)+")";
        } else if(options.use_manual_labels){
            pltXticks = "plt.xticks(range(1, len(manual_labels_array) + 1), manual_labels_array)";
        }

        let pltYticks = "";
        if(options.y_max){
            pltYticks += `y_max = ${options.y_max}\n` +
                "ax1.set_ylim([0, y_max])\n";
        }
        if(options.y_ticks){
            if(!options.y_max){
                pltYticks += `y_max = max([max(data[i]) for i in range(len(data))])\n`;
            }
            pltYticks += `y_steps = ${options.y_ticks || 1}\n` +
            `ax1.set_yticks(range(0, y_max+1, y_steps))\n`;
        }

        let pltBarWidth = "";
        if(options.w_bar_width){
            pltBarWidth = `width = ${options.w_bar_width}, `;
        }

        return `
\n        
fig, ax1 = ${AnalyseHelper.getPythonSubplot(options.output_filename_without_extension)}
plt.boxplot(data, ${pltBarWidth} ${AnalyseHelper.getPythonMedianColor()})  # RGB umgerechnet auf 0-1 Skala
ax1.set(ylabel='${options.y_label}')
${pltXticks}
${pltYticks}
plt.subplots_adjust(left=${options.offset_left}, right=${options.offset_right}, top=${options.offset_top}, bottom=${options.offset_bottom})
fig.set_size_inches(${options.width_inches}, ${options.height_inches}, forward=True)
${AnalyseHelper.getPythonFigDpiSetttingsAndShow()}
`
    }

    static getPythonFigDpiSetttingsAndShow(){
        return "fig.set_dpi(400)\n"+
            "plt.show()\n";
    }
}

class GenericOccurenceDict<T extends string | number | symbol> {
    public occurenceDict: Record<T, number>;

    constructor() {
        // @ts-ignore
        this.occurenceDict = {};
    }

    public addOccurence(key: T, occurences: number) {
        if (this.occurenceDict[key] === undefined) {
            this.occurenceDict[key] = occurences;
        } else {
            this.occurenceDict[key] += occurences;
        }
    }

    public getOccurence(key: T): number {
        return this.occurenceDict[key];
    }

    public getKeys(): T[] {
        return Object.keys(this.occurenceDict) as T[];
    }

    public concat(occurenceDict: GenericOccurenceDict<T>){
        let keys = occurenceDict.getKeys();
        for(let i = 0; i < keys.length; i++){
            let key = keys[i];
            let occurences = occurenceDict.getOccurence(key);
            this.addOccurence(key, occurences);
        }
    }
}

export class StringOccurenceDict extends GenericOccurenceDict<string> {
    constructor() {
        super();
    }
}

export class NumberOccurenceDict extends GenericOccurenceDict<number> {
    constructor() {
        super();
    }

    public getMedian(): number {
        let valuesKeys = Object.keys(this.occurenceDict).map(Number);
        let sortedValues = valuesKeys.sort((a, b) => a - b);
        let totalNumberOfOccuences = 0;
        for(let i = 0; i < sortedValues.length; i++){
            totalNumberOfOccuences += this.getOccurence(sortedValues[i]);
        }
        let medianIndex = totalNumberOfOccuences / 2;
        let isEven = totalNumberOfOccuences % 2 === 0;
        let median = 0;
        let currentNumberOfOccurences = 0;
        for(let i = 0; i < sortedValues.length; i++){
            currentNumberOfOccurences += this.occurenceDict[sortedValues[i]];
            if(currentNumberOfOccurences >= medianIndex){
                if(isEven){
                    let nextValue = sortedValues[i+1];
                    let medianValue = (sortedValues[i] + nextValue) / 2;
                    median = medianValue;
                }
                else{
                    median = sortedValues[i];
                }
                break;
            }
        }
        return median;
    }
}