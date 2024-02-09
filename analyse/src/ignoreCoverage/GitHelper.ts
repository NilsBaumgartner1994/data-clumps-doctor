import simpleGit, {DefaultLogFields, LogResult, SimpleGit, TagResult} from "simple-git";

export class GitHelper {

    /**
     * Checkout a specific Git commit in the given project path.
     * @param path_to_project - The path to the project where the commit needs to be checked out.
     * @param commit - The commit hash or reference to be checked out.
     * @throws Error - If there is an error checking out the commit.
     */
    static async checkoutGitCommit(path_to_project, commit){
        //console.log("Start checkoutGitCommit "+commit);
        const git: SimpleGit = simpleGit(path_to_project);
        try {
            await git.checkout(commit);
        } catch (error) {
            console.error(`Error checking out commit ${commit}:`, error);
            throw new Error(`Failed to checkout commit ${commit}`);
        }
    }

    /**
     * Asynchronously clones a Git project from the specified URL to the specified path.
     * 
     * @param git_project_url The URL of the Git project to clone.
     * @param path_to_project The path where the Git project will be cloned.
     * @throws Error If there is an error during the cloning process.
     */
    static async cloneGitProject(git_project_url, path_to_project){
        console.log("Start cloneGitProject " + git_project_url);
        const git: SimpleGit = simpleGit({
            progress({ method, stage, progress }) {
                console.log(`git.${method} ${stage} stage ${progress}% complete`);
            },
        });

        try {
            // Clone the repository with the --no-checkout option
            await git.clone(git_project_url, path_to_project, ['--no-checkout']);
            // Change the working directory to the specified directory
            git.cwd(path_to_project);
            // Checkout the files into the specified directory
            await git.reset(['--hard']);
        } catch (error) {
            console.error(`Error cloning git project ${git_project_url}:`, error);
            throw new Error(`Failed to clone git project ${git_project_url}`);
        }
    }

    /**
     * Asynchronously retrieves the remote URL of a given project.
     * @param path_to_project The path to the project.
     * @returns A Promise that resolves to a string representing the remote URL, or null if an error occurs.
     * @throws Error if no remote URL is found.
     */
    static async getRemoteUrl(path_to_project): Promise<string | null> {
        //console.log("Start getRemoteUrl");
        //console.log("path_to_project: "+path_to_project)
        const git: SimpleGit = simpleGit(path_to_project);
        try {
            const remotes = await git.listRemote(['--get-url']);
            if (remotes) {
                let remoteUrl = remotes.split('\n')[0];  // Assuming the first line contains the URL
                let gitEnding = ".git";
                if(remoteUrl.endsWith(gitEnding)){
                    remoteUrl = remoteUrl.substring(0, remoteUrl.length - gitEnding.length);
                }
                return remoteUrl;
            } else {
                throw new Error('No remote URL found');
            }
        } catch (error) {
            console.error('Error getting remote URL:', error);
            return null;
        }
    }

