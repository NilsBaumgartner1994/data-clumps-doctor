#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {AnalyseHelper} from "./AnalyseHelper";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext, DataClumpsVariableToContext,
    DataClumpTypeContext,
    Dictionary, Position
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
    .option('--output <path>', 'Output path for script', current_working_directory+'/DistributionDataClumpFileDistance.py') // Default value is './data-clumps.json'

function addAmount(amountDict: Record<string, number>, newAdditionalAmount: Record<string, number>): Record<string, number> {
    for (const key in newAdditionalAmount) {
        if (newAdditionalAmount.hasOwnProperty(key)) {
            amountDict[key] = (amountDict[key] || 0) + newAdditionalAmount[key];
        }
    }
    return amountDict;
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "" +
        "import matplotlib.pyplot as plt\n" +
        "import numpy as np\n" +
        "import textwrap\n" +
        "from numpy import nan\n" +
        "import pandas as pd\n" +
        "import math\n" +
        "import csv\n" +
        "import matplotlib\n" +
        "#matplotlib.rcParams.update({'font.size': 18})\n" +
        "NaN = nan\n" +
        "def expand_frequency_dict(freq_dict):\n" +
        "    expanded_list = []\n" +
        "    for number, count in freq_dict.items():\n" +
        "        number = float(number)  # Convert keys to integers\n" +
        "        expanded_list.extend([number] * count)\n" +
        "    return expanded_list\n" +
        "\n";

    let class_amount_data_clumps: Record<string, number> = {}; // key:distance, value:amount
    let method_amount_data_clumps: Record<string, number> = {}; // key:distance, value:amount


    let timer = new Timer()
    timer.start();
    let lastElapsedTime = 0;

    let all_report_files_paths = AnalyseHelper.getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

    //let parameter_data_clump_found = false;
    //let field_data_clump_found = false;
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
                console.log("Analysing file: "+report_file_path);
                AnalyseHelper.printProgress(progress_files, total_amount_of_report_files, progress_data_clumps, amount_of_data_clumps);
                timer.printElapsedTime()
                timer.printEstimatedTimeRemaining(progress_files, total_amount_of_report_files)
                lastElapsedTime = elaspedTime
            }

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){ // Skip already analysed data clumps
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true; // Mark as analysed

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data
                let data_clump_type = data_clump.data_clump_type; // 'parameters_to_parameters_data_clump' or 'fields_to_fields_data_clump' or "parameters_to_fields_data_clump"


                if(data_clump_type === "parameters_to_parameters_data_clump"){
                    let method_key = data_clump.from_method_key;
                    if(!!method_key){
                        addAmount(method_amount_data_clumps, {[method_key]: 1});
                    }
                } else if(data_clump_type === "fields_to_fields_data_clump"){
                    let class_key = data_clump.from_class_or_interface_key
                    if(!!class_key){
                        addAmount(class_amount_data_clumps, {[class_key]: 1});
                    }
                } else if(data_clump_type === "parameters_to_fields_data_clump"){
                    let method_key = data_clump.from_method_key;
                    if(!!method_key){
                        addAmount(method_amount_data_clumps, {[method_key]: 1});
                    }
                    // Not needed as the data clump is from parameters to fields
                    //let class_key = data_clump.to_class_or_interface_key´
                    //if(!!class_key){
                    //    addAmount(class_amount_data_clumps, {[class_key]: 1});
                    //}
                }
            }
        }

    }

    console.log("Start analysing distances");

    let distributionNumberOfDataClumpsPerClass: Record<number, number> = {};
    let distributionNumberOfDataClumpsPerMethod: Record<number, number> = {};

    let class_keys = Object.keys(class_amount_data_clumps);
    for(let i = 0; i < class_keys.length; i++) {
        let class_key = class_keys[i];
        let amount = class_amount_data_clumps[class_key];
        addAmount(distributionNumberOfDataClumpsPerClass, {[amount]: 1});
    }

    let method_keys = Object.keys(method_amount_data_clumps);
    for(let i = 0; i < method_keys.length; i++) {
        let method_key = method_keys[i];
        let amount = method_amount_data_clumps[method_key];
        addAmount(distributionNumberOfDataClumpsPerMethod, {[amount]: 1});
    }

    let analysis_objects: Record<string, Record<string, number>> = {
        "Classes_with_Field_Field_Data_Clumps": distributionNumberOfDataClumpsPerClass,
        "Methods_with_Parameter_Parameter_and_Parameter_Field_Data_Clumps": distributionNumberOfDataClumpsPerMethod
    }

    let anylsis_keys = Object.keys(analysis_objects);
    for(let i = 0; i < anylsis_keys.length; i++){
        let analysis_name = anylsis_keys[i];
        let values = analysis_objects[analysis_name];
        fileContent += AnalyseHelper.getValuesForRecord("values_"+analysis_name, values);
    }

    fileContent += "all_data = {}\n";
    for (let i = 0; i < anylsis_keys.length; i++) {
        let analysis_name = anylsis_keys[i];
        fileContent += "all_data['" + analysis_name + "'] = " + "expand_frequency_dict(values_"+analysis_name + ")\n";
    }
    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += "\n" +
        "# Berechnung der Statistik-Werte\n" +
        "statistics = {}\n" +
        "for label, values in all_data.items():\n" +
        "    values_sorted = np.sort(values)\n" +
        "    sum_value = sum(values_sorted)\n" +
        "    q1 = np.percentile(values_sorted, 25)\n" +
        "    median = np.median(values_sorted)\n" +
        "    q3 = np.percentile(values_sorted, 75)\n" +
        "    # Whisker-Berechnung\n" +
        "    iqr = q3 - q1\n" +
        "    lower_whisker = np.min(values_sorted[values_sorted >= (q1 - 1.5 * iqr)])\n" +
        "    upper_whisker = np.max(values_sorted[values_sorted <= (q3 + 1.5 * iqr)])\n" +
        "    min_value = np.min(values_sorted)\n" +
        "    max_value = np.max(values_sorted)\n" +
        "    statistics[label] = {\n" +
        "        'Q1': q1, 'Median': median, 'Q3': q3,\n" +
        "        'Lower Whisker': lower_whisker, 'Upper Whisker': upper_whisker,\n" +
        "        'Min': min_value, 'Max': max_value, 'Sum': sum_value\n" +
        "    }\n" +
        "\n" +
        "    print(f\"{label}: Q1 = {q1:.2f}, Median = {median:.2f}, Q3 = {q3:.2f}, \"\n" +
        "          f\"Lower Whisker = {lower_whisker:.2f}, Upper Whisker = {upper_whisker:.2f}, \"\n" +
        "          f\"Min = {min_value:.2f}, Max = {max_value:.2f}, Sum = {sum_value:.2f}\")" +
        "\n";
    fileContent += "fig, ax1 = plt.subplots()\n";
    fileContent += "plt.boxplot(data, vert=False, widths=0.5, medianprops={'color': (172/255, 6/255, 52/255)})  # RGB umgerechnet auf 0-1 Skala\n";
    fileContent += "ax1.set(xlabel='Number of Data Clumps')\n";
    // Replace underscores with spaces in labels
    fileContent += "wrapped_labels = ['\\n'.join(textwrap.wrap(label.replace('_', ' '), width=20)) for label in labels]\n";
    fileContent += "plt.yticks(range(1, len(labels) + 1), wrapped_labels)  # Adjust y-axis labels\n";
    // Set the visible y-axis range
    fileContent += "x_max = 20\n" +
        "ax1.set_xlim([0, x_max])  # Increase x-axis limit for better spacing\n" +
        "ax1.set_xticks(range(0, x_max+1, 1))  # Setzt die x-Ticks in 1er-Schritten\n";

    fileContent += "plt.subplots_adjust(left=0.28, right=0.95, top=0.98, bottom=0.23)\n"; // Adjust bottom for better label display
    fileContent += "fig.set_size_inches(6, 2, forward=True)\n";
    fileContent += "fig.set_dpi(200)\n";
    fileContent += "plt.show()\n";

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);

    // Get the options and arguments
    const options = program.opts();

    const report_folder = options.report_folder;

    let fileContent = await analyse(report_folder, options);
    let output = options.output;
    // delete output file if it exists
    if (fs.existsSync(output)) {
        fs.unlinkSync(output);
    }

    console.log("Writing output to file: "+output)
    fs.writeFileSync(output, fileContent);
}

main();

