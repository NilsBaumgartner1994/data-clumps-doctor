#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import {AnalyseHelper} from './AnalyseHelper';
import {Command} from 'commander';

function getLatestGitTag(projectPath: string): string | null {
    try {
        const tag = execSync('git describe --tags --abbrev=0', {cwd: projectPath, stdio: ['ignore','pipe','ignore']}).toString().trim();
        return tag || null;
    } catch {
        return null;
    }
}

function getLatestReportTag(reportsPath: string): string | null {
    const reportFiles = AnalyseHelper.getSortedReportFilePathsByTimestamps(reportsPath);
    if (reportFiles.length === 0) {
        return null;
    }
    const latestReport = reportFiles[reportFiles.length - 1];
    const reportJson = AnalyseHelper.getReportFileJson(latestReport);
    return reportJson?.project_info?.project_tag ?? null;
}

function analyseProjects(rootFolder: string) {
    const projectNames = fs.readdirSync(rootFolder).filter(name => {
        const fullPath = path.join(rootFolder, name);
        return fs.lstatSync(fullPath).isDirectory();
    });

    for (const projectName of projectNames) {
        const projectPath = path.join(rootFolder, projectName);
        const reportsPath = path.join(projectPath, 'reports');
        if (!fs.existsSync(reportsPath)) {
            continue;
        }
        const reportTag = getLatestReportTag(reportsPath);
        const latestTag = getLatestGitTag(projectPath);
        console.log(`${projectName}: report tag = ${reportTag ?? 'none'}, latest tag = ${latestTag ?? 'none'}`);
    }
}

function main() {
    const program = new Command();
    program.option('--root <path>', 'Path to folder containing projects', process.cwd());
    program.parse(process.argv);
    const options = program.opts();
    analyseProjects(options.root);
}

main();
