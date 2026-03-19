export type ProjectData = {
  projectName: string;
  projectUrl: string;
  report_file_path: string;
  tag: string | undefined | null;
  commitHash: string;
  /** Timestamp may be used for plots or time-series analysis. */
  timestamp: number;
  fieldFieldDataClumps: number;
  parameterParameterDataClumps: number;
  parameterFieldDataClumps: number;
  /** Number of bug-introducing commits up to and including this commit (based on ancestry). */
  numberOfBugIntroducingCommits: number | undefined;
};
