import {SoftwareProjectDicts} from "./SoftwareProject";

import fs from 'fs';
import path from 'path';
import {ClassOrInterfaceTypeContext} from "./ParsedAstTypes";

import {exec, spawn} from 'child_process';


export class ParserHelper {

    /**
     * Retrieves software project dictionaries from the parsed AST folder.
     * @param path_to_folder_of_parsed_ast The path to the folder containing parsed AST files.
     * @throws {Error} Throws an error if there is a problem reading or parsing the AST files.
     * @returns {SoftwareProjectDicts} Returns the software project dictionaries obtained from the parsed AST folder.
     */
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
     * Asynchronously removes the generated Abstract Syntax Trees (ASTs) from the specified folder path.
     * 
     * @param path_to_folder_of_parsed_ast The path to the folder containing the parsed ASTs.
     * @throws {Error} Throws an error if there is a problem removing the ASTs.
     * @returns A Promise that resolves when the ASTs are successfully removed.
     */
    static async removeGeneratedAst(path_to_folder_of_parsed_ast: string): Promise<void> {
        //console.log("Started removing generated ASTs");
        // delete file if exists
        if(fs.existsSync(path_to_folder_of_parsed_ast)){
            fs.rmSync(path_to_folder_of_parsed_ast, { recursive: true });
        }
    }

}
