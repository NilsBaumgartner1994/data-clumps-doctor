import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { Analyzer } from "./Analyzer";
import {AnalyseHelper, PartialTimerProgressObject} from "./AnalyseHelper";
import {ProgressObject, Timer} from "./Timer";
import {GitHelper, SzzResult} from "./GitHelper"; // SzzResult importieren!

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();
const current_working_directory = process.cwd();

program
    .description('Analyse Detected Data-Clumps')
    .version(version)
    .option('--report_folder <path>', 'Output path', path.join(current_working_directory, 'data-clumps-results', Analyzer.project_name_variable_placeholder));


type ProjectData = {
    projectName: string; // Optional, falls der Projektname nicht verfügbar ist
    projectUrl: string;
    report_file_path: string; // Pfad zur Report-Datei, falls benötigt
    tag: string | undefined | null;
    commitHash: string;
    // Timestamp wird hier nicht mehr direkt für die BIC-Zählung verwendet,
    // kann aber für Plots o.ä. weiterhin nützlich sein.
    timestamp: number;
    fieldFieldDataClumps: number;
    parameterParameterDataClumps: number;
    parameterFieldDataClumps: number;
    numberOfBugIntroducingCommits: number | undefined; // Anzahl der BICs bis zu diesem Commit (basierend auf Ancestry)
};

async function analyse(report_project_folder_path: string, options: any): Promise<void> {
    if (!fs.existsSync(report_project_folder_path)) {
        console.error("ERROR: Report folder does not exist:", report_project_folder_path);
        process.exit(1);
    }

    const totalTimer = new Timer();
    totalTimer.start();

    let relevantFileInformationPerProject: Record<string, ProjectData[]> = {}

    let allReportFiles = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_project_folder_path)
    let progress = 0;

    let relevantFileInformationDict: Record<string, ProjectData> = {};
    let alreadyAnalysedCommits: string[] = [];

    for (const file of allReportFiles) {
        progress++;
        totalTimer.printEstimatedTimeRemaining({
            progress: progress,
            total: allReportFiles.length,
            suffix: "Reading report file: " + file
        });
        const json = await AnalyseHelper.getReportFileJson(file);


        const project_tag = json.project_info.project_tag;

        const fielfFieldDataClumps = json.report_summary.fields_to_fields_data_clump || 0;
        const parameterParameterDataClumps = json.report_summary.parameters_to_parameters_data_clump || 0;
        const parameterFieldDataClumps = json.report_summary.parameters_to_fields_data_clump || 0;
        const projectName = json.project_info.project_name;
        const projectUrl = json.project_info.project_url;
        const project_commit_hash = json.project_info.project_commit_hash;
        const timestamp = AnalyseHelper.getTimestamp(json);

        let numberOfBugIntroducingCommits = AnalyseHelper.getNumberBugIntroducingCommitsUntilCommit(json);

        if(!!projectUrl && !!project_commit_hash && !!projectName) {
            const data: ProjectData = {
                tag: project_tag,
                report_file_path: file,
                projectName: projectName,
                commitHash: project_commit_hash,
                timestamp:timestamp,
                projectUrl: projectUrl,
                fieldFieldDataClumps: fielfFieldDataClumps,
                parameterParameterDataClumps: parameterParameterDataClumps,
                parameterFieldDataClumps: parameterFieldDataClumps,
                numberOfBugIntroducingCommits: numberOfBugIntroducingCommits
            }

            relevantFileInformationDict[project_commit_hash] = data

            // Prüfen, ob wir dieses Projekt analysieren müssen
            if(data.numberOfBugIntroducingCommits===undefined){
                if (!relevantFileInformationPerProject[data.projectName]) {
                    relevantFileInformationPerProject[data.projectName] = [];
                }
                relevantFileInformationPerProject[data.projectName].push({
                    ...data,
                });
            } else {
                alreadyAnalysedCommits.push("" + data.projectName + " "+data.tag+" - BICs: " + data.numberOfBugIntroducingCommits);
            }
        }
    }

    // Ausgabe der bereits analysierten Projekte
    if (alreadyAnalysedCommits.length > 0) {
        console.log("Already analysed commits:");
        // sort alphabetically
        alreadyAnalysedCommits.sort((a, b) => a.localeCompare(b));

        for (const alreadyAnalyzedCommits of alreadyAnalysedCommits) {
            console.log(" - " + alreadyAnalyzedCommits);
        }
    }

    // loop over all projects and analyse them
    for (const projectName in relevantFileInformationPerProject) {
        const projectData = relevantFileInformationPerProject[projectName];
        await analyseProject(projectData, options);
    }

    totalTimer.stop();

