#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { Command } from 'commander';
import { Analyzer } from './Analyzer';
import { DataClumpsTypeContext, DataClumpsVariableFromContext, DataClumpTypeContext } from 'data-clumps-type-context';
import { AnalyseHelper } from './AnalyseHelper';
import { Timer } from './Timer';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

const current_working_directory = process.cwd();

program
  .description('Analyse Detected Data-Clumps\n\n' + 'This script performs data clumps detection in a given directory.\n\n' + 'npx data-clumps-doctor [options] <path_to_folder>')
  .version(version)
  .option('--report_folder <path>', 'Output path', current_working_directory + '/data-clumps-results/' + Analyzer.project_name_variable_placeholder + '/'); // Default value is './data-clumps.json'

function myLog(prefixInformation: PrefixInformation, message: string) {
  let project_name = prefixInformation.project_name;
  let projectIndex = prefixInformation.projectIndex;
  let totalProjects = prefixInformation.totalProjects;

  prefixInformation.timer.printEstimatedTimeRemaining({
    prefix: `[${project_name}]: ${message}`,
    progress: projectIndex,
    total: totalProjects,
  });
}

async function getAllDataClumpsKeys(sorted_report_file_paths: string[], prefixInformation: PrefixInformation) {
  let all_data_clump_keys = {};
  myLog(prefixInformation, 'Getting all data clump keys');

  for (let i = 0; i < sorted_report_file_paths.length; i++) {
    myLog(prefixInformation, 'Total Keys: Timestamp: ' + i + ' / ' + sorted_report_file_paths.length);

    let report_file_path = sorted_report_file_paths[i];
    let report_file_json = await AnalyseHelper.getReportFileJson(report_file_path);
    let data_clumps_keys = Object.keys(report_file_json.data_clumps);

    // check if data clump key is already in histogram and if not add it
    for (let j = 0; j < data_clumps_keys.length; j++) {
      let data_clump_key = data_clumps_keys[j];
      all_data_clump_keys[data_clump_key] = true;
    }
  }

  return all_data_clump_keys;
}

async function getTypeAKeysDict_DataClumpsInAllTimestamps(sorted_report_file_paths: string[], prefixInformation: PrefixInformation) {
  myLog(prefixInformation, 'Getting type A keys dict');

  let keys_type_a = {};

  let amount_report_files = sorted_report_file_paths.length;

  let dict_data_clump_key_to_amount_found: any = {};

  for (let j = 0; j < amount_report_files; j++) {
    myLog(prefixInformation, 'A Timestamp: ' + j + ' / ' + sorted_report_file_paths.length);

    let report_file_path = sorted_report_file_paths[j];
    let report_file_json = await AnalyseHelper.getReportFileJson(report_file_path);

    let data_clumps_dict = report_file_json.data_clumps;
    let data_clumps_keys = Object.keys(data_clumps_dict);
    for (let data_clumps_key of data_clumps_keys) {
      let amount_found = dict_data_clump_key_to_amount_found[data_clumps_key] || 0;
      amount_found += 1;
      dict_data_clump_key_to_amount_found[data_clumps_key] = amount_found;
    }
  }

  let data_clump_keys = Object.keys(dict_data_clump_key_to_amount_found);
  for (let data_clump_key of data_clump_keys) {
    let amount_found = dict_data_clump_key_to_amount_found[data_clump_key];
    if (amount_found === amount_report_files) {
      keys_type_a[data_clump_key] = true;
    }
  }

  return keys_type_a;
}

// keys that are found in the last timestamp but not in the first timestamp
async function getTypeBKeysDict_DataClumpsAfterStartButTillEnd(sorted_report_file_paths: string[], prefixInformation: PrefixInformation) {
  myLog(prefixInformation, 'Getting type B keys dict');

  let keys_in_first_timestamp = {};
  let keys_in_last_timestamp = {};

  let amount_report_files = sorted_report_file_paths.length;

  let first_timestamp = sorted_report_file_paths[0];
  let last_timestamp = sorted_report_file_paths[amount_report_files - 1];

  for (let j = 0; j < amount_report_files; j++) {
    myLog(prefixInformation, 'B Timestamp: ' + j + ' / ' + sorted_report_file_paths.length);
    let report_file_path = sorted_report_file_paths[j];
    let report_file = await AnalyseHelper.getReportFileJson(report_file_path);

    let data_clumps_dict = report_file?.data_clumps;
    let data_clumps_keys = Object.keys(data_clumps_dict);
    for (let data_clumps_key of data_clumps_keys) {
      if (report_file_path === first_timestamp) {
        keys_in_first_timestamp[data_clumps_key] = true;
      }

      if (report_file_path === last_timestamp) {
        keys_in_last_timestamp[data_clumps_key] = true;
      }
    }
  }

  let keys_type_b = keys_in_last_timestamp;

  // remove keys that are in last timestamp
  for (let data_clump_key in keys_in_first_timestamp) {
    delete keys_type_b[data_clump_key];
  }

  return keys_type_b;
}

