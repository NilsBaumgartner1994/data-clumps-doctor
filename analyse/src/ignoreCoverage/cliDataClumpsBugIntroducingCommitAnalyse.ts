import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { Analyzer } from './Analyzer';
import { AnalyseHelper } from './AnalyseHelper';
import { Timer } from './Timer';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();
const current_working_directory = process.cwd();

program.description('Analyse Detected Data-Clumps').version(version).option('--report_folder <path>', 'Output path', path.join(current_working_directory, 'data-clumps-results', Analyzer.project_name_variable_placeholder));

type ProjectData = {
  projectName: string;
  projectUrl: string;
  report_file_path: string;
  tag: string | undefined | null;
  commitHash: string;
  timestamp: number;
  fieldFieldDataClumps: number;
  parameterParameterDataClumps: number;
  parameterFieldDataClumps: number;
  numberOfBugIntroducingCommits: number | undefined;
};

async function analyse(report_project_folder_path: string, options: any): Promise<string> {
  if (!fs.existsSync(report_project_folder_path)) {
    console.error('ERROR: Report folder does not exist:', report_project_folder_path);
    process.exit(1);
  }

  const totalTimer = new Timer();
  totalTimer.start();

  let relevantFileInformationPerProject: Record<string, ProjectData[]> = {};
  let allReportFiles = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_project_folder_path);
  let progress = 0;

  for (const file of allReportFiles) {
    progress++;
    totalTimer.printEstimatedTimeRemaining({
      progress: progress,
      total: allReportFiles.length,
      suffix: 'Reading report file: ' + file,
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

    if (!!projectUrl && !!project_commit_hash && !!projectName) {
      const data: ProjectData = {
        tag: project_tag,
        report_file_path: file,
        projectName: projectName,
        commitHash: project_commit_hash,
        timestamp: timestamp,
        projectUrl: projectUrl,
        fieldFieldDataClumps: fielfFieldDataClumps,
        parameterParameterDataClumps: parameterParameterDataClumps,
        parameterFieldDataClumps: parameterFieldDataClumps,
        numberOfBugIntroducingCommits: numberOfBugIntroducingCommits,
      };

      if (!relevantFileInformationPerProject[projectName]) {
        relevantFileInformationPerProject[projectName] = [];
      }
      relevantFileInformationPerProject[projectName].push(data);
    }
  }

  totalTimer.stop();

  let py = AnalyseHelper.getPythonLibrariesFileContent();
  py += `
    
matplotlib.rcParams.update({'font.size': 8})

data = {\n`;

  for (const [project, entries] of Object.entries(relevantFileInformationPerProject)) {
    py += `    "${project}": [\n`;
    const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);
    for (const e of sortedEntries) {
      py += `        {"commitHash": "${e.commitHash}", "tag": "${e.tag || 'None'}", "timestamp": ${e.timestamp}, ` + `"fieldFieldDataClumps": ${e.fieldFieldDataClumps}, ` + `"parameterParameterDataClumps": ${e.parameterParameterDataClumps}, ` + `"parameterFieldDataClumps": ${e.parameterFieldDataClumps}, ` + `"bicsUntilCommit": ${e.numberOfBugIntroducingCommits ?? 'None'}},\n`;
    }
    py += '    ],\n';
  }

  py += `}

rows = []
for project, records in data.items():
    for r in records:
        if r["bicsUntilCommit"] is not None:
            row = r.copy()
            row["project"] = project
            rows.append(row)

df = pd.DataFrame(rows)

print("\\n--- Datenübersicht ---")
print(df.head())

print("\\n--- Korrelationsanalyse ---")
for project in df['project'].unique():
    project_df = df[df['project'] == project].copy()
    if len(project_df) > 1:
        project_df['total_data_clumps'] = (
            project_df['fieldFieldDataClumps'] +
            project_df['parameterParameterDataClumps'] +
            project_df['parameterFieldDataClumps']
        )
        print(f"\\nProject {project}:")
        for metric in ['total_data_clumps', 'fieldFieldDataClumps', 'parameterParameterDataClumps', 'parameterFieldDataClumps']:
            if project_df['bicsUntilCommit'].nunique() > 1 and project_df[metric].nunique() > 1:
                rho, pval = spearmanr(project_df['bicsUntilCommit'], project_df[metric])
                print(f"  Spearmanr(bicsUntilCommit, {metric}): rho={rho:.3f}, p={pval:.4f}")
            else:
                print(f"  Not enough variation for {metric}.")
    else:
        print(f"Project {project}: Not enough data points for correlation analysis.")

def get_sig_corr(x, y):
    if x.nunique() > 1 and y.nunique() > 1:
        rho, p = spearmanr(x, y)
        return rho if p < 0.05 else float("nan")
    return float("nan")

print("\\n--- Globale Korrelationsanalyse ---")
df['total_data_clumps'] = (
    df['fieldFieldDataClumps'] +
    df['parameterParameterDataClumps'] +
    df['parameterFieldDataClumps']
)

for metric in ['total_data_clumps', 'fieldFieldDataClumps', 'parameterParameterDataClumps', 'parameterFieldDataClumps']:
    if df['bicsUntilCommit'].nunique() > 1 and df[metric].nunique() > 1:
        rho_global, pval_global = spearmanr(df['bicsUntilCommit'], df[metric])
        print(f"  Global Spearmanr(bicsUntilCommit, {metric}): rho={rho_global:.3f}, p={pval_global:.4f}")
    else:
        print(f"  Global: Not enough variation for {metric}.")

print("\\n--- Maximale Anzahl BICs pro Projekt und Gesamtsumme ---")
bic_max_sum = 0
for project in df['project'].unique():
    project_df = df[df['project'] == project]
    max_bics = project_df['bicsUntilCommit'].max()
    bic_max_sum += max_bics
    print(f"  {project}: max BICs = {max_bics}")
print(f"→ Gesamtsumme max BICs über alle Projekte: {bic_max_sum}")

print("\\\\n--- Klassifikation der signifikanten Korrelationen ---")

def classify_strength(rho):
    abs_rho = abs(rho)
    if abs_rho > 0.7:
        return "very_strong_positive" if rho > 0 else "very_strong_negative"
    elif abs_rho > 0.5:
        return "strong_positive" if rho > 0 else "strong_negative"
    elif abs_rho > 0.3:
        return "moderate_positive" if rho > 0 else "moderate_negative"
    elif abs_rho > 0.1:
        return "weak_positive" if rho > 0 else "weak_negative"
    else:
        return "none"
        
counts = defaultdict(lambda: defaultdict(int))

for project in df['project'].unique():
    project_df = df[df['project'] == project]
    if len(project_df) > 1:
        total = get_sig_corr(project_df['total_data_clumps'], project_df['bicsUntilCommit'])
        field = get_sig_corr(project_df['fieldFieldDataClumps'], project_df['bicsUntilCommit'])
        param = get_sig_corr(project_df['parameterParameterDataClumps'], project_df['bicsUntilCommit'])
        paramField = get_sig_corr(project_df['parameterFieldDataClumps'], project_df['bicsUntilCommit'])

        values = {
            "total_data_clumps": total,
            "fieldFieldDataClumps": field,
            "parameterParameterDataClumps": param,
            "parameterFieldDataClumps": paramField,
        }

        for metric, val in values.items():
            if not pd.isna(val):
                category = classify_strength(val)
                counts[metric][category] += 1
                
# Ausgabe formatieren
metric_names = {
    "total_data_clumps": "All",
    "fieldFieldDataClumps": "Field–Field",
    "parameterParameterDataClumps": "Parameter–Parameter",
    "parameterFieldDataClumps": "Parameter–Field",
}

strength_order = [
    "very_strong_positive", "strong_positive", "moderate_positive", "weak_positive",
    "very_strong_negative", "strong_negative", "moderate_negative", "weak_negative",
    "none"
]

for metric in metric_names:
    print(f"\\\\nMetric: {metric_names[metric]}")
    for strength in strength_order:
        if counts[metric][strength] > 0:
            print(f"  {strength.replace('_', ' ').title()}: {counts[metric][strength]}")

print("\\n--- Heatmap ---")

# Farbdefinitionen
my_red = "${AnalyseHelper.getPrimaryColorAsHex()}"   # z. B. Uni-Rot
my_blue = "${AnalyseHelper.getPrimaryColorContrastAsHex()}"  # z. B. Blau
my_white = "${AnalyseHelper.getPrimaryColorNeutralAsHex()}"

# --- Konfigurierbare Labels für Metriken ---
metric_labels = {
    "total": "All",
    "paramField": "Parameter–\nField",
    "fieldField": "Field–\nField",
    "paramParam": "Parameter–\nParameter"
}

custom_cmap = LinearSegmentedColormap.from_list("custom", [my_blue, my_white, my_red], N=256)

# Heatmap vorbereiten
heatmap_rows = []

for project in df['project'].unique():
    project_df = df[df['project'] == project]
    if len(project_df) > 1:
        total = get_sig_corr(project_df['total_data_clumps'], project_df['bicsUntilCommit'])
        field = get_sig_corr(project_df['fieldFieldDataClumps'], project_df['bicsUntilCommit'])
        param = get_sig_corr(project_df['parameterParameterDataClumps'], project_df['bicsUntilCommit'])
        paramField = get_sig_corr(project_df['parameterFieldDataClumps'], project_df['bicsUntilCommit'])

        heatmap_rows.append([project, total, param, field, paramField])

# Datenrahmen erzeugen
heatmap_df = pd.DataFrame(heatmap_rows, columns=["Project", "total", "paramParam", "fieldField", "paramField"])
heatmap_df.set_index("Project", inplace=True)

# Labels übernehmen
heatmap_df.columns = [metric_labels.get(col, col) for col in heatmap_df.columns]

# Heatmap erzeugen
plt.figure(figsize=(12, 10))
sns.heatmap(
    heatmap_df,
    cmap=custom_cmap,
    center=0,
    annot=True,
    fmt=".2f",
    linewidths=0.5,
    cbar_kws={'label': "Spearman rank correlation coefficient $r_s$"}
)
plt.xlabel("Data Clump Type Correlated with Bug Introducing Commits")
plt.ylabel("Project")
plt.tight_layout()
plt.savefig("cliDataClumpsBugIntroducingCommitAnalyse.pdf", dpi=${AnalyseHelper.getPythonFigDpi()})
plt.show()

print("\\n--- Heatmap gespeichert ---")
`;

  return py;
}

async function main() {
  const options = AnalyseHelper.getCommandForAnalysis(process, {
    require_report_path: true,
    require_output_path: false,
    default_output_filename_without_extension: 'AnalyseDetectedDataClumpsFaultCorrelation',
  });

  const pyScript = await analyse(options.report_folder, options);
  const output = options.output;
  if (fs.existsSync(output)) fs.unlinkSync(output);
  fs.writeFileSync(output, pyScript);
  console.log('Written Python script to:', output);
}

main();
