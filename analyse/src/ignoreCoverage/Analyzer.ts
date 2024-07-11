import {GitHelper} from "./GitHelper";
import fs from "fs";
import {SoftwareProjectDicts} from "./SoftwareProject";
import {Detector} from "./detector/Detector";
import {ParserHelperJavaSourceCode} from "./ParserHelperJavaSourceCode";
import {Timer} from "./Timer";
import path from "path";
import {ParserHelper} from "./ParserHelper";
import {ParserHelperXmlVisualParadigm} from "./ParserHelperXmlVisualParadigm";

export class Analyzer {

    public static project_name_variable_placeholder ="{project_name}";
    public static project_commit_variable_placeholder ="{project_commit}";


    public project_url: string | undefined | null;
    public path_to_project: string;
    public path_to_ast_generator_folder: string;
    public path_to_output_with_variables: string;
    public path_to_source: string;
    public source_type: string;
    public path_to_ast_output: string;
    public commit_selection_mode: string | undefined | null;
    public project_name: string = "unknown_project_name";
    public detectorOptions: any;
    public project_version: any;
    public preserve_ast_output: boolean;

    public passed_project_name: string | undefined | null;


    public timer: Timer;

    constructor(
        path_to_project: string,
        path_to_ast_generator_folder: string,
        path_to_output_with_variables: string,
        path_to_source: string,
        source_type: string,
        path_to_ast_output: string,
        commit_selection_mode: string | undefined | null,
        project_url: string | undefined | null,
        project_name: string | undefined | null,
        project_version: any,
        preserve_ast_output: boolean,
        detectorOptions: any
    ) {
        this.path_to_project = path_to_project;
        this.path_to_ast_generator_folder = path_to_ast_generator_folder;
        this.path_to_output_with_variables = path_to_output_with_variables
        this.path_to_source = path_to_source;
        this.source_type = source_type;
        this.path_to_ast_output = path_to_ast_output;
        this.commit_selection_mode = commit_selection_mode;
        this.project_url = project_url;
        this.passed_project_name = project_name;
        this.project_version = project_version;
        this.preserve_ast_output = preserve_ast_output
        this.detectorOptions = detectorOptions;

        this.timer = new Timer();
    }

    public async getCommitSelectionModeCurrent(){
        let commits_to_analyse: any[] = [];
        let commit = await GitHelper.getProjectCommit(this.path_to_project);
        if(!commit){
            commit = null;
        }
        commits_to_analyse.push(commit);
        return commits_to_analyse;
    }

    async getAllGitCommits(){
        //console.log("Perform a full check of the whole project");
        const allCommits = await GitHelper.getAllCommitsFromGitProject(this.path_to_project);
        let missing_commit_results: string[] = [];

        if(!!allCommits){
            //console.log("amount commits: "+allCommits.length)

            for (const commit of allCommits) {
                missing_commit_results.push(commit);
            }
        } else {
            console.log("No commits found");
        }
        return missing_commit_results;
    }

    async getGitTagCommitsHashes(){
        //console.log("Perform a full check of the whole project");
        const allTags = await GitHelper.getAllTagsFromGitProject(this.path_to_project);
        let missing_commit_results: string[] = [];

        if(!!allTags){
            //console.log("amount tag commits: "+allTags.length)

            for (const tag of allTags) {
                //console.log("check tag: " + tag);
                let commit_hash = await GitHelper.getCommitHashForTag(this.path_to_project, tag);
                if(!commit_hash){
                    //console.log("No commit hash found for tag: "+tag);
                    continue;
                }
                missing_commit_results.push(commit_hash);
            }
        } else {
            //console.log("No tag commits found");
        }
        return missing_commit_results;
    }

    public async configureCommitSelectionMode(): Promise<{ git_checkout_needed: boolean; commits_to_analyse: any[] }> {
        let git_checkout_needed = true;
        let commits_to_analyse: any[] = [];
        if(this.commit_selection_mode==="current" || !this.commit_selection_mode){
            commits_to_analyse = await this.getCommitSelectionModeCurrent();
            git_checkout_needed = false;
        } else if(this.commit_selection_mode==="full"){
            commits_to_analyse = await this.getAllGitCommits();
        } else if(this.commit_selection_mode==="tags"){
            commits_to_analyse = await this.getGitTagCommitsHashes();
        } else {
            let string_commits_to_analyse = this.commit_selection_mode;
            commits_to_analyse = string_commits_to_analyse.split(",");
        }
        return {
            git_checkout_needed: git_checkout_needed,
            commits_to_analyse: commits_to_analyse
        }
    }

    async loadProjectName(path_to_folder: string): Promise<string> {
        if(!!this.passed_project_name){ // if project name was passed as parameter
            return this.passed_project_name; // use passed project name
        }

        let project_name = await GitHelper.getProjectName(path_to_folder);
        if(!project_name){ // if no project name could be found in the git repository
            project_name = this.project_name // use default project name
        }
        return project_name;
    }