// keys that are found in the last but not in the first timestamp
async function getTypeCKeysDict_DataClumpsFromStartButNotTillEnd(sorted_report_file_paths: string[], prefixInformation: PrefixInformation) {
  myLog(prefixInformation, 'Getting type C keys dict');

  let keys_in_first_timestamp = {};
  let keys_in_last_timestamp = {};

  let amount_report_files = sorted_report_file_paths.length;

  let first_timestamp = sorted_report_file_paths[0];
  let last_timestamp = sorted_report_file_paths[amount_report_files - 1];

  for (let j = 0; j < amount_report_files; j++) {
    myLog(prefixInformation, 'C Timestamp: ' + j + ' / ' + sorted_report_file_paths.length);
    let report_file_path = sorted_report_file_paths[j];
    let report_file = await AnalyseHelper.getReportFileJson(report_file_path);

    let data_clumps_dict = report_file?.data_clumps;
    let data_clumps_keys = Object.keys(data_clumps_dict);
    for (let data_clumps_key of data_clumps_keys) {
      if (report_file_path === first_timestamp) {
        keys_in_first_timestamp[data_clumps_key] = true;
      }

      if (report_file_path === last_timestamp) {
        keys_in_last_timestamp[data_clumps_key] = true;
      }
    }
  }

  let keys_type_c = keys_in_first_timestamp;

  // remove keys that are in last timestamp
  for (let data_clump_key in keys_in_last_timestamp) {
    delete keys_type_c[data_clump_key];
  }

  return keys_type_c;
}

async function getTypeDKeysDict_DataClumpsAfterStartAndBeforeEnd(sorted_report_file_paths: string[], prefixInformation: PrefixInformation) {
  myLog(prefixInformation, 'Getting type D keys dict');

  let keys_type_d = {};

  let keys_in_first_timestamp = {};
  let keys_in_last_timestamp = {};

  let amount_report_files = sorted_report_file_paths.length;

  let first_timestamp = sorted_report_file_paths[0];
  let last_timestamp = sorted_report_file_paths[amount_report_files - 1];

  for (let j = 0; j < amount_report_files; j++) {
    myLog(prefixInformation, 'D Timestamp: ' + j + ' / ' + sorted_report_file_paths.length);
    let report_file_path = sorted_report_file_paths[j];
    let report_file = await AnalyseHelper.getReportFileJson(report_file_path);

    let data_clumps_dict = report_file?.data_clumps;
    let data_clumps_keys = Object.keys(data_clumps_dict);
    for (let data_clumps_key of data_clumps_keys) {
      if (report_file_path === first_timestamp) {
        keys_in_first_timestamp[data_clumps_key] = true;
      }

      if (report_file_path === last_timestamp) {
        keys_in_last_timestamp[data_clumps_key] = true;
      }

      keys_type_d[data_clumps_key] = true;
    }
  }

  // remove keys that are in first timestamp
  for (let data_clump_key in keys_in_first_timestamp) {
    delete keys_type_d[data_clump_key];
  }

  // remove keys that are in last timestamp
  for (let data_clump_key in keys_in_last_timestamp) {
    delete keys_type_d[data_clump_key];
  }

  return keys_type_d;
}

