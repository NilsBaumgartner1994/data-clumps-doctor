#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamValues } from 'stream-json/streamers/StreamValues';

import { Analyzer } from "./Analyzer";
import { Timer } from "./Timer";
import { AnalyseHelper } from './AnalyseHelper';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();
const current_working_directory = process.cwd();

program
    .description('Analyse Detected Data-Clumps\n\n' +
        'This script performs data clumps detection in a given directory.\n\n' +
        'npx data-clumps-doctor [options] <path_to_folder>')
    .version(version)
    .option('--report_folder <path>', 'Output path', current_working_directory + '/data-clumps-results/' + Analyzer.project_name_variable_placeholder + '/')
    .option('--output <path>', 'Output path for script', current_working_directory + '/DistributionDataClumpFileDistance.py');

async function analyseFileStream(report_file_path: string, data_clump_from_file_distribution: Record<string, number>, dict_of_analysed_data_clumps_keys: Record<string, boolean>) {
    return new Promise<void>((resolve, reject) => {
        const pipeline = chain([
            fs.createReadStream(report_file_path),
            parser(),
            pick({ filter: 'data_clumps' }),
            streamValues(),
        ]);

        pipeline.on('data', ({ value }) => {
            for (const key in value) {
                if (dict_of_analysed_data_clumps_keys[key]) continue;
                dict_of_analysed_data_clumps_keys[key] = true;

                const data_clump = value[key];
                const file_path = data_clump.from_file_path;
                data_clump_from_file_distribution[file_path] = (data_clump_from_file_distribution[file_path] ?? 0) + 1;
            }
        });

        pipeline.on('end', resolve);
        pipeline.on('error', reject);
    });
}

async function analyse(report_folder, options) {
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: " + report_folder);
        process.exit(1);
    }

    let data_clump_from_file_distribution: Record<string, number> = {};
    let dict_of_analysed_data_clumps_keys: Record<string, boolean> = {};

    let timer = new Timer();
    timer.start();
    let lastElapsedTime = 0;

    const all_report_files_paths = AnalyseHelper.getAllReportFilesRecursiveInFolder(report_folder);
    const total_amount_of_report_files = all_report_files_paths.length;

    for (let i = 0; i < total_amount_of_report_files; i++) {
        const report_file_path = all_report_files_paths[i];
        const progress_files = i + 1;

        timer.printEstimatedTimeRemaining(progress_files, total_amount_of_report_files);

        try {
            await analyseFileStream(report_file_path, data_clump_from_file_distribution, dict_of_analysed_data_clumps_keys);
        } catch (e: any) {
            console.error(`Fehler beim Verarbeiten von ${report_file_path}: ${e.message}`);
        }
    }

    // sort the data_clump_from_file_distribution
    const data_clump_from_file_distribution_sorted = Object.keys(data_clump_from_file_distribution)
        .sort((a, b) => data_clump_from_file_distribution[b] - data_clump_from_file_distribution[a]);

    // print top 20
    console.log("Top 20 Files with Data Clumps:");
    for (let i = 0; i < 20 && i < data_clump_from_file_distribution_sorted.length; i++) {
        const file_path = data_clump_from_file_distribution_sorted[i];
        const amount = data_clump_from_file_distribution[file_path];
        console.log(file_path + ": " + amount);
    }
}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);
    const options = program.opts();
    const report_folder = options.report_folder;

    await analyse(report_folder, options);
}

main();
