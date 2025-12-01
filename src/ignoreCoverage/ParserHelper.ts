import { SoftwareProjectDicts } from './SoftwareProject';

import fs from 'fs';
import path from 'path';
import { ClassOrInterfaceTypeContext } from './ParsedAstTypes';
import { DetectorOptions } from '../index';
import { pathMatchesPattern } from './FilePathHelper';

export class ParserHelper {
  static async getSoftwareProjectDictsFromParsedAstFolder(path_to_folder_of_parsed_ast: string, detectorOptions: Partial<DetectorOptions>): Promise<SoftwareProjectDicts> {
    let softwareProjectDicts: SoftwareProjectDicts = new SoftwareProjectDicts();

    let excludePathsDict: Record<string, boolean> = {};
    if (!!detectorOptions.pathsExcludedFromParsing && detectorOptions.pathsExcludedFromParsing.length > 0) {
      for (const excludePath of detectorOptions.pathsExcludedFromParsing) {
        excludePathsDict[excludePath] = true;
      }
    }

    let filesAndFoldersInPath = fs.readdirSync(path_to_folder_of_parsed_ast, { withFileTypes: true });
    for (let fileOrFolder of filesAndFoldersInPath) {
      let fullPath = path.join(path_to_folder_of_parsed_ast, fileOrFolder.name);
      //console.log(`Found ${fullPath}`);
      if (fileOrFolder.isDirectory()) {
        // TODO: handle subdirectories if needed
        continue;
      } else {
        let fileContent = fs.readFileSync(fullPath, 'utf-8');
        const loadedJsonData: any = JSON.parse(fileContent); // Parse the JSON data
        const classOrInterface: ClassOrInterfaceTypeContext = ClassOrInterfaceTypeContext.fromObject(loadedJsonData);

        let filePath = classOrInterface.file_path;
        let isExcluded = false;

        if (excludePathsDict[filePath]) {
          isExcluded = true;
        } else {
          if (!!detectorOptions.pathsExcludedFromParsing && detectorOptions.pathsExcludedFromParsing.length > 0) {
            for (const excludePath of detectorOptions.pathsExcludedFromParsing) {
              if (pathMatchesPattern(filePath, excludePath)) {
                isExcluded = true;
                break;
              }
            }
          }
        }

        if (detectorOptions.pathsIgnoredInDetectionComparison && detectorOptions.pathsIgnoredInDetectionComparison.length > 0) {
          for (let i = 0; i < detectorOptions.pathsIgnoredInDetectionComparison.length && !classOrInterface.auxclass; i++) {
            const ignorePath = detectorOptions.pathsIgnoredInDetectionComparison[i];
            if (!ignorePath) continue;
            if (pathMatchesPattern(filePath, ignorePath)) {
              classOrInterface.auxclass = true;
            }
          }
        }

        if (!isExcluded) {
          softwareProjectDicts.loadClassOrInterface(classOrInterface);
        }
      }
    }

    return softwareProjectDicts;
  }

  static async removeGeneratedAst(path_to_folder_of_parsed_ast: string, additionalMessageToLog: string): Promise<void> {
    // delete file if exists
    let tries = 1;
    let lastError: any = null;
    let maxTriesManual = 10;
    while (fs.existsSync(path_to_folder_of_parsed_ast) && tries <= maxTriesManual) {
      if (fs.existsSync(path_to_folder_of_parsed_ast)) {
        //console.log("Started removing generated ASTs: try: "+tries+" path_to_folder_of_parsed_ast: "+path_to_folder_of_parsed_ast);
        try {
          fs.rmSync(path_to_folder_of_parsed_ast, { recursive: true, force: true, maxRetries: 10 });
        } catch (e: any) {
          lastError = e;
          //console.log("Error removing generated ASTs", e);
          //console.log("additionalMessageToLog", additionalMessageToLog);
        }
      }
      tries++;
    }
    if (fs.existsSync(path_to_folder_of_parsed_ast)) {
      console.error('Error removing generated ASTs: ' + additionalMessageToLog);
      console.error('lastError', lastError);
    }
  }
}
