#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext,
    DataClumpTypeContext,
    Dictionary
} from "data-clumps-type-context";
import {Timer} from "./Timer";
import {AnalyseHelper} from "./AnalyseHelper";

function getVariableKeyNameAndType(variable: DataClumpsVariableFromContext){
    return variable.name + variable.type;;
}

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fileContent = "";

    let most_common_variable = {};

    let timer = new Timer()
    timer.start();

    let all_report_files_paths = AnalyseHelper.getAllReportFilesRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

    for(let i = 0; i < total_amount_of_report_files; i++){
        timer.printEstimatedTimeRemaining({
            progress: i,
            total: total_amount_of_report_files
        });
        let progress_files = i+1;
        let report_file_path = all_report_files_paths[i];
        let report_file_json = AnalyseHelper.getReportFileJson(report_file_path)

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;
            let suffix = " - "+progress_data_clumps+"/"+amount_of_data_clumps;
            timer.printEstimatedTimeRemainingAfter1Second(
                {
                    progress: progress_data_clumps,
                    total: amount_of_data_clumps,
                    prefix: null,
                    suffix: suffix
                });

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true;

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data


                let variables = Object.keys(data_clump_data);
                // MOST COMMON VARIABLE
                for(let k = 0; k < variables.length; k++){
                    let variable_key = variables[k];
                    let variable = data_clump_data[variable_key];
                    let variable_key_name_and_type = getVariableKeyNameAndType(variable);
                    if(most_common_variable[variable_key_name_and_type] === undefined){
                        most_common_variable[variable_key_name_and_type] = {
                            occurrences: 0,
                            name: variable.name,
                            type: variable.type,
                            projects: {}
                        }
                    }
                    most_common_variable[variable_key_name_and_type].occurrences = most_common_variable[variable_key_name_and_type].occurrences+1;
                    if(!!report_file_json.project_info.project_name){
                        most_common_variable[variable_key_name_and_type].projects[report_file_json.project_info.project_name] = true;
                        project_names[report_file_json.project_info.project_name] = true;
                    }
                }
            }
        }

    }

    // Sort most common variable keys
    let most_common_variable_keys = Object.keys(most_common_variable);
    most_common_variable_keys.sort((key_a, key_b) => {
        let info_a = most_common_variable[key_a];
        let info_b = most_common_variable[key_b];
        let occurrences_a = info_a.occurrences;
        let occurrences_b = info_b.occurrences;
        return occurrences_b - occurrences_a;
    });

    let pythonComments: string[] = [];

    pythonComments.push("Amount of projects: " + Object.keys(project_names).length);
    console.log("dict_of_analysed_data_clumps_keys unique amount: " + Object.keys(dict_of_analysed_data_clumps_keys).length);
    pythonComments.push("dict_of_analysed_data_clumps_keys unique amount: " + Object.keys(dict_of_analysed_data_clumps_keys).length);
    console.log("Out of total " + most_common_variable_keys.length + " variables analyzed");
    let amount_show = 10;

    pythonComments.push("Most common variable only by amount of occurrences");
    console.log(amount_show + ". Most common variable:");
    for (let i = 0; i < amount_show; i++) {
        let variable_key = most_common_variable_keys[i];
        let information = most_common_variable[variable_key];
        let name = information.name;
        let type = information.type;
        let occurrences = information.occurrences;
        console.log("#" + (i + 1) + " " + occurrences + " - name: " + name + " - type: " + type);
        pythonComments.push("#" + (i + 1) + " " + occurrences + " - name: " + name + " - type: " + type);
    }

    console.log("-------");
    pythonComments.push("-------");
    console.log("Most common variable in all projects");
    pythonComments.push("Most common variable in all projects");
    let most_common_variable_in_all_projects_keys = Object.keys(most_common_variable);
    most_common_variable_in_all_projects_keys.sort((key_a, key_b) => {
        let info_a = most_common_variable[key_a];
        let info_b = most_common_variable[key_b];
        let occurrences_projects_a = Object.keys(info_a.projects).length;
        let occurrences_projects_b = Object.keys(info_b.projects).length;

        if (occurrences_projects_a === occurrences_projects_b) {
            return info_b.occurrences - info_a.occurrences;
        }
        return occurrences_projects_b - occurrences_projects_a;
    });
    console.log(amount_show + ". Most common variables in all projects:");
    for (let i = 0; i < amount_show; i++) {
        let variable_key = most_common_variable_in_all_projects_keys[i];
        let information = most_common_variable[variable_key];
        let name = information.name;
        let type = information.type;
        let occurrences = information.occurrences;
        let amount_projects = Object.keys(information.projects).length;
        console.log("#" + (i + 1) + " " + occurrences + " - name: " + name + " - type: " + type + " - amount projects: " + amount_projects);
        pythonComments.push("#" + (i + 1) + " " + occurrences + " - name: " + name + " - type: " + type + " - amount projects: " + amount_projects);
    }

    // Jetzt wird direkt das Python-Skript erzeugt
    let pythonScriptLines: string[] = [];

    pythonScriptLines.push(`import matplotlib.pyplot as plt`);
    pythonScriptLines.push(`from wordcloud import WordCloud`);
    pythonScriptLines.push(`from matplotlib.colors import to_hex`);
    pythonScriptLines.push(`import numpy as np\n`);

    pythonScriptLines.push(`# Kommentare`);
    for(let i = 0; i < pythonComments.length; i++){
        pythonScriptLines.push(`# ${pythonComments[i].toString()}`);
    }
    pythonScriptLines.push(`\n`);

    pythonScriptLines.push(`# Variablen in Positionsreihenfolge`);
    pythonScriptLines.push(`variables = [`);
    for (let i = 0; i < amount_show; i++) {
        let variable_key = most_common_variable_in_all_projects_keys[i];
        let information = most_common_variable[variable_key];
        let name = information.name;
        let comma = i < amount_show - 1 ? ',' : '';
        pythonScriptLines.push(`    "${name}"${comma}\n`);
    }
    pythonScriptLines.push(`]\n`);

    // Gewichtung direkt aus der Position ableiten
    pythonScriptLines.push(`# Gewichtung berechnet nach Positionsrang`);
    pythonScriptLines.push(`max_weight = 100`);
    pythonScriptLines.push(`min_weight = 10`);
    pythonScriptLines.push(`step = (max_weight - min_weight) // (len(variables) - 1)`);
    pythonScriptLines.push(`weights = {var: max_weight - i * step for i, var in enumerate(variables)}\n`);


    const rgb = AnalyseHelper.getPrimaryColorRGB();
    pythonScriptLines.push(`# Farbverlauf von PrimaryColor → Schwarz`);
    pythonScriptLines.push(`variables = list(weights.keys())`);
    pythonScriptLines.push(`start_rgb = np.array([${rgb.r}, ${rgb.g}, ${rgb.b}])`);
    pythonScriptLines.push(`end_rgb = np.array([0, 0, 0])`);
    pythonScriptLines.push(`colors_rgb = [start_rgb - (start_rgb - end_rgb) * i / (len(variables) - 1) for i in range(len(variables))]`);
    pythonScriptLines.push(`colors_hex = [to_hex(rgb / 255) for rgb in colors_rgb]`);
    pythonScriptLines.push(`color_map = {word: color for word, color in zip(variables, colors_hex)}\n`);

    pythonScriptLines.push(`def color_func(word, font_size, position, orientation, font_path, random_state):`);
    pythonScriptLines.push(`    return color_map.get(word, "#000000")\n`);

    pythonScriptLines.push(`# Bildgröße und Schriftgrößen`);
    pythonScriptLines.push(`width_inch = 10`);
    pythonScriptLines.push(`height_inch = 5`);
    pythonScriptLines.push(`dpi = 400`);
    pythonScriptLines.push(`width_px = int(width_inch * dpi)`);
    pythonScriptLines.push(`height_px = int(height_inch * dpi)`);
    pythonScriptLines.push(`min_font_pt = 11`);
    pythonScriptLines.push(`min_font_px = int(min_font_pt * dpi / 72)\n`);

    pythonScriptLines.push(`# WordCloud erzeugen`);
    pythonScriptLines.push(`wordcloud = WordCloud(`);
    pythonScriptLines.push(`    width=width_px,`);
    pythonScriptLines.push(`    height=height_px,`);
    pythonScriptLines.push(`    background_color='white',`);
    pythonScriptLines.push(`    prefer_horizontal=1.0,`);
    pythonScriptLines.push(`    color_func=color_func,`);
    pythonScriptLines.push(`    min_font_size=min_font_px,`);
    pythonScriptLines.push(`    relative_scaling=0.5,`);
    pythonScriptLines.push(`    collocations=False`);
    pythonScriptLines.push(`).generate_from_frequencies(weights)\n`);

    pythonScriptLines.push(`# Bild anzeigen und speichern`);
    pythonScriptLines.push(`plt.figure(figsize=(width_inch, height_inch), dpi=dpi)`);
    pythonScriptLines.push(`plt.imshow(wordcloud, interpolation='bilinear')`);
    pythonScriptLines.push(`plt.axis('off')`);
    pythonScriptLines.push(`plt.tight_layout(pad=0)`);
    pythonScriptLines.push(`plt.savefig("${options.output_filename_without_extension}.pdf", dpi=dpi, format="pdf")`);
    pythonScriptLines.push(`plt.close()`);

// Zusammenfügen und speichern
    fileContent = pythonScriptLines.join('\n');
    return fileContent;
}

async function main() {
    console.log("Data-Clumps-Doctor Detection");


    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseMostCommonDataClumpVariable"
    })

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

