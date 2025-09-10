import fs from 'fs';
import path from 'path';
import {AnalyseHelper, PartialTimerProgressObject} from "./AnalyseHelper";
import {Timer} from "./Timer";

function generateLogDeltaChartPython(projectToAmountDataClumps: Record<string, number[]>): string {
    const primaryColorString = AnalyseHelper.getPrimaryColorAsHex();

    // Berechne log10-Deltas
    function safeLog10Delta(delta: number): number {
        return delta === 0 ? 0 : Math.sign(delta) * Math.log10(Math.abs(delta));
    }

    const project_names = Object.keys(projectToAmountDataClumps);
    const logDeltas: number[] = [];
    const deltas: number[] = [];

    for (const project of project_names) {
        const values = projectToAmountDataClumps[project];
        const delta = values[values.length - 1] - values[0];
        deltas.push(delta);
        logDeltas.push(safeLog10Delta(delta));
    }

    const x_max_positive = Math.max(...logDeltas.filter(d => d > 0), 1);
    const x_max_negative = Math.min(...logDeltas.filter(d => d < 0), -1);
    const x_range = Math.ceil(Math.max(Math.abs(x_max_positive), Math.abs(x_max_negative)));

    const xticks: number[] = [];
    for (let i = -x_range; i <= x_range; i++) {
        xticks.push(i);
    }
    const xtickLabels = xticks.map(t => {
        if (t === 0) return '0';
        return t < 0 ? `-10^${Math.abs(t)}` : `10^${t}`;
    });

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

    fileContent += "import matplotlib.pyplot as plt\n";
    fileContent += "import numpy as np\n\n";

    fileContent += "# Data Clumps by project\n";
    fileContent += "projects = {\n";
    for (const project_name of project_names) {
        const values = projectToAmountDataClumps[project_name];
        if (values.length >= 2) {
            fileContent += `    '${project_name}': ${JSON.stringify(values)},\n`;
        }
    }
    fileContent += "}\n\n";

    fileContent += "# Print full time series\n";
    fileContent += "print('Complete time series of Data Clumps:')\n";
    fileContent += "for project, values in projects.items():\n";
    fileContent += "    print(f'{project}: {values}')\n\n";

    fileContent += "project_names = list(projects.keys())\n";
    fileContent += "project_names = list(reversed(project_names))\n"

    fileContent += "# Start/End-Werte je Projekt in genau dieser Reihenfolge\n"
    fileContent += "start_values = [projects[name][0] for name in project_names]\n"
    fileContent += "end_values   = [projects[name][-1] for name in project_names]"

    fileContent += "deltas = [projects[p][-1] - projects[p][0] for p in project_names]\n";
    fileContent += "log_deltas = [np.sign(d) * np.log10(abs(d)) if d != 0 else 0 for d in deltas]\n";
    fileContent += `primary_color = "${primaryColorString}"\n`;
    fileContent += "colors = [primary_color if d > 0 else 'green' if d < 0 else 'gray' for d in deltas]\n\n";

    fileContent += "fig, ax = plt.subplots(figsize=(6, 10))\n";
    fileContent += "y_pos = np.arange(len(project_names))\n";
    fileContent += "ax.barh(y_pos, log_deltas, color=colors)\n";
    fileContent += "ax.set_yticks(y_pos)\n";
    fileContent += "ax.set_ylim(-0.5, len(project_names) - 0.5)\n"
    fileContent += "ax.set_yticklabels(project_names)\n";

    let x_max = Math.max(Math.abs(x_max_positive), Math.abs(x_max_negative));
    fileContent += `x_max_positive = ${x_max}\n`;
    fileContent += `x_max_negative = ${x_max}\n`;
    fileContent += `xticks = ${JSON.stringify(xticks)}\n`;
    fileContent += `xtick_labels = ${JSON.stringify(xtickLabels)}\n`;
    fileContent += "ax.set_xticks(xticks)\n";
    fileContent += "ax.set_xticklabels(xtick_labels)\n";
    fileContent += "ax.set_xlim(x_max_negative - 0.5, x_max_positive + 0.5)\n";

    let showStartEndValues = true;
    if (showStartEndValues) {
        fileContent += "for i, (start, end) in enumerate(zip(start_values, end_values)):\n" +
            "    ax.text(\n" +
            "        x_max_negative,             # ganz links beginnen\n" +
            "        i+0.1,                          # Position entspricht Balken-Y\n" +
            "        f\"{start} → {end}\",         # Text\n" +
            "        va='center', ha='left',     # vertikal mittig, linksbündig\n" +
            "        fontsize=8, color=\"black\"\n" +
            "    )";

    let showGuideLinesForProjects = true;
    if (showGuideLinesForProjects) {
        fileContent += "# Nach dem Zeichnen der Balken\n" +
            "for i in range(len(project_names)):\n" +
            "    ax.axhline(i, color='lightgray', linewidth=0.5, linestyle='--')"
    }

    fileContent += "ax.axvline(0, color='black', linewidth=0.8)\n";
    fileContent += "ax.set_xlabel('Change in the Number of Data Clumps (at logarithmic scale)')\n";
    fileContent += "#ax.set_title('Increase/Decrease of Data Clumps per Project')\n";
    fileContent += "plt.grid(axis='x', linestyle='--', alpha=0.5)\n";
    fileContent += "plt.tight_layout()\n";
    fileContent += "plt.show()\n";

    return fileContent;
}

async function analyse(report_folder, options) {
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: " + report_folder);
        process.exit(1);
    }

    let all_report_projects = fs.readdirSync(report_folder);
    let projectToAmountDataClumps: Record<string, number[]> = {};

    let totalAmountOfReportFiles = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder).length;
    let progressOffset = 0;
    let timer = new Timer();
    timer.start();

    for (let i = 0; i < all_report_projects.length; i++) {
        let report_project = all_report_projects[i];
        let report_project_folder_path = path.join(report_folder, report_project);

        if (fs.lstatSync(report_project_folder_path).isDirectory()) {
            console.log("Check project: " + report_project);

            let partialTimerProgressObject: PartialTimerProgressObject = {
                progressOffset: progressOffset,
                totalAmountFiles: totalAmountOfReportFiles,
                timer: timer,
                suffix: " - Project: " + report_project,
            };

            let sorted_report_file_paths = AnalyseHelper.getSortedReportFilePathsByTimestamps(report_project_folder_path, partialTimerProgressObject);
            for (let i = 0; i < sorted_report_file_paths.length; i++) {
                let report_file_path = sorted_report_file_paths[i];
                let report_file_json = AnalyseHelper.getReportFileJson(report_file_path);
                let amount_data_clumps = report_file_json?.report_summary?.amount_data_clumps;
                let project_name = report_file_json?.project_info.project_name;
                if (!!project_name && amount_data_clumps !== null) {
                    if (!projectToAmountDataClumps[project_name]) {
                        projectToAmountDataClumps[project_name] = [];
                    }
                    projectToAmountDataClumps[project_name].push(amount_data_clumps);
                }
            }
            progressOffset += sorted_report_file_paths.length;
        }
    }

    const fileContent = generateLogDeltaChartPython(projectToAmountDataClumps);

    const output = options.output;
    if (fs.existsSync(output)) {
        fs.unlinkSync(output);
    }

    console.log("Writing output to file: " + output);
    fs.writeFileSync(output, fileContent);
}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "GenerateDetectedDataClumpsChartDivergingLogScaledBarChart",
    });

    const report_folder = options.report_folder;
    await analyse(report_folder, options);
}

main();