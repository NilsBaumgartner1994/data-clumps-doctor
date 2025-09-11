import simpleGit, { DefaultLogFields, LogResult, SimpleGit, TagResult } from 'simple-git';
import fs from 'fs';
import { ProgressObject, Timer } from './Timer';
import { exec } from 'child_process';

// Definieren des Typs für SZZ-Ergebnisse
export type SzzResult = {
  bugFixCommit: string;
  bugFixTimestamp: number;
  bugFixMessage: string;
  bugIntroducingCommit: string;
  bugIntroducingTimestamp: number;
  filePath: string; // Die Datei, in der der Bug gefunden/gefixt wurde
  blamedLine: string; // Die Zeile, die den Bug enthielt und zurückverfolgt wurde
};

export class GitHelper {
  static deleteGitFolder(path_to_project: string): void {
    //console.log("Start deleteGitFolder "+path_to_project);

    // Überprüfen, ob der Pfad existiert
    if (fs.existsSync(path_to_project)) {
      // Löschen des Ordners und aller Unterordner/Dateien
      fs.rmSync(path_to_project, { recursive: true, force: true });
      console.log(`Deleted git folder at ${path_to_project}`);
    } else {
      console.warn(`Git folder at ${path_to_project} does not exist.`);
    }
  }

  static async checkoutGitCommit(path_to_project: string, commit: string): Promise<void> {
    //console.log("Start checkoutGitCommit "+commit);
    const git: SimpleGit = GitHelper.getGitInstance(path_to_project);
    try {
      await git.checkout(commit);
    } catch (error) {
      console.error(`Error checking out commit ${commit}:`, error);
      throw new Error(`Failed to checkout commit ${commit}`);
    }
  }

  // Instanz von SimpleGit
  public static getGitInstance(repoPath: string): SimpleGit {
    return simpleGit(repoPath);
  }