async function getTypeEKeysDict_DataClumpsInFirstNotInMiddleButAgainAtEnd(sorted_report_file_paths: string[], prefixInformation: PrefixInformation) {
  myLog(prefixInformation, 'Getting type E keys dict');

  let keys_type_e = {};

  let amount_report_files = sorted_report_file_paths.length;

  let dict_data_clump_key_to_amount_found: any = {};

  let keys_in_first_timestamp = {};
  let keys_in_last_timestamp = {};

  let first_timestamp = sorted_report_file_paths[0];
  let last_timestamp = sorted_report_file_paths[amount_report_files - 1];

  for (let j = 0; j < amount_report_files; j++) {
    myLog(prefixInformation, 'E Timestamp: ' + j + ' / ' + sorted_report_file_paths.length);

    let report_file_path = sorted_report_file_paths[j];
    let report_file = await AnalyseHelper.getReportFileJson(report_file_path);

    let data_clumps_dict = report_file?.data_clumps;
    let data_clumps_keys = Object.keys(data_clumps_dict);
    for (let data_clumps_key of data_clumps_keys) {
      let amount_found = dict_data_clump_key_to_amount_found[data_clumps_key] || 0;
      amount_found += 1;
      dict_data_clump_key_to_amount_found[data_clumps_key] = amount_found;

      if (report_file_path === first_timestamp) {
        keys_in_first_timestamp[data_clumps_key] = true;
      }

      if (report_file_path === last_timestamp) {
        keys_in_last_timestamp[data_clumps_key] = true;
      }
    }
  }

  // Get keys which are in first and last
  let keys_in_first_an_last = {};
  for (let data_clump_key_in_first in keys_in_first_timestamp) {
    for (let data_clump_key_in_last in keys_in_last_timestamp) {
      if (data_clump_key_in_first === data_clump_key_in_last) {
        keys_in_first_an_last[data_clump_key_in_first] = true;
      }
    }
  }

  let key_in_first_an_last_list = Object.keys(keys_in_first_an_last);
  for (let data_clump_key of key_in_first_an_last_list) {
    let amount_found = dict_data_clump_key_to_amount_found[data_clump_key];
    if (amount_found < amount_report_files) {
      // but are missing somewhere in between
      keys_type_e[data_clump_key] = true;
    }
  }

  return keys_type_e;
}

type HistoryDistribution = {
  fromStartTillEnd: number;
  afterStartButTillEnd: number;
  fromStartButNotTillEnd: number;
  afterStartAndBeforeEnd: number;
  fromStartTillEndButMissingInBetween: number;
};

type PrefixInformation = {
  project_name: string;
  projectIndex: number;
  timer: Timer;
  projectTimer: Timer;
  totalProjects: number;
};

