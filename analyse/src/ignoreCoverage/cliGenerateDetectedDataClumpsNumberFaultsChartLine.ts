#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {AnalyseHelper, PartialTimerProgressObject} from "./AnalyseHelper";
import {Timer} from "./Timer";

async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let all_report_projects= fs.readdirSync(report_folder);

    let projectToAmountDataClumps: Record<string, number[]> = {};

    let totalAmountOfReportFiles = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder).length;
    let progressOffset = 0;
    let timer = new Timer();
    timer.start();

    for (let i = 0; i < all_report_projects.length; i++) {
        let report_project = all_report_projects[i];
        // check if project is .DS_Store or non

        let report_project_folder_path = path.join(report_folder, report_project);
        if (fs.lstatSync(report_project_folder_path).isDirectory()) {
            console.log("Check project: "+report_project);

            let partialTimerProgressObject: PartialTimerProgressObject = {
                progressOffset: progressOffset,
                totalAmountFiles: totalAmountOfReportFiles,
                timer: timer,
                suffix: " - Project: "+report_project,
            }

            let sorted_report_file_paths = AnalyseHelper.getSortedReportFilePathsByTimestamps(report_project_folder_path, partialTimerProgressObject);
            for(let i = 0; i < sorted_report_file_paths.length; i++){
                let report_file_path = sorted_report_file_paths[i];
                let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);
                //let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps;
                let additional = report_file_json?.report_summary?.additional;
                let fault_data = additional?.fault_data;
                let number_of_faults_until_commit: number | undefined = fault_data?.number_of_faults_until_commit;

                let project_name = report_file_json?.project_info.project_name;
                if(!!project_name){
                    if(number_of_faults_until_commit!==undefined){
                        if(!projectToAmountDataClumps[project_name]){
                            projectToAmountDataClumps[project_name] = [];
                        }
                        projectToAmountDataClumps[project_name].push(number_of_faults_until_commit);
                    } else {
                        console.log("ERROR: amount_data_clumps is null for report file: "+report_file_path);
                    }
                } else {
                    console.log("ERROR: project_name is null for report file: "+report_file_path);
                }
            }
            progressOffset += sorted_report_file_paths.length;
        }
    }

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent()

    fileContent += "# List of markers to cycle through\n"
    fileContent += "markers = ['o', 'x', 'D', '+', '*', 's', 'p', 'h', 'v', '^', '<', '>']\n";
    fileContent += "projects = {\n";

    let project_names = Object.keys(projectToAmountDataClumps);
    for (let i = 0; i < project_names.length; i++) {
        let project_name = project_names[i];
        let project_data = projectToAmountDataClumps[project_name];
        fileContent += `    '${project_name}': ${JSON.stringify(project_data)},\n`;
    }

    fileContent += "}\n";
    fileContent += "# Find the maximum length among all projects\n";
    fileContent += "max_length = max(len(data) for data in projects.values())\n";
    fileContent += "# Normalize the timestamps for each project and create a DataFrame\n";
    fileContent += "data = {'Timestamps': range(1, max_length + 1)}\n";
    fileContent += "for project_name, project_data in projects.items():\n";
    fileContent += "    normalized_timestamps = [i/(len(project_data)-1) for i in range(len(project_data))]\n";
    fileContent += "    data[f'Normalized Timestamps {project_name}'] = normalized_timestamps + [None] * (max_length - len(project_data))\n";
    fileContent += "    data[project_name] = project_data + [None] * (max_length - len(project_data))\n";
    fileContent += "\n";
    fileContent += "df = pd.DataFrame(data)\n";
    fileContent += "\n";
    fileContent += "# Plotting\n";
    fileContent += "plt.figure(figsize=(10, 6))\n";
    fileContent += "for i, project_name in enumerate(projects.keys()):\n";
    fileContent += "    marker = markers[i % len(markers)]  # Cycle through the list of markers\n";
    fileContent += "    plt.plot(df[f'Normalized Timestamps {project_name}'], df[project_name], marker=marker, linestyle='-', label=project_name)\n";
    fileContent += "\n";
    fileContent += "plt.title('Project Data Clumps Over Project Versions')\n";
    fileContent += "plt.xlabel('Project Versions')\n";
    fileContent += "plt.subplots_adjust(left=0.08, right=0.98, top=0.97, bottom=0.06)\n";
    fileContent += "plt.ylabel('Total Known Faults')\n";
    fileContent += "plt.legend()\n";
    fileContent += "plt.grid(True)\n";
    fileContent += "\n";
    fileContent += "# Remove the x-axis tick labels\n";
    fileContent += "plt.xticks([], [])\n";
    fileContent += "\n";
    fileContent += "plt.show()";

    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "GenerateDetectedDataClumpsNumberFaultsChartLine",
    })

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

