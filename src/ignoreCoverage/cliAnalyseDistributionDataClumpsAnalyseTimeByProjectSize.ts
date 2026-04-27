#!/usr/bin/env node

import fs from 'fs';
import { AnalyseHelper } from './AnalyseHelper';
import { Timer } from './Timer';

type ProjectSizeTimingEntry = {
  number_of_classes_or_interfaces: number;
  number_of_methods: number;
  number_of_data_fields: number;
  number_of_method_parameters: number;
  ast_generation_time_ms: number;
  detection_time_ms: number;
  total_analysis_time_ms: number;
};

function analyseProjects(all_report_files_paths: string[], output_filename?: string) {
  console.log('Analysing analysis time by project size ...');

  const entries: ProjectSizeTimingEntry[] = [];

  const timer = new Timer();
  timer.start();

  for (let i = 0; i < all_report_files_paths.length; i++) {
    timer.printEstimatedTimeRemaining({
      progress: i,
      total: all_report_files_paths.length,
    });
    const report_file_path = all_report_files_paths[i];
    const report_file_json = AnalyseHelper.getReportFileJson(report_file_path);

    const project_info = report_file_json?.project_info || {};
    const number_of_classes_or_interfaces = (project_info as any).number_of_classes_or_interfaces || 0;
    const number_of_methods = (project_info as any).number_of_methods || 0;
    const number_of_data_fields = (project_info as any).number_of_data_fields || 0;
    const number_of_method_parameters = (project_info as any).number_of_method_parameters || 0;

    const additional_data = report_file_json?.report_summary?.additional || {};
    const timer_information = (additional_data as any)?.timer_information || {};
    const ast_generation_time_ms = timer_information?.ast_generation_time_ms || 0;
    const detection_time_ms = timer_information?.detection_time_ms || 0;
    const total_analysis_time_ms = ast_generation_time_ms + detection_time_ms;

    entries.push({
      number_of_classes_or_interfaces,
      number_of_methods,
      number_of_data_fields,
      number_of_method_parameters,
      ast_generation_time_ms,
      detection_time_ms,
      total_analysis_time_ms,
    });
  }

  let fileContent = AnalyseHelper.getPythonLibrariesFileContent();

  // Emit data as Python lists using existing helper
  fileContent += '\n# --- Data ---\n';
  fileContent += AnalyseHelper.getPythonValuesFor('number_of_classes_or_interfaces', entries.map(e => e.number_of_classes_or_interfaces));
  fileContent += AnalyseHelper.getPythonValuesFor('number_of_methods', entries.map(e => e.number_of_methods));
  fileContent += AnalyseHelper.getPythonValuesFor('number_of_data_fields', entries.map(e => e.number_of_data_fields));
  fileContent += AnalyseHelper.getPythonValuesFor('number_of_method_parameters', entries.map(e => e.number_of_method_parameters));
  fileContent += AnalyseHelper.getPythonValuesFor('ast_generation_time_ms', entries.map(e => e.ast_generation_time_ms));
  fileContent += AnalyseHelper.getPythonValuesFor('detection_time_ms', entries.map(e => e.detection_time_ms));
  fileContent += AnalyseHelper.getPythonValuesFor('total_analysis_time_ms', entries.map(e => e.total_analysis_time_ms));

  // Python analysis & scatter plot generation
  fileContent += `
# --- Analysis: Analysis Time vs Project Size ---

size_metrics = {
    'Classes/Interfaces': number_of_classes_or_interfaces,
    'Methods': number_of_methods,
    'Data Fields': number_of_data_fields,
    'Method Parameters': number_of_method_parameters,
}

time_metrics = {
    'AST Generation Time (ms)': ast_generation_time_ms,
    'Detection Time (ms)': detection_time_ms,
    'Total Analysis Time (ms)': total_analysis_time_ms,
}

primary_color = '${AnalyseHelper.getPrimaryColorAsHex()}'
contrast_color = '${AnalyseHelper.getPrimaryColorContrastAsHex()}'

# --- Correlation Analysis ---
print("\\n=== Spearman Rank Correlation: Analysis Time vs Project Size ===\\n")
correlation_results = []
for time_label, time_values in time_metrics.items():
    for size_label, size_values in size_metrics.items():
        tv = np.array(time_values, dtype=float)
        sv = np.array(size_values, dtype=float)
        mask = (tv > 0) & (sv > 0)
        tv_filtered = tv[mask]
        sv_filtered = sv[mask]
        if len(tv_filtered) > 2 and len(np.unique(tv_filtered)) > 1 and len(np.unique(sv_filtered)) > 1:
            rho, pval = spearmanr(sv_filtered, tv_filtered)
            sig = "***" if pval < 0.001 else ("**" if pval < 0.01 else ("*" if pval < 0.05 else "n.s."))
            print(f"  {time_label} vs {size_label}: rho={rho:.3f}, p={pval:.4f} {sig}")
            correlation_results.append({
                'time_metric': time_label,
                'size_metric': size_label,
                'rho': rho,
                'p': pval,
                'sig': sig,
                'n': len(tv_filtered)
            })
        else:
            print(f"  {time_label} vs {size_label}: Not enough data points or variation.")

# --- Scatter Plots: one subplot per size metric, total analysis time on y-axis ---
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
fig.suptitle('Total Analysis Time vs Project Size Metrics', fontsize=14, y=0.98)

for idx, (size_label, size_values) in enumerate(size_metrics.items()):
    ax = axes[idx // 2][idx % 2]
    tv = np.array(total_analysis_time_ms, dtype=float)
    sv = np.array(size_values, dtype=float)
    mask = (tv > 0) & (sv > 0)
    tv_filtered = tv[mask]
    sv_filtered = sv[mask]

    ax.scatter(sv_filtered, tv_filtered, alpha=0.5, s=20, color=primary_color, edgecolors='none')

    if len(sv_filtered) > 2 and len(np.unique(sv_filtered)) > 1 and len(np.unique(tv_filtered)) > 1:
        rho, pval = spearmanr(sv_filtered, tv_filtered)
        sig = "***" if pval < 0.001 else ("**" if pval < 0.01 else ("*" if pval < 0.05 else "n.s."))
        ax.set_title(f'{size_label}\\n(rho={rho:.3f}, p={pval:.4f} {sig})', fontsize=10)
    else:
        ax.set_title(f'{size_label}', fontsize=10)

    ax.set_xlabel(size_label)
    ax.set_ylabel('Total Analysis Time (ms)')
    if max(sv_filtered, default=0) > 100:
        ax.set_xscale('log')
    if max(tv_filtered, default=0) > 100:
        ax.set_yscale('log')
    ax.grid(True, alpha=0.3)

plt.tight_layout(rect=[0, 0, 1, 0.95])
fig.set_dpi(${AnalyseHelper.getPythonFigDpi()})
`;

  fileContent += `
output_filename = '${output_filename || 'AnalyseDistributionDataClumpsAnalyseTimeByProjectSize'}'
plt.savefig(output_filename + '.pdf', bbox_inches='tight')
plt.savefig(output_filename + '.png', bbox_inches='tight')
print(f"Saved scatter plot to {output_filename}.pdf and {output_filename}.png")
plt.show()
`;

  // --- Second figure: AST generation time + detection time separately ---
  fileContent += `
# --- Scatter Plots: AST Generation Time and Detection Time separately ---
fig2, axes2 = plt.subplots(2, 4, figsize=(20, 10))
fig2.suptitle('AST Generation Time and Detection Time vs Project Size Metrics', fontsize=14, y=0.98)

for time_idx, (time_label, time_values) in enumerate([ ('AST Generation Time (ms)', ast_generation_time_ms), ('Detection Time (ms)', detection_time_ms) ]):
    for size_idx, (size_label, size_values) in enumerate(size_metrics.items()):
        ax = axes2[time_idx][size_idx]
        tv = np.array(time_values, dtype=float)
        sv = np.array(size_values, dtype=float)
        mask = (tv > 0) & (sv > 0)
        tv_filtered = tv[mask]
        sv_filtered = sv[mask]

        color = primary_color if time_idx == 0 else contrast_color
        ax.scatter(sv_filtered, tv_filtered, alpha=0.5, s=20, color=color, edgecolors='none')

        if len(sv_filtered) > 2 and len(np.unique(sv_filtered)) > 1 and len(np.unique(tv_filtered)) > 1:
            rho, pval = spearmanr(sv_filtered, tv_filtered)
            sig = "***" if pval < 0.001 else ("**" if pval < 0.01 else ("*" if pval < 0.05 else "n.s."))
            ax.set_title(f'{size_label}\\n(rho={rho:.3f}, p={pval:.4f} {sig})', fontsize=9)
        else:
            ax.set_title(f'{size_label}', fontsize=9)

        ax.set_xlabel(size_label, fontsize=8)
        ax.set_ylabel(time_label, fontsize=8)
        if max(sv_filtered, default=0) > 100:
            ax.set_xscale('log')
        if max(tv_filtered, default=0) > 100:
            ax.set_yscale('log')
        ax.grid(True, alpha=0.3)

plt.tight_layout(rect=[0, 0, 1, 0.95])
fig2.set_dpi(${AnalyseHelper.getPythonFigDpi()})

output_filename_detailed = output_filename + '_detailed'
plt.savefig(output_filename_detailed + '.pdf', bbox_inches='tight')
plt.savefig(output_filename_detailed + '.png', bbox_inches='tight')
print(f"Saved detailed scatter plot to {output_filename_detailed}.pdf and {output_filename_detailed}.png")
plt.show()
`;

  // --- Correlation summary table as CSV ---
  fileContent += `
# --- Save correlation results to CSV ---
if correlation_results:
    csv_filename = output_filename + '_correlations.csv'
    with open(csv_filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['time_metric', 'size_metric', 'rho', 'p', 'sig', 'n'])
        writer.writeheader()
        writer.writerows(correlation_results)
    print(f"Saved correlation results to {csv_filename}")
`;

  return fileContent;
}