async function getHistoryDistribution(sorted_report_file_paths: string[], project_name: string, prefixInformation: PrefixInformation): Promise<HistoryDistribution> {
  myLog(prefixInformation, 'getHistoryDistribution for project: ' + project_name);

  let all_data_clumps_keys = await getAllDataClumpsKeys(sorted_report_file_paths, prefixInformation);
  let amount_data_clumps_keys = Object.keys(all_data_clumps_keys).length;

  let keys_type_a = await getTypeAKeysDict_DataClumpsInAllTimestamps(sorted_report_file_paths, prefixInformation);
  let keys_type_b = await getTypeBKeysDict_DataClumpsAfterStartButTillEnd(sorted_report_file_paths, prefixInformation);
  let keys_type_c = await getTypeCKeysDict_DataClumpsFromStartButNotTillEnd(sorted_report_file_paths, prefixInformation);
  let keys_type_d = await getTypeDKeysDict_DataClumpsAfterStartAndBeforeEnd(sorted_report_file_paths, prefixInformation);
  let keys_type_e = await getTypeEKeysDict_DataClumpsInFirstNotInMiddleButAgainAtEnd(sorted_report_file_paths, prefixInformation);

  let amount_keys_type_a = Object.keys(keys_type_a).length;
  let amount_keys_type_b = Object.keys(keys_type_b).length;
  let amount_keys_type_c = Object.keys(keys_type_c).length;
  let amount_keys_type_d = Object.keys(keys_type_d).length;
  let amount_keys_type_e = Object.keys(keys_type_e).length;

  let control_sum = amount_keys_type_a + amount_keys_type_b + amount_keys_type_c + amount_keys_type_d + amount_keys_type_e;
  if (control_sum !== amount_data_clumps_keys) {
    console.log('ERROR: Control sum does not match');
    console.log('control_sum: ' + control_sum);
    console.log('amount_data_clumps_keys: ' + amount_data_clumps_keys);
    console.log('amount_keys_type_a: ' + amount_keys_type_a);
    console.log('amount_keys_type_b: ' + amount_keys_type_b);
    console.log('amount_keys_type_c: ' + amount_keys_type_c);
    console.log('amount_keys_type_d: ' + amount_keys_type_d);
    console.log('amount_keys_type_e: ' + amount_keys_type_e);

    process.exit(1);
  }

  myLog(prefixInformation, 'amount_data_clumps_keys: ' + amount_data_clumps_keys);
  let percentage_type_a = (amount_keys_type_a / amount_data_clumps_keys) * 100;
  percentage_type_a = parseFloat(percentage_type_a.toFixed(2));
  let percentage_type_b = (amount_keys_type_b / amount_data_clumps_keys) * 100;
  percentage_type_b = parseFloat(percentage_type_b.toFixed(2));
  let percentage_type_c = (amount_keys_type_c / amount_data_clumps_keys) * 100;
  percentage_type_c = parseFloat(percentage_type_c.toFixed(2));
  let percentage_type_d = (amount_keys_type_d / amount_data_clumps_keys) * 100;
  percentage_type_d = parseFloat(percentage_type_d.toFixed(2));
  let percentage_type_e = (amount_keys_type_e / amount_data_clumps_keys) * 100;
  percentage_type_e = parseFloat(percentage_type_e.toFixed(2));

  myLog(prefixInformation, 'percentage_type_a: ' + percentage_type_a + '% --- ' + amount_keys_type_a + ' / ' + amount_data_clumps_keys);
  myLog(prefixInformation, 'percentage_type_b: ' + percentage_type_b + '% --- ' + amount_keys_type_b + ' / ' + amount_data_clumps_keys);
  myLog(prefixInformation, 'percentage_type_c: ' + percentage_type_c + '% --- ' + amount_keys_type_c + ' / ' + amount_data_clumps_keys);
  myLog(prefixInformation, 'percentage_type_d: ' + percentage_type_d + '% --- ' + amount_keys_type_d + ' / ' + amount_data_clumps_keys);
  myLog(prefixInformation, 'percentage_type_e: ' + percentage_type_e + '% --- ' + amount_keys_type_e + ' / ' + amount_data_clumps_keys);

  let history_distribution: HistoryDistribution = {
    fromStartTillEnd: percentage_type_a, // Type A, a key in in all timestamps
    afterStartButTillEnd: percentage_type_b, // Type B a key is in the last timestamp but is missing in any other
    fromStartButNotTillEnd: percentage_type_c, // Type C a key is in the first timestamp but is missing in any other
    afterStartAndBeforeEnd: percentage_type_d, // Type D a key is not in the first and not in the last timestamp but is in any other
    fromStartTillEndButMissingInBetween: percentage_type_e, // New Type E
  };

  return history_distribution;
}