/**
    // Generiere Python-Code für Analyse
    let py = "import matplotlib.pyplot as plt\nimport pandas as pd\nfrom scipy.stats import spearmanr\nimport numpy as np\n\n";

    py += "data = {\n";
    for (const [project, entries] of Object.entries(allProjectsData)) {
        py += `    \"${project}\": [\n`;
        // Sortiere die Einträge nach Timestamp, um sie für eine Zeitreihenanalyse vorzubereiten
        // Hier ist der Timestamp wieder nützlich für die visuelle Darstellung der Entwicklung
        const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);
        for (const e of sortedEntries) {
            py += `        {\"commitHash\": \"${e.commitHash}\", \"tag\": \"${e.tag || 'None'}\", \"timestamp\": ${e.timestamp}, ` +
                `\"fieldFieldDataClumps\": ${e.fieldFieldDataClumps}, ` +
                `\"parameterParameterDataClumps\": ${e.parameterParameterDataClumps}, ` +
                `\"parameterFieldDataClumps\": ${e.parameterFieldDataClumps}, ` +
                `\"bicsUntilCommit\": ${e.bicsUntilCommit}},\n`;
        }
        py += "    ],\n";
    }
    py += "}\n\n";

    py += `rows = []
for project, records in data.items():
    for r in records:
        row = r.copy()
        row["project"] = project
        rows.append(row)

df = pd.DataFrame(rows)

print("\\n--- Datenübersicht ---")
print(df.head())

print("\\n--- Korrelationsanalyse ---")
for project in df['project'].unique():
    project_df = df[df['project'] == project].copy() # .copy() um SettingWithCopyWarning zu vermeiden
    if len(project_df) > 1:
        project_df['total_data_clumps'] = project_df['fieldFieldDataClumps'] + project_df['parameterParameterDataClumps'] + project_df['parameterFieldDataClumps']
        
        if project_df['bicsUntilCommit'].nunique() > 1 and project_df['total_data_clumps'].nunique() > 1:
            rho, pval = spearmanr(project_df['bicsUntilCommit'], project_df['total_data_clumps'])
            print(f"Project {project}: Spearmanr(bicsUntilCommit, total_data_clumps): rho={rho:.3f}, p={pval:.4f}")
        else:
            print(f"Project {project}: Not enough variation for correlation analysis.")
    else:
        print(f"Project {project}: Not enough data points for correlation analysis.")

if df['bicsUntilCommit'].nunique() > 1 and (df['fieldFieldDataClumps'] + df['parameterParameterDataClumps'] + df['parameterFieldDataClumps']).nunique() > 1:
    df['total_data_clumps'] = df['fieldFieldDataClumps'] + df['parameterParameterDataClumps'] + df['parameterFieldDataClumps']
    rho_global, pval_global = spearmanr(df['bicsUntilCommit'], df['total_data_clumps'])
    print(f"Global Spearmanr(bicsUntilCommit, total_data_clumps): rho={rho_global:.3f}, p={pval_global:.4f}")
else:
    print(f"Global correlation: Not enough variation in data for analysis.")

# Beispiel: Plotting der Metriken über die Zeit
for project, records in data.items():
    df_project = pd.DataFrame(records).sort_values(by='timestamp')
    df_project['date'] = pd.to_datetime(df_project['timestamp'], unit='s')
    
    plt.figure(figsize=(12, 6))
    plt.plot(df_project['date'], df_project['bicsUntilCommit'], label='BICs Until Commit', marker='o')
    plt.plot(df_project['date'], df_project['fieldFieldDataClumps'], label='Field-Field Data Clumps', marker='x')
    plt.plot(df_project['date'], df_project['parameterParameterDataClumps'], label='Parameter-Parameter Data Clumps', marker='s')
    plt.plot(df_project['date'], df_project['parameterFieldDataClumps'], label='Parameter-Field Data Clumps', marker='d')
    
    plt.xlabel('Date')
    plt.ylabel('Count')
    plt.title(f'Metrics Over Time for {project}')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(f'{project}_metrics_over_time.png')
    plt.close()

print("\\n--- Plots gespeichert ---")
`;

    return py;
        */
}

