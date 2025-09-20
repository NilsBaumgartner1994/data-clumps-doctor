import { GitHelper } from './GitHelper';
import fs from 'fs';
import { SoftwareProjectDicts } from './SoftwareProject';
import { Detector } from './detector/Detector';
import { ParserHelperJavaSourceCode } from './parsers/ParserHelperJavaSourceCode';
import { Timer } from './Timer';
import path from 'path';
import { ParserHelper } from './ParserHelper';
import { ParserHelperXmlVisualParadigm } from './parsers/ParserHelperXmlVisualParadigm';
import { DetectorUtils } from './detector/DetectorUtils';
import os from 'os';
import { DetectorOptions } from '../index';
import { ParserInterface } from './parsers/ParserInterface';
import { ParserHelperDigitalTwinsDefinitionLanguage } from './parsers/ParserHelperDigitalTwinsDefinitionLanguage';
import { ParserHelperTypeScript } from './parsers/ParserHelperTypeScript';
import { DataClumpsTypeContext } from 'data-clumps-type-context';
import { AnalyseHelper } from './AnalyseHelper';
import { ParserHelperDigitalTwinsNGSI_LD } from './parsers/ParserHelperDigitalTwinsNGSI_LD';
import { ProjectInfo } from './ProjectInfo';

export class Analyzer {
  public static project_name_variable_placeholder = '{project_name}';
  public static project_commit_variable_placeholder = '{project_commit}';

  public git_tag_start_offset: number;
  public path_to_project: string;
  public path_to_ast_generator_folder: string;
  public path_to_output_with_variables: string;
  public path_to_source: string;
  public source_type: string;
  public path_to_ast_output: string;
  public commit_selection_mode: string | undefined | null;
  public detectorOptions: DetectorOptions;
  public project_version: any;
  public preserve_ast_output: boolean;

  public passed_project_name: string | undefined | null;

  public projectInfo: ProjectInfo;
  public astTimer: Timer;
  public detectTimer: Timer;
  public gitTimer: Timer;

  public couldNotGenerateAstForCommits: string[] = [];

  constructor(path_to_project: string, path_to_ast_generator_folder: string, path_to_output_with_variables: string, path_to_source: string, source_type: string, path_to_ast_output: string, commit_selection_mode: string | undefined | null, project_url: string | undefined | null, git_tag_start_offset: number, project_name: string | undefined | null, project_version: any, preserve_ast_output: boolean, detectorOptions: any) {
    this.path_to_project = path_to_project;
    this.path_to_ast_generator_folder = path_to_ast_generator_folder;
    this.path_to_output_with_variables = path_to_output_with_variables;
    this.path_to_source = path_to_source;
    this.source_type = source_type;
    this.path_to_ast_output = path_to_ast_output;
    this.commit_selection_mode = commit_selection_mode;
    this.git_tag_start_offset = git_tag_start_offset;
    this.passed_project_name = project_name;
    this.project_version = project_version;
    this.preserve_ast_output = preserve_ast_output;
    this.detectorOptions = Detector.getDefaultOptions(detectorOptions || {});

    this.projectInfo = { project_url: project_url || null, project_name: 'unknown_project_name', timer: new Timer() };
    this.astTimer = new Timer();
    this.detectTimer = new Timer();
    this.gitTimer = new Timer();
  }

  public async getCommitSelectionModeCurrent() {
    let commits_to_analyse: {
      commit: string;
      tag: string | undefined | null;
    }[] = [];
    let commit = await GitHelper.getProjectCommit(this.path_to_project);
    if (!commit) {
      commit = 'current';
    }
    let possibleTag = await GitHelper.getTagFromCommitHash(this.path_to_project, commit);
    commits_to_analyse.push({
      commit: commit,
      tag: possibleTag,
    });
    return commits_to_analyse;
  }