async function analyse(report_folder: string, options: any, defaultFilenameWithoutExtension: string) {
  console.log('Start Analysing Analysis Time By Project Size');
  if (!fs.existsSync(report_folder)) {
    console.log('ERROR: Specified path to report folder does not exist: ' + report_folder);
    process.exit(1);
  }

  const all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
  console.log('all_report_files_paths: ' + all_report_files_paths.length);

  const filecontent = analyseProjects(all_report_files_paths, defaultFilenameWithoutExtension);
  return filecontent;
}

async function main() {
  console.log('Start Data-Clumps-Doctor Analysis: Analysis Time By Project Size');

  const defaultFilenameWithoutExtension = 'AnalyseDistributionDataClumpsAnalyseTimeByProjectSize';
  const options = AnalyseHelper.getCommandForAnalysis(process, {
    description: 'Generate Scatter Plots: Analysis Time vs Project Size Metrics',
    require_report_path: true,
    require_output_path: true,
    default_output_filename_without_extension: defaultFilenameWithoutExtension,
  });

  const report_folder = options.report_folder;
  const filecontent = await analyse(report_folder, options, defaultFilenameWithoutExtension);

  const output = options.output;
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
  }

  console.log('Writing output to file: ' + output);
  fs.writeFileSync(output, filecontent);
}

main();
