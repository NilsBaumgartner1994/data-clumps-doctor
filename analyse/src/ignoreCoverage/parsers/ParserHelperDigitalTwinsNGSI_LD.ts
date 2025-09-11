import fs from 'fs/promises';
import path from 'path';
import { ParserBase } from './ParserBase';
import { ClassOrInterfaceTypeContext } from '../ParsedAstTypes';
import { ParserHelperDigitalTwinsDefinitionLanguageFileParser } from './helper/ParserHelperDigitalTwinsDefinitionLanguageFileParser';

export class ParserHelperDigitalTwinsNGSI_LD extends ParserBase {
  constructor() {
    super();
  }

  async parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>> {
    return await this.parseSourceToDictOfClassesOrInterfacesAzure(path_to_source_folder);
  }

  async parseSourceToDictOfClassesOrInterfacesAzure(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>> {
    console.log('Parsing source to AST for Digital Twins Definition Language');
    console.log(`Loading JSON model contents from ${path_to_source_folder}`);
    const jsonFilePaths = await this.searchForModelFiles(path_to_source_folder);
    let dtdlParser = new ParserHelperDigitalTwinsDefinitionLanguageFileParser();
    return await dtdlParser.parseSourceToDictOfClassesOrInterfaces(path_to_source_folder, jsonFilePaths);
  }

  // --- helpers ---------------------------------------------------------------

  private async searchForModelFiles(dir: string): Promise<string[]> {
    const files = await this.walkDir(dir);
    const modelFiles = files.filter(f => f.endsWith('schemaDTDL.json'));
    return modelFiles;
  }

  private async walkDir(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // ⚠️ ignorieren, wenn .vscode oder andere "dot"-Ordner
        if (entry.name === '.vscode' || entry.name.startsWith('.')) {
          continue;
        }
        paths.push(...(await this.walkDir(fullPath)));
      } else if (entry.isFile()) {
        paths.push(fullPath);
      }
    }
    return paths;
  }
}
