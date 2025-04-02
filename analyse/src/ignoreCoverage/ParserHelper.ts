import {SoftwareProjectDicts} from "./SoftwareProject";

import fs from 'fs';
import path from 'path';
import {ClassOrInterfaceTypeContext} from "./ParsedAstTypes";

import {exec, spawn} from 'child_process';


export class ParserHelper {

    static async getSoftwareProjectDictsFromParsedAstFolder(path_to_folder_of_parsed_ast){
        let softwareProjectDicts: SoftwareProjectDicts = new SoftwareProjectDicts();
        //console.log("Started loading ASTs")
        //console.log("path_to_folder_of_parsed_ast", path_to_folder_of_parsed_ast)

        let filesAndFoldersInPath = fs.readdirSync(path_to_folder_of_parsed_ast, { withFileTypes: true });
        for (let fileOrFolder of filesAndFoldersInPath) {
            let fullPath = path.join(path_to_folder_of_parsed_ast, fileOrFolder.name);
            if (fileOrFolder.isDirectory()) {
                continue;
            } else {
                let fileContent = fs.readFileSync(fullPath, 'utf-8');
                const loadedJsonData: any = JSON.parse(fileContent); // Parse the JSON data
                const classOrInterfaceTypeContext: ClassOrInterfaceTypeContext = ClassOrInterfaceTypeContext.fromObject(loadedJsonData);
                softwareProjectDicts.loadClassOrInterface(classOrInterfaceTypeContext);
            }
        }

        return softwareProjectDicts
    }

    /**
     * Asynchronously removes the generated Abstract Syntax Tree (AST) files from the specified folder.
     * The function attempts to delete the folder up to 10 times if it exists.
     *
     * @param {string} path_to_folder_of_parsed_ast - The path to the folder containing the parsed AST files that need to be removed.
     * @param {string} additionalMessageToLog - An additional message to log in case of an error during the removal process.
     * @returns {Promise<void>} A promise that resolves when the removal process is complete.
     *
     * @throws {Error} Throws an error if the folder cannot be removed after 10 attempts.
     *
     * @example
     * // Example usage:
     * await removeGeneratedAst('/path/to/ast/folder', 'Failed to remove AST files');
     */
    static async removeGeneratedAst(path_to_folder_of_parsed_ast: string, additionalMessageToLog: string): Promise<void> {
        // delete file if exists
        let tries = 1;
        while(fs.existsSync(path_to_folder_of_parsed_ast) && tries <= 10){
            if(fs.existsSync(path_to_folder_of_parsed_ast)){
                console.log("Started removing generated ASTs: try: "+tries+" path_to_folder_of_parsed_ast: "+path_to_folder_of_parsed_ast);
                try{
                    fs.rmSync(path_to_folder_of_parsed_ast, { recursive: true });
                } catch (e) {
                    console.log("Error removing generated ASTs", e);
                    console.log("additionalMessageToLog", additionalMessageToLog);
                }
            }
        }
    }

}