    async start(){
        this.timer.start();

        this.project_name = await this.loadProjectName(this.path_to_project);
        let {
            git_checkout_needed,
            commits_to_analyse
        } = await this.configureCommitSelectionMode();

        if(git_checkout_needed){
            let i=1;
            let amount_skipped = 0;
            let amount_commits = commits_to_analyse.length;
            //console.log("Analysing amount commits: "+amount_commits);
            for (const commit of commits_to_analyse) {
                console.log("Check "+"Commit ["+i+"/"+amount_commits+"]");

                let output_exists = await this.doesAnalysisExist(commit);
                if(output_exists){
                    console.log("Result already exists for "+commit);
                    amount_skipped++;
                } else {
                    console.log("Analyse "+commit);

                    let progress_excludes_skipped = i-amount_skipped;
                    let total_excludes_skipped = amount_commits-amount_skipped;
                    this.timer.printElapsedTime("", " - "+progress_excludes_skipped+"/"+total_excludes_skipped);
                    this.timer.printEstimatedTimeRemaining(progress_excludes_skipped, total_excludes_skipped, "", "");

                    let checkoutWorked = true;
                    if(!!commit){
                        try{
                            await GitHelper.checkoutGitCommit(this.path_to_project, commit);
                        } catch(error){
                            checkoutWorked = false;
                        }
                    }
                    if(checkoutWorked){
                        // Do analysis for each missing commit and proceed to the next
                        await this.analyse(commit);
                        //console.log("Proceed to next");
                    } else {
                        console.log("Skip since checkout did not worked");
                    }
                }
                i++;
            }
        } else {
            let commit = (commits_to_analyse && commits_to_analyse.length === 1) ? commits_to_analyse[0] : undefined;
            await this.analyse(commit);
        }

        this.timer.stop();
        this.timer.printElapsedTime("Detection time");
    }

    static replaceOutputVariables(path_to_output_with_variables, project_name="project_name", project_commit="project_commit"){
        let copy = path_to_output_with_variables+"";
        copy = copy.replace(Analyzer.project_name_variable_placeholder, project_name);
        copy = copy.replace(Analyzer.project_commit_variable_placeholder, project_commit);
        return copy;
    }

    async doesAnalysisExist(commit){
        let path_to_result = Analyzer.replaceOutputVariables(this.path_to_output_with_variables, this.project_name, commit);
        if (fs.existsSync(path_to_result)) {
            return true;
        }
        return false;
    }

    async analyse(commit){
        console.log("Analyse commit: "+commit);

        let project_version = this.project_version || commit || "unknown_project_version";

        if (!fs.existsSync(this.path_to_source)) {
            //console.log(`The path to source files ${this.path_to_source_folder} does not exist.`);
            return;
        } else {
            let commit_date = await GitHelper.getCommitDateUnixTimestamp(this.path_to_project, commit);
            let commit_tag = await GitHelper.getTagFromCommitHash(this.path_to_project, commit);
            let git_project_url = await GitHelper.getRemoteUrl(this.path_to_project);
            this.project_url = this.project_url || git_project_url || "unknown_project_url";

            //console.log("commit_tag: "+commit_tag);
            //console.log("commit_date: "+commit_date);

            this.path_to_ast_output = Analyzer.replaceOutputVariables(this.path_to_ast_output, this.project_name, commit);
            await ParserHelper.removeGeneratedAst(this.path_to_ast_output);
            fs.mkdirSync(this.path_to_ast_output, { recursive: true });

            console.log("Generate AST");

            if(this.source_type === "java"){
                await ParserHelperJavaSourceCode.parseSourceCodeToAst(this.path_to_source, this.path_to_ast_output, this.path_to_ast_generator_folder);
            } else if(this.source_type === "uml"){
                await ParserHelperXmlVisualParadigm.parseXmlToAst(this.path_to_source, this.path_to_ast_output);
            } else if(this.source_type === "ast"){
                console.log("Skip ast generation since ast is already provided")
                this.path_to_ast_output = this.path_to_source;
                this.preserve_ast_output = true; // since the ast is our input, we do not want to delete it
                console.log("path_to_ast_output: "+this.path_to_ast_output)
                console.log("path_to_source: "+this.path_to_source)
                console.log("path_to_project: "+this.path_to_project)
            } else {
                throw new Error("Source type "+this.source_type+" not supported");
            }


            if (!fs.existsSync(this.path_to_ast_output)) {
                console.log(`The path to ast output ${this.path_to_ast_output} does not exist. Creating it.`)
                // in order when the ast generator does not find any files, it does not create the folder
                fs.mkdirSync(this.path_to_ast_output, { recursive: true });
            }

            let softwareProjectDicts: SoftwareProjectDicts = await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(this.path_to_ast_output);
            console.log("softwareProjectDicts: ")
            softwareProjectDicts.printInfo();


            let path_to_result = Analyzer.replaceOutputVariables(this.path_to_output_with_variables, this.project_name, commit);
            let progressCallback = null
            //let progressCallback = this.generateAstCallback.bind(this);
            await Analyzer.analyseSoftwareProjectDicts(softwareProjectDicts, this.project_url, this.project_name, project_version, commit, commit_tag, commit_date, path_to_result, progressCallback, this.detectorOptions);

            if(!this.preserve_ast_output){
                await ParserHelper.removeGeneratedAst(this.path_to_ast_output);
            } else {
                console.log("Preserving generated AST Output");
            }

        }
    }

    static async analyseSoftwareProjectDicts(softwareProjectDicts, project_url, project_name, project_version, commit, commit_tag, commit_date, path_to_result, progressCallback, detectorOptions){
        let detector = new Detector(softwareProjectDicts, detectorOptions, progressCallback, project_url, project_name, project_version, commit, commit_tag, commit_date);

        let dataClumpsContext = await detector.detect();

        // delete file if exists
        if(fs.existsSync(path_to_result)){
            fs.unlinkSync(path_to_result);
        }

        const dir = path.dirname(path_to_result);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // save to file
        try {
            fs.writeFileSync(path_to_result, JSON.stringify(dataClumpsContext, null, 2), 'utf8');
            console.log('Results saved to '+path_to_result);
        } catch (err) {
            console.error('An error occurred while writing to file:', err);
        }

        return dataClumpsContext;

    }

}