async function analyseProject(projectData: ProjectData[], options: any): Promise<void> {
    const relevantFileInformationDict: Record<string, ProjectData> = {};
    // Erstellen Sie ein Dictionary, das die relevanten Informationen für jeden Commit enthält
    for(const data of projectData) {
        relevantFileInformationDict[data.commitHash] = data;
    }

    const projectName = projectData[0].projectName;
    const gitProjectUrl = projectData[0].projectUrl;

    //console.log("Processing project:", folder, "with URL:", gitProjectUrl);
    let path_to_project = AnalyseHelper.getTempFolderPathGotTempGitClonedProject(gitProjectUrl);
    //await GitHelper.cloneGitProject(gitProjectUrl, path_to_project);
    await GitHelper.deleteGitFolder(path_to_project);
    // create the folder if it does not exist
    if (!fs.existsSync(path_to_project)) {
        fs.mkdirSync(path_to_project, { recursive: true });
    }
    await GitHelper.getGitInstance(path_to_project).clone(gitProjectUrl, path_to_project, ['--no-single-branch']);

    // Holen Sie sich ALLE BICs für das gesamte Repository einmal
    console.log("Now finding all faults for project:", projectName);
    let timerForSZZ = new Timer();
    let partialTimerObject: Partial<ProgressObject> = {
        suffix: `${projectName}`
    }

    let allFaults: SzzResult[] = await GitHelper.runSZZ(path_to_project, undefined, timerForSZZ, partialTimerObject);
    console.log(`Analysis finished for ${projectName}. Number of total faults found: ${allFaults.length}`);
    // Iteriere über die Commits, für die wir Data-Clump-Metriken haben
    let commitHashes = Object.keys(relevantFileInformationDict);
    let timerForCommitProcessing = new Timer();
    timerForCommitProcessing.start();
    const bugIntroducingCommitDict: Record<string, SzzResult[]> = {};
    for(const fault of allFaults) {
        if (fault.bugIntroducingCommit) {
            if (!bugIntroducingCommitDict[fault.bugIntroducingCommit]) {
                bugIntroducingCommitDict[fault.bugIntroducingCommit] = [];
            }
            bugIntroducingCommitDict[fault.bugIntroducingCommit].push(fault);
        }
    }
    let bugIntroducingCommits = Object.keys(bugIntroducingCommitDict);



    const ancestorMap: Map<string, Set<string>> = new Map(); // Faster lookup for ancestors, instead of checking ancestry for each commit
    let git = await GitHelper.getGitInstance(path_to_project);
    let timerForAncestorMapCreation = new Timer();
    timerForAncestorMapCreation.start();
    const totalCommits = commitHashes.length;
    for (let i = 0; i < totalCommits; i++) {
        const commitHash = commitHashes[i];
        timerForAncestorMapCreation.printEstimatedTimeRemainingAfter1Second({
            progress: (i+1),
            total: totalCommits,
            suffix: `Building ancestor map for: ${commitHash} - ${projectName}`
        });

        try {
            const revListOutput = await git.raw([
                'rev-list',
                '--parents',
                commitHash
            ]);
            const ancestors = new Set(
                revListOutput
                    .split('\n')
                    .flatMap(line => line.split(' '))
                    .filter(h => h.match(/^[0-9a-f]{40}$/))
            );
            ancestorMap.set(commitHash, ancestors);
        } catch (err) {
            console.warn(`Failed to get rev-list for ${commitHash}:`, err);
        }
    }



    let timerForBugIntroducingCommitLookup = new Timer();
    timerForBugIntroducingCommitLookup.start();
    const numberOfBugIntroducingCommits = bugIntroducingCommits.length;
    const totalForCommitProcessing = commitHashes.length * numberOfBugIntroducingCommits;
    for (let indexCommitHash = 0; indexCommitHash < commitHashes.length; indexCommitHash++) {
        const commitHash = commitHashes[indexCommitHash];
        let faultIndex = 0;
        let currentProgress = indexCommitHash * numberOfBugIntroducingCommits + faultIndex;

        timerForBugIntroducingCommitLookup.printEstimatedTimeRemainingAfter1Second({
            progress: currentProgress,
            total: totalForCommitProcessing,
            suffix: `Processing commit ${commitHash} for project ${projectName}`
        })


        const baseData = relevantFileInformationDict[commitHash];

        // Holen Sie sich den Zeitstempel des aktuellen Commits (für Plots etc. weiterhin nützlich)
        const commitTimestampStr = await GitHelper.getCommitDateUnixTimestamp(path_to_project, commitHash);
        const commitTimestamp = commitTimestampStr ? parseInt(commitTimestampStr, 10) : 0;

        let bicsUntilThisCommit = 0;
        // Jetzt die Ancestry-Prüfung für JEDEN BIC
        //console.log("Check now allFaults for commits; number of faults:", allFaults.length);
        for (const bugIntroducingCommit of bugIntroducingCommits) {
            faultIndex++;

            currentProgress = indexCommitHash * numberOfBugIntroducingCommits + faultIndex;

            timerForBugIntroducingCommitLookup.printEstimatedTimeRemainingAfter1Second({
                 progress: currentProgress,
                 total: totalForCommitProcessing,
                 suffix: `Checking BIC ancestry for commit ${commitHash} in project ${projectName}`
             });

            // Prüfen, ob der Bug-Introducing Commit ein Vorfahre des aktuellen `commitHash` ist
            // Nur BICs berücksichtigen, die vor oder genau auf dem aktuellen commitHash liegen

            // Is too slow for a large number of commits, so we use a precomputed ancestor map
            //const isAncestor = await GitHelper.isCommitAncestorOfOtherCommit(path_to_project, bugIntroducingCommit, commitHash);
            // Faster lookup using the ancestor map
            const isAncestor = ancestorMap.get(commitHash)?.has(bugIntroducingCommit) ?? false;

            //console.log("Check commit:", commitHash, "for BIC:", bugIntroducingCommit, "-> isAncestor:", isAncestor, "baseData.tag", baseData.tag);

            // Zusätzlich prüfen, ob der BIC-Commit nicht der aktuelle Commit selbst ist
            // (Obwohl SZZ-Ergebnisse normalerweise BIC != BugFix sind, ist es gut, hier redundant zu sein)
            if (isAncestor && bugIntroducingCommit !== commitHash) {
                bicsUntilThisCommit += bugIntroducingCommitDict[bugIntroducingCommit].length;
            }
        }
        console.log("All BICs checked for commit:", commitHash, "in project:", projectName, "-> Total BICs until this commit:", bicsUntilThisCommit, "baseData.tag:", baseData.tag);

        baseData.numberOfBugIntroducingCommits = bicsUntilThisCommit;

        console.log("Save analysed data to report");
        let reportFilePath = baseData.report_file_path;

        let report = await AnalyseHelper.getReportFileJson(reportFilePath);
        AnalyseHelper.setNumberOfBugIntroductingCommitsUntilCommit(report, bicsUntilThisCommit);
        AnalyseHelper.saveReportFileJson(report, reportFilePath);
    }
}

async function main() {
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDetectedDataClumpsFaultCorrelation"
    });

    const pyScript = await analyse(options.report_folder, options);
    /**
    const output = options.output;
    if (fs.existsSync(output)) fs.unlinkSync(output);
    fs.writeFileSync(output, pyScript);
    console.log("Written Python script to:", output);
        */
}

main();