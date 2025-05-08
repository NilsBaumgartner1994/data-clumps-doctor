import {ParserInterface} from "./ParserInterface";
import {ClassOrInterfaceTypeContext} from "../ParsedAstTypes";
import fs from 'fs';
import path from 'path';

export abstract class ParserBase implements ParserInterface {

    async parseSourceToAst(path_to_source_folder: string, path_to_ast_output: string){
        //console.log("Parsing source to AST");
        //console.log(`Loading source from ${path_to_source_folder}`);
        //console.log(`Saving AST to ${path_to_ast_output}`);

        let dictOfClassesOrInterfaces: Map<string, ClassOrInterfaceTypeContext> = await this.parseSourceToDictOfClassesOrInterfaces(path_to_source_folder);
        // Altough we already have the dictOfClassesOrInterfaces, we will save the ASTs to disk. This helps us to use other features of the tool (e.g. the search feature, saving the AST).

        let keys = Object.keys(dictOfClassesOrInterfaces);
        fs.mkdirSync(path_to_ast_output, { recursive: true });

        //console.log(`Saving ${keys.length} classes or interfaces to disk`);

        for(let key of keys){
            // Get the class or interface
            let classOrInterface = dictOfClassesOrInterfaces[key];
            // using the key as filename
            let path_to_file = path.join(path_to_ast_output, key + ".json");
            //console.log(`Saving ${key} to ${path_to_file}`);

            //  Save the class or interface to disk as JSON file
            try {
                fs.writeFileSync(path_to_file, JSON.stringify(classOrInterface, null, 2), 'utf8');
            } catch (err) {
                console.error('An error occurred while writing parseXmlToAst to file:', err);
            }

        }
        console.log('Results saved to '+path_to_ast_output);
    }

    abstract parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>>;

}