  async getAllGitCommits() {
    //console.log("Perform a full check of the whole project");
    const allCommits = await GitHelper.getAllCommitsFromGitProject(this.path_to_project);
    let missing_commit_results: {
      commit: string;
      tag: string | undefined | null;
    }[] = [];

    if (!!allCommits) {
      //console.log("amount commits: "+allCommits.length)

      for (const commit of allCommits) {
        let possibleTag = await GitHelper.getTagFromCommitHash(this.path_to_project, commit);
        missing_commit_results.push({
          commit: commit,
          tag: possibleTag,
        });
      }
    } else {
      console.log('No commits found');
    }
    return missing_commit_results;
  }

  async getGitTagCommitsHashes() {
    //console.log("Perform a full check of the whole project");
    const allTags = await GitHelper.getAllTagsFromGitProject(this.path_to_project);

    let dublicateCommits: Record<string, string[]> = {};
    let commit_results: {
      commit: string;
      tag: string | undefined | null;
    }[] = [];

    if (!!allTags) {
      //console.log("amount tag commits: "+allTags.length)

      for (const tag of allTags) {
        //console.log("check tag: " + tag);
        let commit_hash = await GitHelper.getCommitHashForTag(this.path_to_project, tag);
        //console.log("commit_hash: "+commit_hash);
        let type = await GitHelper.getGitObjectType(this.path_to_project, commit_hash);
        //console.log("type: "+type);

        if (!commit_hash) {
          console.log('No commit hash found for tag: ' + tag);
          continue;
        }
        commit_results.push({
          commit: commit_hash,
          tag: tag,
        });

        if (dublicateCommits[commit_hash]) {
          dublicateCommits[commit_hash].push(tag);
        } else {
          dublicateCommits[commit_hash] = [tag];
        }
      }
    } else {
      //console.log("No tag commits found");
    }

    // print dublicate commits
    let commit_hashes = Object.keys(dublicateCommits);
    for (const commit_hash of commit_hashes) {
      let tags = dublicateCommits[commit_hash];
      if (tags.length > 1) {
        console.log('Dublicate commit: ' + commit_hash + ' with tags: ' + tags.join(', '));
      }
    }

    return commit_results;
  }

  public async configureCommitSelectionMode(): Promise<{ git_checkout_needed: boolean; commits_to_analyse: { commit: string; tag: string | undefined | null }[] }> {
    let git_checkout_needed = true;
    let commits_to_analyse: {
      commit: string;
      tag: string | undefined | null;
    }[] = [];
    if (this.commit_selection_mode === 'current' || !this.commit_selection_mode) {
      commits_to_analyse = await this.getCommitSelectionModeCurrent();
      git_checkout_needed = false;
    } else if (this.commit_selection_mode === 'full') {
      commits_to_analyse = await this.getAllGitCommits();
    } else if (this.commit_selection_mode === 'tags') {
      commits_to_analyse = await this.getGitTagCommitsHashes();
    } else {
      let string_commits_to_analyse = this.commit_selection_mode;
      let commits_hashes_to_analyse = string_commits_to_analyse.split(',');
      for (let commit_hash of commits_hashes_to_analyse) {
        let possibleTag = await GitHelper.getTagFromCommitHash(this.path_to_project, commit_hash);
        let hashType = await GitHelper.getGitObjectType(this.path_to_project, commit_hash);
        console.log('hashType: ' + hashType);
        commits_to_analyse.push({
          commit: commit_hash,
          tag: possibleTag,
        });
      }
    }
    return {
      git_checkout_needed: git_checkout_needed,
      commits_to_analyse: commits_to_analyse,
    };
  }

  async loadProjectName(path_to_folder: string): Promise<string> {
    if (!!this.passed_project_name) {
      // if project name was passed as parameter
      return this.passed_project_name; // use passed project name
    }

    let project_name = await GitHelper.getProjectName(path_to_folder);
    if (!project_name) {
      // if no project name could be found in the git repository
      // use the folder name as project name
      try {
        let folder_name = path.basename(path_to_folder);
        project_name = DetectorUtils.sanitizeProjectName(folder_name);
      } catch (error) {
        console.log(error);
      }
    }
    if (!project_name) {
      project_name = this.projectInfo.project_name; // use default project name
    }
    return project_name;
  }