async function analyse(report_project_folder_path, options) {
  console.log('Analysing Detected Data-Clumps');
  if (!fs.existsSync(report_project_folder_path)) {
    console.log('ERROR: Specified path to report folder does not exist: ' + report_project_folder_path);
    process.exit(1);
  }

  const totalTimer = new Timer();
  totalTimer.start();

  let all_files_or_folders = fs.readdirSync(report_project_folder_path);
  let all_project_folders = all_files_or_folders.filter(file => {
    let file_path = path.join(report_project_folder_path, file);
    // only include folders
    if (fs.lstatSync(file_path).isDirectory()) {
      return true;
    } else {
      console.log('Skipping file: ' + file);
      return false;
    }
  });

  console.log('All project folders have been detected');

  let projectHistoryDistributions: Record<string, HistoryDistribution> = {};

  for (let i = 0; i < all_project_folders.length; i++) {
    let folder_name = all_project_folders[i];
    let folder_path = path.join(report_project_folder_path, folder_name);
    console.log('Analysing project folder: ' + folder_name);

    let sorted_report_file_paths_for_project = AnalyseHelper.getSortedReportFilePathsByTimestamps(folder_path);
    console.log('sorted_timestamps: ' + sorted_report_file_paths_for_project.length);

    let projectName = folder_name;
    let first_report_file_path = sorted_report_file_paths_for_project[0];
    let first_report_file = await AnalyseHelper.getReportFileJson(first_report_file_path);
    projectName = first_report_file.project_info.project_name || projectName;

    let prefixInformation: PrefixInformation = {
      project_name: projectName,
      projectIndex: i + 1,
      timer: totalTimer,
      projectTimer: new Timer(),
      totalProjects: all_project_folders.length,
    };

    let projectHistoryDistribution = await getHistoryDistribution(sorted_report_file_paths_for_project, projectName, prefixInformation);
    projectHistoryDistributions[projectName] = projectHistoryDistribution;
  }

  totalTimer.stop();
  totalTimer.printElapsedTime('Total Analysis Time');

  // write the projectHistoryDistributions to a file
  let fileContent = AnalyseHelper.getPythonLibrariesFileContent(); // imports libraries required for the file

  fileContent += `\n\nprojectHistoryDistributions = {\n`;

  for (const [projectName, history] of Object.entries(projectHistoryDistributions)) {
    const safeProjectName = JSON.stringify(projectName);

    fileContent += `    ${safeProjectName}: {\n`;
    fileContent += `        'total': ${Object.values(history).reduce((acc, p) => acc + p, 0)},\n`;
    fileContent += `        'A': ${history.fromStartTillEnd},\n`;
    fileContent += `        'B': ${history.afterStartButTillEnd},\n`;
    fileContent += `        'C': ${history.fromStartButNotTillEnd},\n`;
    fileContent += `        'D': ${history.afterStartAndBeforeEnd},\n`;
    fileContent += `        'E': ${history.fromStartTillEndButMissingInBetween},\n`;
    fileContent += `    },\n`;
  }
  fileContent += `}\n\n`;

  fileContent += `perc_a = []
perc_b = []
perc_c = []
perc_d = []
perc_e = []

for proj, values in projectHistoryDistributions.items():
    perc_a.append(values['A'])
    perc_b.append(values['B'])
    perc_c.append(values['C'])
    perc_d.append(values['D'])
    perc_e.append(values['E'])

data = [perc_a, perc_b, perc_c, perc_d, perc_e]

category_labels = ['A', 'B', 'C', 'D', 'E']
colors = ['#c9daf8', '#ea9999', '#b6d7a8', '#ffe599', '#d5a6bd']  # Farbe für E

fig, ax = plt.subplots(figsize=(6, 5), dpi=${AnalyseHelper.getPythonFigDpi()})  # Breite 6 Zoll, Höhe 4 Zoll, 300 DPI
box = ax.boxplot(data, ${AnalyseHelper.getPythonMedianColor()}, patch_artist=True, labels=category_labels)

# Farben anwenden
for patch, color in zip(box['boxes'], colors):
    patch.set_facecolor(color)

# Legenden-Patches erzeugen
legend_patches = [
    plt.Line2D([0], [0], color='black', markerfacecolor=clr, marker='s',
               linestyle='None', markersize=10)
    for clr in colors
]

ax.legend(
    legend_patches,
    ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
    loc='upper center',
    bbox_to_anchor=(0.5, -0.12),
    ncol=3,
    fancybox=True,
    shadow=True
)

ax.set_ylabel("Percentage of Data Clumps")
ax.set_xlabel("Code Smell Evolution Category")
ax.set_ylim(0, 100)

plt.grid(True, linestyle='--', alpha=0.7)
plt.tight_layout()
plt.subplots_adjust(bottom=0.23)

# Optional speichern
# plt.savefig("data_clumps_boxplot.png", dpi=300)

#plt.show()
plt.savefig("AnalyseDetectedDataClumpsEvolution.pdf", dpi=${AnalyseHelper.getPythonFigDpi()}, bbox_inches='tight')

all_data = {
    'A': perc_a,
    'B': perc_b,
    'C': perc_c,
    'D': perc_d,
    'E': perc_e
}

${AnalyseHelper.getPythonStatisticsForDataValues()}
`;

  return fileContent;
}

async function main() {
  console.log('Data-Clumps-Doctor Detection');

  // Get the options and arguments
  const options = AnalyseHelper.getCommandForAnalysis(process, {
    require_report_path: true,
    require_output_path: false,
    default_output_filename_without_extension: 'AnalyseDetectedDataClumpsEvolution',
  });

  const report_folder = options.report_folder;

  let fileContent = await analyse(report_folder, options);
  let output = options.output;
  // delete output file if it exists
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
  }

  console.log('Writing output to file: ' + output);
  fs.writeFileSync(output, fileContent);
}

main();