    /**
     * Asynchronously retrieves the commit hash for a given tag from a specified folder.
     * @param path_to_folder The path to the folder containing the git repository.
     * @param tagName The name of the tag for which to retrieve the commit hash.
     * @returns A Promise that resolves with the commit hash string if found, or null if not found.
     * @throws Error if there is an error fetching the commit hash for the specified tag.
     */
    static async getCommitHashForTag(path_to_folder: string, tagName: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const git: SimpleGit = simpleGit(path_to_folder);
            git.raw(['show-ref', '--tags', tagName], (err: Error | null, data: string) => {
                if (err) {
                    console.error(`Error fetching commit hash for tag ${tagName}:`, err);
                    resolve(null);
                } else {
                    const lines = data.trim().split('\n');
                    for (const line of lines) {
                        const parts = line.split(' ');
                        if (parts.length > 1 && parts[1] === `refs/tags/${tagName}`) {
                            resolve(parts[0]);
                            return;
                        }
                    }
                    console.warn(`No commit hash found for tag ${tagName}`);
                    resolve(null);
                }
            });
        });
    }

    /**
     * Retrieves the tag associated with a specific commit hash from a Git project.
     * @param path_to_folder The path to the Git project folder.
     * @param commitHash The commit hash for which to retrieve the associated tag.
     * @returns A Promise that resolves to the tag associated with the specified commit hash, or null if no tag is found.
     * @throws Error if there is an issue with retrieving tags or commit hashes from the Git project.
     */
    static async getTagFromCommitHash(path_to_folder: string, commitHash: string): Promise<string | null> {
        // 1. get all Tags: GitHelper.getAllTagsFromGitProject(path_to_folder)
        let tags = await GitHelper.getAllTagsFromGitProject(path_to_folder);

        // 2. get all commits for each tag: GitHelper.getCommitsForTag(path_to_folder, tag)
        if(!!tags){
            for (let tag of tags){
                let commit = await GitHelper.getCommitHashForTag(path_to_folder, tag);
                if(commit === commitHash){             // 3. check if commitHash is in commits for tag
                    return tag;
                }
            }
        }
        return null;

    }

    /**
     * Retrieves the Unix timestamp of the commit identified by the given identifier in the specified folder path.
     * @param path_to_folder The path to the folder containing the git repository.
     * @param identifier The identifier of the commit for which the Unix timestamp is to be retrieved.
     * @returns A Promise that resolves to a string representing the Unix timestamp of the commit, or null if the timestamp cannot be determined.
     * @throws {Error} If an error occurs during the process.
     */
    static async getCommitDateUnixTimestamp(path_to_folder: string, identifier: string): Promise<string | null> {
        try {
            const git: SimpleGit = simpleGit(path_to_folder);
            const options = ['-s', '--format=%ct', identifier];
            const result = await git.show(options);
            const lines = result.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const timestamp = parseInt(lastLine, 10);
            return isNaN(timestamp) ? null : ""+timestamp;
        } catch (error) {
            console.error('An error occurred:', error);
            return null;
        }
    }


    /**
     * Asynchronously retrieves the project name from the provided folder path.
     * @param path_to_folder The path to the folder containing the project.
     * @returns A Promise that resolves to the project name, or null if an error occurs.
     */
    static async getProjectName(path_to_folder: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const git: SimpleGit = simpleGit(path_to_folder);
            git.listRemote(['--get-url'], (err: Error | null, data?: string) => {
                if (err) {
                    //reject(err);
                    resolve(null);
                } else {
                    let url = data?.trim();
                    let splitData = url?.split('/');
                    let projectName = splitData?.[splitData.length - 1]?.replace('.git', '') || '';
                    resolve(projectName);
                }
            });
        });
    }

    /**
     * Retrieves the latest commit of a project from the specified folder path.
     * @param path_to_folder The path to the folder containing the project.
     * @returns A Promise that resolves to a string representing the latest commit, or null if an error occurs.
     * @throws Error if an error occurs during the retrieval process.
     */
    static async getProjectCommit(path_to_folder: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const git: SimpleGit = simpleGit(path_to_folder);
            git.revparse(['HEAD'], (err: Error | null, data?: string) => {
                if (err) {
                    //reject(err);
                    resolve(null);
                } else {
                    let commit = data?.trim();
                    if(!!commit){
                        resolve(commit);
                    } else {
                        resolve(null);
                    }

                }
            });
        });
    }

    /**
     * New function to get all commits from a git project.
     * @param path_to_folder The path to the folder containing the git project.
     * @returns A promise that resolves to an array of strings representing the commit hashes, or null if there was an error.
     * @throws Error if there is an issue with retrieving the commits from the git project.
     */
    // New function to get all commits
    static async getAllCommitsFromGitProject(path_to_folder: string): Promise<string[] | null> {
        return new Promise((resolve, reject) => {
            const git: SimpleGit = simpleGit(path_to_folder);
            git.log(undefined, (err: Error | null, log: LogResult<string>) => {
                if (err) {
                    resolve(null);
                } else {

                    git.log(undefined, (err: Error | null, log: LogResult<DefaultLogFields>) => {
                        if (err) {
                            resolve(null);
                        } else {
                            const commits: string[] = [];
                            log.all.forEach(entry => {
                                if(entry.hash) {
                                    commits.push(entry.hash);
                                }
                            });
                            resolve(commits);
                        }
                    });
                }
            });
        });
    }

    /**
     * Retrieves all tags from a Git project located at the specified folder path.
     * @param path_to_folder The path to the folder containing the Git project.
     * @returns A Promise that resolves to an array of strings representing the tags, or null if an error occurs.
     * @throws Error if an error occurs during the retrieval process.
     */
    static async getAllTagsFromGitProject(path_to_folder: string): Promise<string[] | null> {
        //console.log("getAllTagsFromGitProject");
        return new Promise((resolve, reject) => {
            const git: SimpleGit = simpleGit(path_to_folder);
            git.tags(async (err: Error | null, tags: TagResult) => {
                if (err) {
                    resolve(null);
                } else {
                    const commitTags: string[] = [];
                    for (const tag of tags.all) {
                        //console.log("tag")
                        //console.log(tag)
                        commitTags.push(tag);
                    }
                    //console.log("commitHashes")
                    //console.log(commitTags);
                    resolve(commitTags);
                }
            });
        });
    }

}