  async start() {
    this.projectInfo.timer.start();

    console.log('Start: ' + this.path_to_project);
    this.projectInfo.project_name = await this.loadProjectName(this.path_to_project);
    console.log('Project Name: ' + this.projectInfo.project_name);
    let { git_checkout_needed, commits_to_analyse } = await this.configureCommitSelectionMode();

    if (git_checkout_needed) {
      let i = 0;
      let amount_skipped = 0;
      let amount_commits = commits_to_analyse.length;
      //console.log("Analysing amount commits: "+amount_commits);
      let existingCommitsInFolder: Record<string, boolean> = {};
      let pathToOutPutWithoutCommit = Analyzer.replaceOutputVariables(this.path_to_output_with_variables, this.projectInfo.project_name, 'REPLACE_COMMIT');
      pathToOutPutWithoutCommit = path.dirname(pathToOutPutWithoutCommit);
      if (fs.existsSync(pathToOutPutWithoutCommit)) {
        let filesInFolder = fs.readdirSync(pathToOutPutWithoutCommit);
        for (const file of filesInFolder) {
          if (file.endsWith('.json')) {
            let commit = file.substring(0, file.length - '.json'.length);
            if (!!commit) {
              //console.log("commit: "+commit);
              existingCommitsInFolder[commit] = false;
            }
          }
        }
      }

      for (const commit_to_analyse_obj of commits_to_analyse) {
        let elapsed_time = this.projectInfo.timer.getCurrentElapsedTime();
        let elapsed_time_formatted = this.projectInfo.timer.formatTimeToString(elapsed_time);
        let suffix = 'Commit [' + (i + 1) + '/' + amount_commits + '] - project: ' + this.projectInfo.project_name + ' - commit: ' + commit_to_analyse_obj.commit;
        this.projectInfo.timer.printEstimatedTimeRemaining({
          progress: i - amount_skipped,
          total: amount_commits - amount_skipped,
          prefix: '',
          suffix: suffix,
        });

        let output_exists = await this.doesAnalysisExist(commit_to_analyse_obj.commit);
        if (output_exists) {
          existingCommitsInFolder[commit_to_analyse_obj.commit] = true;
        }

        let amount_skipped_smaller_than_git_tag_start_offset = amount_skipped < this.git_tag_start_offset;
        let skip_commit = amount_skipped_smaller_than_git_tag_start_offset || output_exists;

        if (skip_commit) {
          //console.log("Skip "+commit_to_analyse_obj.commit);
          if (output_exists) {
            console.log('Skip, since output already exists: ' + commit_to_analyse_obj.commit);
          } else if (amount_skipped_smaller_than_git_tag_start_offset) {
            console.log('Skip since smaller than git_tag_start_offset: ' + this.git_tag_start_offset);
          }
          amount_skipped++;
        } else {
          let checkoutWorked = true;
          if (!!commit_to_analyse_obj.commit) {
            this.gitTimer.start();
            try {
              await GitHelper.checkoutGitCommit(this.path_to_project, commit_to_analyse_obj.commit);
            } catch (error) {
              checkoutWorked = false;
            }
            this.gitTimer.stop();
          }
          if (checkoutWorked) {
            // Do analysis for each missing commit and proceed to the next
            try {
              await this.analyse(commit_to_analyse_obj);
            } catch (error: any) {
              console.error('Error during analysis: ' + error);
            }
            //console.log("Proceed to next");
          } else {
            console.log('Skip since checkout did not worked');
          }
        }
        i++;
      }

      // print commits which are in the folder but not in the git repository
      let commits_in_folder = Object.keys(existingCommitsInFolder);
      let commits_in_folder_not_in_git: string[] = [];
      for (const commit of commits_in_folder) {
        if (!existingCommitsInFolder[commit]) {
          commits_in_folder_not_in_git.push(commit);
          console.log('Commit in folder but not in git: ' + commit);
        }
      }
    } else {
      try {
        await this.analyse(commits_to_analyse[0]);
      } catch (error: any) {
        console.error('Error during analysis: ' + error);
      }
    }

    this.projectInfo.timer.stop();
    this.projectInfo.timer.printTotalElapsedTime('Total time');
    this.astTimer.printTotalElapsedTime('Total Ast generation time');
    this.detectTimer.printTotalElapsedTime('Total Analysis time');

    for (let commit of this.couldNotGenerateAstForCommits) {
      console.log('Could not generate AST for commit: ' + commit);
    }
  }

