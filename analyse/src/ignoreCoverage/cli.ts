#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import {Command} from 'commander';
import {Analyzer} from "./Analyzer";
import {GitHelper} from "./GitHelper";
import * as os from "os";
import {DetectorOptions} from "./detector/Detector";
import {AnalyseHelper} from "./AnalyseHelper"; // import commander

const packageJsonPath = path.join(__dirname, '..','..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// path to temp folder

let default_git_project_temp_folder = AnalyseHelper.getTempFolderPathToTempGitClonesProjectWithVariablePlaceholder();
let default_ast_output_temp_folder = path.join(AnalyseHelper.getTempFolderPath(), "data_clumps_doctor",'temp_ast_output_'+Analyzer.project_name_variable_placeholder);
let default_git_tag_start_offset = 0;

const program = new Command();

const path_to_ast_generator_folder = __dirname+"/astGenerator";
//console.log("path_to_ast_generator_folder: "+path_to_ast_generator_folder)

const current_working_directory = process.cwd();

function parseArrayFromString(value: string): string[] {
    return value
        .replace(/^\[|\]$/g, "") // eckige Klammern weg
        .split(",")              // Kommagetrennt splitten
        .map((s) => s.trim());   // Leerzeichen trimmen
}

program
    .description('Data-Clumps Detection\n\n' +
        'This script performs data clumps detection in a given directory.\n\n' +
        'npx data-clumps-doctor [options] <path_to_folder>')
    .version(version)
//    .argument('<path_to_project>', 'Absolute path to project (a git project in best case)')
    .option('--git_project_url_to_analyse <git_project_url_to_analyse>', 'Git project URL to analyse. If you want to analyse just a specific folder in the project, you have to use --relative_path_to_source_folder_in_project.')
    .option('--git_project_urls_to_analyse <git_project_urls_to_analyse>', 'Git project URLs to analyse. Comma separated list of URLs.', (val) => {return parseArrayFromString(val);}, [] )
    .option('--git_project_temp_folder <git_project_temp_folder>', 'Git project temp folder (default: '+default_git_project_temp_folder+")", default_git_project_temp_folder)
    .option('--git_tag_start_offset <git_tag_start_offset>', 'Offset to start from the last tag (default: 0)', ''+default_git_tag_start_offset)
    .option('--path_to_project <path_to_project>', 'Absolute path to project (a git project in best case)', undefined)
    .option('--path_to_projects <path_to_projects>', 'Absolute path to folder containing multiple projects', undefined)
    .option('--relative_path_to_source_folder_in_project <relative_path_to_source_folder_in_project>', 'Relative path to source files (default is ./). If you want to analyse just a specific folder in the project, you can specify it here. For example ./src if the source files are in the src folder.', './')
    .option('--preserve_ast_output <preserve_ast_output>', 'If the ast_output folder should be preserved (default: false).', false)
    .option('--path_to_ast_generator_folder', 'Absolute path to the ast generator folder (In this project: astGenerator)', path_to_ast_generator_folder)
    .option('--ast_output <path_to_ast_output>', 'Path where to save the generated AST output. By default it is in a temp folder (default: '+default_ast_output_temp_folder+")", default_ast_output_temp_folder)
    .option('--source_type <type>', 'Source type (default: java, options: java, uml, ast, typescript, digitalTwinsDefinitionLanguage, ngsi-ld). uml: Class Diagram in the simple XML Export format of Visual Paradigm. ast: A well formed AST', "java")
    .option('--language <type>', 'Language (default: java, options: java)', "java")
    .option('--verbose', 'Verbose output', false)
    .option('--progress', 'Show progress', true)  // Default value is true
    .option('--output <path>', 'Output path', current_working_directory+'/data-clumps-results/'+Analyzer.project_name_variable_placeholder+'/'+Analyzer.project_commit_variable_placeholder+'.json') // Default value is './data-clumps.json'
    .option('--detector_options_path <detector_options_path>', 'Path to detector options file. It can take all options which are in the generated output at: detector.options', undefined)
    .option('--detector_options_use_uncertainty <detector_options_use_uncertainty>', 'If unknown dependencies shall be also analysed', false)
    .option(
        "--detector_options_ignored_variable_names <names>","List of ignored variable names (supports [a,b,c])",(val) => {return parseArrayFromString(val);}, [] )
    .option('--project_name <project_name>', 'Project Name (default: Git-Name)')
    .option('--project_url <project_url>', 'Project URL (default: Git-Repo-URL)')
    .option('--project_version <project_version>', 'Project Version (default: Git-Commit hash)')
    .option('--project_commit <project_commit>', 'Project Commit (default: current Git-Commit hash)')
    .option('--commit_selection <mode>', 'Commit selections (default: current, options: history, tags, "commit_hash1,commit_hash2,...")')
    .option('--fast_detection <boolean>', 'Fast detection (default: true)', true)
// TODO: --detector_options <path_to_detector_options_json>

async function analyse(path_to_project, options){
    const source_type = options.source_type;
    const path_to_ast_generator_folder = options.path_to_ast_generator_folder;

    let relative_path_to_source_folder_in_project = options.relative_path_to_source_folder_in_project;

    const absolute_path_to_source = path.resolve(path_to_project, relative_path_to_source_folder_in_project);
    //console.log("Absolute path to source: " + absolute_path_to_source);
    const path_to_ast_output = path.resolve(options.ast_output);
    let path_to_output_with_variables = options.output;

    let project_version = options.project_version;
    let preserve_ast_output = options.preserve_ast_output;

    let git_tag_start_offset = default_git_tag_start_offset
    if(options.git_tag_start_offset){
        git_tag_start_offset = parseInt(options.git_tag_start_offset);
    }

    let detector_options_path = options.detector_options_path;
    let detector_options: Partial<DetectorOptions> = {};

    let detector_options_use_uncertainty = options.detector_options_use_uncertainty
    if(detector_options_use_uncertainty){
        detector_options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier = 0.5;
        detector_options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier = 0.5;
    }

    let detector_options_ignored_variable_names = options.detector_options_ignored_variable_names
    if(detector_options_ignored_variable_names && detector_options_ignored_variable_names.length > 0){
        detector_options.ignoredVariableNames = detector_options_ignored_variable_names;
    }

    if(!!detector_options_path){
        if(fs.existsSync(detector_options_path)){
            let detector_options_string = fs.readFileSync(detector_options_path, 'utf8');
            try{
                detector_options = JSON.parse(detector_options_string);
            } catch (e) {
                console.log("Invalid detector options file: " + detector_options_path);
                process.exit(1);
            }
        } else {
            console.log("Detector options file does not exist: " + detector_options_path);
            process.exit(1);
        }
    }

    console.log("Detector options: ");
    let fast_detection = options.fast_detection;
    console.log("Fast detection: "+fast_detection);
    if(fast_detection === undefined || fast_detection === null || fast_detection === "null" || fast_detection === "true" || fast_detection === true){
        detector_options.fastDetection = true;
    } else if(fast_detection === "false" || fast_detection === false){
        detector_options.fastDetection = false;
        console.log("Fast detection is disabled by parameter --fast_detection false");
    }

    const commit_selection_mode = options.commit_selection;

    let passed_project_name = options.project_name;
    let passed_project_url = options.project_url;

    let analyzer = new Analyzer(
        path_to_project,
        path_to_ast_generator_folder,
        path_to_output_with_variables,
        absolute_path_to_source,
        source_type,
        path_to_ast_output,
        commit_selection_mode,
        passed_project_url,
        git_tag_start_offset,
        passed_project_name,
        project_version,
        preserve_ast_output,
        detector_options
    );

    await analyzer.start()
}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    program.parse(process.argv);
    const options = program.opts();

    const git_project_url_to_analyse_raw = options.git_project_url_to_analyse;
    let git_project_urls_to_analyse = options.git_project_urls_to_analyse;
    if(git_project_url_to_analyse_raw && git_project_urls_to_analyse.length === 0){
        git_project_urls_to_analyse = [git_project_url_to_analyse_raw];
    }

    const raw_path_to_project = options.path_to_project;
    const raw_path_to_projects = options.path_to_projects;

    if(git_project_urls_to_analyse.length===0 && !raw_path_to_project && !raw_path_to_projects) {
        console.log("ERROR: No project specified. Use --path_to_project, --path_to_projects or --git_project_url_to_analyse");
        process.exit(1);
    }

    const path_to_ast_generator_folder = options.path_to_ast_generator_folder;
    if (!fs.existsSync(path_to_ast_generator_folder)) {
        console.log("ERROR: Specified path to ast generator folder does not exist: "+path_to_ast_generator_folder);
        process.exit(1);
    }

    if(raw_path_to_project){
        await analyse(raw_path_to_project, options);

    } else if(raw_path_to_projects){
        const projectsDir = path.resolve(raw_path_to_projects);
        if(!fs.existsSync(projectsDir) || !fs.lstatSync(projectsDir).isDirectory()){
            console.log("ERROR: --path_to_projects must be a folder");
            process.exit(1);
        }

        const subfolders = fs.readdirSync(projectsDir)
            .map(name => path.join(projectsDir, name))
            .filter(p => fs.lstatSync(p).isDirectory());

        console.log("Found "+subfolders.length+" projects in "+projectsDir);
        for(const projectPath of subfolders){
            console.log("▶ Analysing project: "+projectPath);
            try {
                await analyse(projectPath, options);
            } catch(e){
                console.error("❌ Error analysing "+projectPath+":", e);
            }
        }

    } else {
        console.log("Git analysis of "+git_project_urls_to_analyse.length+" projects");


        for(const git_project_url_to_analyse of git_project_urls_to_analyse){
            // Git URL case
            options.git_project_temp_folder = AnalyseHelper.getTempFolderPathGotTempGitClonedProject(
                git_project_url_to_analyse,
                options.git_project_temp_folder
            );

            let path_to_project = path.resolve(options.git_project_temp_folder);
            if(fs.existsSync(path_to_project)){
                fs.rmSync(path_to_project, { recursive: true, force: true, maxRetries: 10 });
            }
            fs.mkdirSync(path_to_project, { recursive: true });

            console.log("Cloning project "+git_project_url_to_analyse+" to "+path_to_project);
            await GitHelper.cloneGitProject(git_project_url_to_analyse, path_to_project);
            await analyse(path_to_project, options);
            if(fs.existsSync(path_to_project)){
                fs.rmSync(path_to_project, { recursive: true, force: true, maxRetries: 10 });
            }
        }
    }
}

main();

