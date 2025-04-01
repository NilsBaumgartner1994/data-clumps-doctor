import simpleGit, {DefaultLogFields, LogResult, SimpleGit, TagResult} from "simple-git";

export class GitHelper {

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

    static async getGitObjectType(path_to_folder: string, hash: string): Promise<string | null> {
        try {
            const git: SimpleGit = simpleGit(path_to_folder);
            const type = await git.raw(['cat-file', '-t', hash]);
            return type.trim(); // e.g. 'commit', 'tag', etc.
        } catch (error) {
            console.error(`Error checking git object type for ${hash}:`, error);
            return null;
        }
    }

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

    static async getTagsPointingAtCommit(path_to_folder: string, commitHash: string): Promise<string[]> {
        try {
            const git: SimpleGit = simpleGit(path_to_folder);
            const tags = await git.raw(['tag', '--points-at', commitHash]);
            return tags.trim().split('\n').filter(t => t.length > 0);
        } catch (error) {
            console.error(`Error getting tags for commit ${commitHash}:`, error);
            return [];
        }
    }


    static async getTagFromCommitHash(path_to_folder: string, commitHash: string): Promise<string | null> {
        const tags = await GitHelper.getTagsPointingAtCommit(path_to_folder, commitHash);
        return tags.length > 0 ? tags[0] : null;
    }

    static async getCommitDateUnixTimestamp(path_to_folder: string, identifier: string | undefined | null): Promise<string | null> {
        if (!identifier) {
            console.error('No identifier provided');
            return null;
        }
        try {
            const git: SimpleGit = simpleGit(path_to_folder);
            const options = ['-s', '--format=%ct', `${identifier}^{}`];
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