  static replaceOutputVariables(path_to_output_with_variables, project_name = 'project_name', project_commit = 'project_commit') {
    let copy = path_to_output_with_variables + '';
    copy = copy.replace(Analyzer.project_name_variable_placeholder, project_name);
    copy = copy.replace(Analyzer.project_commit_variable_placeholder, project_commit);
    return copy;
  }

  async doesAnalysisExist(commit: string) {
    let path_to_result = Analyzer.replaceOutputVariables(this.path_to_output_with_variables, this.projectInfo.project_name, commit);
    if (fs.existsSync(path_to_result)) {
      return true;
    }

    // check if compressed result exists
    let path_to_result_compressed = path_to_result + '.zip';
    if (fs.existsSync(path_to_result_compressed)) {
      console.log('Found compressed result: ' + path_to_result_compressed);
      return true;
    }

    return false;
  }

  async analyse(commit_to_analyse_obj: { commit: string; tag: string | undefined | null }) {
    const commit = commit_to_analyse_obj.commit;
    console.log('Analyse commit: ' + commit);

    let project_version = this.project_version || commit_to_analyse_obj.commit || commit_to_analyse_obj.tag || 'unknown_project_version';

    if (!fs.existsSync(this.path_to_source)) {
      console.log(`The path to source files ${this.path_to_source} does not exist.`);
      return;
    } else {
      let commit_date = await GitHelper.getCommitDateUnixTimestamp(this.path_to_project, commit_to_analyse_obj.commit);
      let commit_tag = commit_to_analyse_obj.tag;
      let git_project_url = await GitHelper.getRemoteUrl(this.path_to_project);
      this.projectInfo.project_url = this.projectInfo.project_url || git_project_url || 'unknown_project_url';

      //console.log("commit_tag: "+commit_tag);
      //console.log("commit_date: "+commit_date);

      this.path_to_ast_output = Analyzer.replaceOutputVariables(this.path_to_ast_output, this.projectInfo.project_name, commit_to_analyse_obj.commit);
      await ParserHelper.removeGeneratedAst(this.path_to_ast_output, 'before analysis');
      try {
        fs.mkdirSync(this.path_to_ast_output, { recursive: true });
      } catch (e: any) {
        console.error('Error creating directory: ' + this.path_to_ast_output);
        console.error(e);
      }
      // check if folder to ast output exists
      if (!fs.existsSync(this.path_to_ast_output)) {
        console.error(`The folder to ast output ${this.path_to_ast_output} does not exist. Therefore, we cannot generate the AST.`);
        return;
      }

      let target_language: string | undefined = undefined;

      if (this.source_type === 'ast') {
        // skip ast generation since ast is already provided
      } else {
        let parser: ParserInterface | null = null;

        if (this.source_type === 'java') {
          target_language = 'java';
          parser = new ParserHelperJavaSourceCode(this.path_to_ast_generator_folder);
        } else if (this.source_type === 'uml') {
          target_language = 'xml';
          parser = new ParserHelperXmlVisualParadigm();
        } else if (this.source_type === 'digitalTwinsDefinitionLanguage') {
          target_language = 'Digital Twin Definition Language';
          parser = new ParserHelperDigitalTwinsDefinitionLanguage();
        } else if (this.source_type === 'typescript') {
          target_language = 'typescript';
          parser = new ParserHelperTypeScript();
        } else if (this.source_type === 'ngsi-ld') {
          target_language = 'NGSI-LD';
          parser = new ParserHelperDigitalTwinsNGSI_LD();
        }

        if (!parser) {
          console.error('Parser not found for source type: ' + this.source_type);
          return;
        }

        this.astTimer.start();
        console.log('Parsing source to AST to output path: ' + this.path_to_ast_output);
        await parser.parseSourceToAst(this.path_to_source, this.path_to_ast_output);
        this.astTimer.stop();
        this.astTimer.printElapsedTime('Ast generation time for commit: ' + commit);
      }

      if (!fs.existsSync(this.path_to_ast_output)) {
        console.error(`The path to ast output ${this.path_to_ast_output} does not exist. Therefore, no AST will be found.`);
        this.couldNotGenerateAstForCommits.push(commit);
        return;
      }

      let softwareProjectDicts: SoftwareProjectDicts = await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(this.path_to_ast_output, this.detectorOptions);

      let path_to_result = Analyzer.replaceOutputVariables(this.path_to_output_with_variables, this.projectInfo.project_name, commit);
      let progressCallback = null;

      this.detectTimer.start();
      let dataClumpsContext = await Analyzer.analyseSoftwareProjectDicts(softwareProjectDicts, this.projectInfo.project_url, this.projectInfo.project_name, project_version, commit, commit_tag, commit_date, path_to_result, progressCallback, this.detectorOptions, null, target_language);
      this.detectTimer.stop();
      this.detectTimer.printElapsedTime('Detect time for commit: ' + commit);

      console.log('Project Name: ' + this.projectInfo.project_name);
      console.log(JSON.stringify(dataClumpsContext.project_info, null, 2));
      console.log(JSON.stringify(dataClumpsContext.report_summary, null, 2));

      let timerInformation = {
        ast_generation_time_ms: this.astTimer.getLatestElapsedTime(),
        detection_time_ms: this.detectTimer.getLatestElapsedTime(),
        machine_information: {
          os: os.type(),
          os_release: os.release(),
          os_platform: os.platform(),
          os_arch: os.arch(),
          os_uptime: os.uptime(),
          os_memory_free: os.freemem(),
          os_memory_total: os.totalmem(),
          os_cpu_cores: os.cpus().length,
          os_cpu_model: os.cpus()[0].model,
          os_cpu_speed: os.cpus()[0].speed,
        },
      };
      dataClumpsContext.report_summary.additional.timer_information = timerInformation;

      console.log('Ast generation time: ' + timerInformation.ast_generation_time_ms + ' ms');
      console.log('Detection time: ' + timerInformation.detection_time_ms + ' ms');
      console.log('----------------------');

      // delete file if exists
      if (fs.existsSync(path_to_result)) {
        fs.unlinkSync(path_to_result);
      }

      await AnalyseHelper.saveReportFileJson(dataClumpsContext, path_to_result);

      if (!this.preserve_ast_output) {
        await ParserHelper.removeGeneratedAst(this.path_to_ast_output, 'after analysis');
      } else {
        console.log('Preserving generated AST Output');
      }
    }
  }

  static async analyseSoftwareProjectDicts(softwareProjectDicts, project_url, project_name, project_version, commit, commit_tag, commit_date, path_to_result, progressCallback, detectorOptions, additional, target_language) {
    let detector = new Detector(softwareProjectDicts, detectorOptions, progressCallback, project_url, project_name, project_version, commit, commit_tag, commit_date, additional, target_language);

    let dataClumpsContext = await detector.detect();

    return dataClumpsContext;
  }
}