  private static parseBlamePorcelain(blameOutput: string): Map<number, { commit: string; timestamp: number; line: string }> {
    const lines = blameOutput.split('\n');
    const blameMap = new Map<number, { commit: string; timestamp: number; line: string }>();

    let currentCommit = '';
    let currentTimestamp = 0;
    let currentLineNum = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^[0-9a-f]{40} /.test(line)) {
        currentCommit = line.split(' ')[0];
      } else if (line.startsWith('committer-time ')) {
        currentTimestamp = parseInt(line.split(' ')[1], 10);
      } else if (line.startsWith('\t')) {
        const content = line.substring(1);
        blameMap.set(currentLineNum, {
          commit: currentCommit,
          timestamp: currentTimestamp,
          line: content,
        });
        currentLineNum++;
      }
    }

    return blameMap;
  }

  /**
   * Führt eine vereinfachte SZZ-Analyse für ein Git-Repository durch.
   * Identifiziert Bug-Fix-Commits und versucht, den Bug-Introducing Commit (BIC) für jede gefixte Zeile zu finden.
   * @param repoPath Der Pfad zum geklonten Git-Repository.
   * @param bugFixKeywords Schlüsselwörter in Commit-Nachrichten, die auf einen Bug-Fix hinweisen.
   * @returns Eine Liste von SzzResult-Objekten.
   */
  static async runSZZ(repoPath: string, bugFixKeywordsParam?: string[], timerPassed?: Timer, partialTimerObject?: Partial<ProgressObject>): Promise<SzzResult[]> {
    console.log(`Starting SZZ analysis for ${repoPath}...`);
    const szzResults: SzzResult[] = [];
    const uniqueBICs = new Set<string>();

    let debugTimer = new Timer();
    debugTimer.logOutputDisabled = true;
    let timer = timerPassed || debugTimer;

    const git = GitHelper.getGitInstance(repoPath);
    const bugFixKeywords = bugFixKeywordsParam || GitHelper.getBugFixKeywords();

    let allCommitsRaw: string;
    try {
      allCommitsRaw = await git.raw(['log', '--all', '--pretty=format:%H%n%ct%n%s%n%P%x1f']);
    } catch (error) {
      console.warn(`Could not get all commits with parents for ${repoPath}: ${error}`);
      return [];
    }

    if (!allCommitsRaw.trim()) {
      console.log(`No commits found for ${repoPath}.`);
      return [];
    }

    const commitEntries = allCommitsRaw
      .trim()
      .split('\x1f')
      .filter(entry => entry.length > 0);

    const allCommitsInfo: { hash: string; timestamp: number; message: string; parents: string[] }[] = [];

    const commitEntriesCount = commitEntries.length;
    timer.start();
    for (let index = 0; index < commitEntriesCount; index++) {
      const entry = commitEntries[index];
      timer.printEstimatedTimeRemainingAfter1Second({
        progress: index + 1,
        total: commitEntriesCount,
        prefix: `Retrieving commits`,
        ...partialTimerObject,
      });

      const trimmedEntry = entry.trim();
      const parts = trimmedEntry.split('\n');

      if (parts.length >= 3) {
        const hash = parts[0];
        const timestamp = parseInt(parts[1], 10);
        const message = parts[2];
        const parents = parts.length > 3 && parts[3].trim() ? parts[3].split(' ').filter(p => p.length > 0) : [];

        if (hash.match(/^[0-9a-f]{40}$/i)) {
          allCommitsInfo.push({
            hash,
            timestamp,
            message,
            parents,
          });
        }
      }
    }

    const bugFixCommitsInfo = allCommitsInfo.filter(commit => GitHelper.isBugFixesInCommitMessage(commit.message, bugFixKeywords));

    console.log(`Identified ${bugFixCommitsInfo.length} potential bug fix commits.`);

    if (bugFixCommitsInfo.length === 0) {
      return [];
    }

    const countBugFixCommits = bugFixCommitsInfo.length;
    timer.start();
    for (let index = 0; index < countBugFixCommits; index++) {
      const bugFixCommit = bugFixCommitsInfo[index];

      timer.printEstimatedTimeRemainingAfter1Second({
        progress: index + 1,
        total: countBugFixCommits,
        prefix: `Processing bug fix commits`,
        ...partialTimerObject,
      });

      const parentCommitHash = bugFixCommit.parents[0];
      if (!parentCommitHash) continue;

      let diffOutput: string;
      try {
        diffOutput = await git.raw(['show', '--pretty=format:', bugFixCommit.hash]);
      } catch {
        continue;
      }

      const lines = diffOutput.split('\n');
      let currentFile = '';
      let currentLineNumInOldFile = 0;
      let blameMap: Map<number, { commit: string; timestamp: number; line: string }> = new Map();

      for (const line of lines) {
        const fileHeaderMatch = line.match(/^--- a\/(.*)|^--- b\/(.*)/);
        if (fileHeaderMatch) {
          currentFile = fileHeaderMatch[1] || fileHeaderMatch[2];
          currentLineNumInOldFile = 0;

          // Nur einmal Blame für die ganze Datei erzeugen
          blameMap = new Map();
          if (currentFile) {
            try {
              const blameOutput = await git.raw(['blame', '--porcelain', parentCommitHash, '--', currentFile]);
              blameMap = this.parseBlamePorcelain(blameOutput);
            } catch (blameErr: any) {
              console.warn(`Could not blame entire file ${currentFile}: ${blameErr.message}`);
            }
          }
          continue;
        }

        const hunkHeaderMatch = line.match(/^@@ -(\d+)(,\d+)? \+\d+(,\d+)? @@/);
        if (hunkHeaderMatch) {
          currentLineNumInOldFile = parseInt(hunkHeaderMatch[1], 10);
          if (currentLineNumInOldFile === 0) currentLineNumInOldFile = 1;
          continue;
        }

        if (line.startsWith('-') && line.length > 1 && currentLineNumInOldFile > 0) {
          const blamed = blameMap.get(currentLineNumInOldFile);
          const blamedLine = line.substring(1).trim();

          if (blamed && blamed.commit !== bugFixCommit.hash) {
            const uniqueKey = `${blamed.commit}-${currentFile}-${blamed.line}`;
            if (!uniqueBICs.has(uniqueKey)) {
              szzResults.push({
                bugFixCommit: bugFixCommit.hash,
                bugFixTimestamp: bugFixCommit.timestamp,
                bugFixMessage: bugFixCommit.message,
                bugIntroducingCommit: blamed.commit,
                bugIntroducingTimestamp: blamed.timestamp,
                filePath: currentFile,
                blamedLine: blamed.line,
              });
              uniqueBICs.add(uniqueKey);
            }
          }
          currentLineNumInOldFile++;
        } else if (line.startsWith(' ') || line.length === 0) {
          currentLineNumInOldFile++;
        }
      }
    }

    return szzResults;
  }

  static getBugFixKeywords(): string[] {
    const keywords = ['fix', 'fixed', 'fixes', 'bug', 'bugs', 'issue', 'issues', 'error', 'errors', 'defect', 'defects', 'mistake', 'mistakes', 'fault', 'faults', 'resolve', 'resolved', 'resolves', 'repair', 'repaired', 'patch', 'patched', 'correct', 'corrected', 'problem', 'problems', 'crash', 'fail', 'fails', 'failure', 'failing'];
    return keywords;
  }

  static isBugFixesInCommitMessage(message: string, keywordsPassed?: string[]): boolean {
    const keywords = keywordsPassed || GitHelper.getBugFixKeywords();
    const isBugFix = keywords.some(k => message.includes(k));
    const marker = isBugFix ? '✅ BUG-FIX' : '➖';

    return isBugFix;
  }

  static async getAncestorMapForCommits(path_to_project: string, projectName: string, commitHashes: string[]): Promise<Map<string, Set<string>>> {
    const ancestorMap: Map<string, Set<string>> = new Map(); // Faster lookup for ancestors, instead of checking ancestry for each commit
    let git = await GitHelper.getGitInstance(path_to_project);
    let timerForAncestorMapCreation = new Timer();
    timerForAncestorMapCreation.start();
    const totalCommits = commitHashes.length;
    for (let i = 0; i < totalCommits; i++) {
      const commitHash = commitHashes[i];
      timerForAncestorMapCreation.printEstimatedTimeRemainingAfter1Second({
        progress: i + 1,
        total: totalCommits,
        suffix: `Building ancestor map for: ${commitHash} - ${projectName}`,
      });

      try {
        const revListOutput = await git.raw(['rev-list', '--parents', commitHash]);
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
    return ancestorMap;
  }

  static async isCommitAncestorOfOtherCommit(path_to_project: string, commitA_Before: string, commitB_Later: string): Promise<boolean> {
    // simple-git wird hier nicht mehr für diesen Befehl verwendet, aber die Instanz
    // könnte für andere Git-Befehle in deiner Klasse noch nützlich sein.
    // const git: SimpleGit = GitHelper.getGitInstance(path_to_project); // Könnte entfernt werden, wenn nur diese Methode child_process nutzt.

    return new Promise(resolve => {
      const command = `git -C "${path_to_project}" merge-base --is-ancestor "${commitA_Before}" "${commitB_Later}"`;

      //console.log(`DEBUG_ANCESTRY: Running shell command: "${command}" (checking if ${commitA} is ancestor of ${commitB})`);

      exec(command, (error, stdout, stderr) => {
        if (error) {
          // Ein Error-Objekt wird hier gesetzt, wenn der Exit-Code UNGLEICH 0 ist.
          // Das ist genau das Verhalten, das wir wollen!
          //console.log(`DEBUG_ANCESTRY: 'git merge-base --is-ancestor ${commitA} ${commitB}' FAILED. (Non-zero exit code: ${error.code}).`);
          if (stderr) {
            //console.log(`DEBUG_ANCESTRY: Stderr from git command: ${stderr.trim()}`);
          }
          resolve(false); // Der Befehl ist nicht erfolgreich -> A ist kein Vorfahre von B
        } else {
          // Wenn kein Error-Objekt vorhanden ist, war der Exit-Code 0.
          //console.log(`DEBUG_ANCESTRY: 'git merge-base --is-ancestor ${commitA} ${commitB}' SUCCEEDED. (Exit Code 0).`);
          resolve(true); // Der Befehl ist erfolgreich -> A ist Vorfahre von B
        }
      });
    });
  }

  static async cloneGitProject(git_project_url, path_to_project) {
    // delete the folder if it exists
    //console.log("Start cloneGitProject "+git_project_url+" to "+path_to_project);
    await GitHelper.deleteGitFolder(path_to_project);

    console.log('Start cloneGitProject ' + git_project_url);
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
    if (!(await GitHelper.isPathAGitRepository(path_to_project))) {
      return null;
    }

    const git: SimpleGit = GitHelper.getGitInstance(path_to_project);
    try {
      const remotes = await git.listRemote(['--get-url']);
      if (remotes) {
        let remoteUrl = remotes.split('\n')[0]; // Assuming the first line contains the URL
        let gitEnding = '.git';
        if (remoteUrl.endsWith(gitEnding)) {
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

  static async getGitObjectType(path_to_folder: string, hash: string | null | undefined): Promise<string | null> {
    if (!hash) {
      console.error('No hash provided');
      return null;
    }

    try {
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
      const type = await git.raw(['cat-file', '-t', hash]);
      return type.trim(); // e.g. 'commit', 'tag', etc.
    } catch (error) {
      console.error(`Error checking git object type for ${hash}:`, error);
      return null;
    }
  }

  static async getCommitHashForTag(path_to_folder: string, tagName: string): Promise<string | null> {
    try {
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
      const commitHash = await git.revparse([`${tagName}^{commit}`]); // get the commit hash for the tag, despite the tag being a lightweight tag or an annotated tag
      //console.log(`commitHash: ${commitHash}`);
      //console.log("path_to_folder: "+path_to_folder);
      //console.log("git command: "+`git rev-parse ${tagName}^{commit}`);
      return commitHash.trim();
    } catch (err) {
      console.error(`Error fetching commit hash for tag ${tagName}:`, err);
      return null;
    }
  }

  static async getTagsPointingAtCommit(path_to_folder: string, commitHash: string): Promise<string[]> {
    if (!(await GitHelper.isPathAGitRepository(path_to_folder))) {
      return [];
    }

    try {
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
      const tags = await git.raw(['tag', '--points-at', commitHash]);
      return tags
        .trim()
        .split('\n')
        .filter(t => t.length > 0);
    } catch (error) {
      console.error(`Error getting tags for commit ${commitHash}:`, error);
      return [];
    }
  }

  static async getTagFromCommitHash(path_to_folder: string, commitHash: string): Promise<string | null> {
    const tags = await GitHelper.getTagsPointingAtCommit(path_to_folder, commitHash);
    return tags.length > 0 ? tags[0] : null;
  }

  static async isPathAGitRepository(path_to_folder: string): Promise<boolean> {
    if (!fs.existsSync(path_to_folder) || !fs.existsSync(path_to_folder + '/.git')) {
      //console.error('No .git folder found in path: '+path_to_folder);
      return false;
    }
    try {
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
      await git.status(); // Versucht, den Status des Repositories abzurufen
      return true; // Wenn erfolgreich, ist es ein Git-Repository
    } catch (error) {
      return false; // Wenn ein Fehler auftritt, ist es kein Git-Repository
    }
  }

  static async getCommitDateUnixTimestamp(path_to_folder: string, identifier: string | undefined | null): Promise<string | null> {
    if (!identifier) {
      console.error('No identifier provided');
      return null;
    }
    // check if path_to_folder/.git exists
    if (!(await GitHelper.isPathAGitRepository(path_to_folder))) {
      return null;
    }

    try {
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
      const options = ['-s', '--format=%ct', `${identifier}^{}`];
      const result = await git.show(options);
      const lines = result.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const timestamp = parseInt(lastLine, 10);
      return isNaN(timestamp) ? null : '' + timestamp;
    } catch (error: any) {
      console.error('An error occurred:', error);
      return null;
    }
  }

  static async getProjectName(path_to_folder: string): Promise<string | null> {
    if (!(await GitHelper.isPathAGitRepository(path_to_folder))) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
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
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
      git.revparse(['HEAD'], (err: Error | null, data?: string) => {
        if (err) {
          //reject(err);
          resolve(null);
        } else {
          let commit = data?.trim();
          if (!!commit) {
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
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
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
                if (entry.hash) {
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
      const git: SimpleGit = GitHelper.getGitInstance(path_to_folder);
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
