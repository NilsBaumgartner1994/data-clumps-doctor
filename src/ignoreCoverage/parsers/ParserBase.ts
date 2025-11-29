import { ParserInterface } from './ParserInterface';
import { ClassOrInterfaceTypeContext } from '../ParsedAstTypes';
import fs from 'fs';
import path from 'path';

export class MyLogger {

  private shouldLog = false;

  constructor() {
    this.shouldLog = false;
  }

  checkClassName(name: string) {
    this.shouldLog = false;
    let logForClassNames: string[] = [];
    if (logForClassNames.includes(name)) {
      this.shouldLog = true;
    }
  }

  log(message: string) {
    if (this.shouldLog) {
      console.log(message);
    }
  }
}

export abstract class ParserBase implements ParserInterface {
  async parseSourceToAst(path_to_source_folder: string, path_to_ast_output: string) {
    let logger = new MyLogger();

    //console.log("Parsing source to AST");
    //console.log(`Loading source from ${path_to_source_folder}`);
    //console.log(`Saving AST to ${path_to_ast_output}`);

    let dictOfClassesOrInterfaces: Map<string, ClassOrInterfaceTypeContext> = await this.parseSourceToDictOfClassesOrInterfaces(path_to_source_folder);
    // Altough we already have the dictOfClassesOrInterfaces, we will save the ASTs to disk. This helps us to use other features of the tool (e.g. the search feature, saving the AST).

    let keys = Array.from(dictOfClassesOrInterfaces.keys());
    fs.mkdirSync(path_to_ast_output, { recursive: true });

    //console.log(`Saving ${keys.length} classes or interfaces to disk`);

    for (let key of keys) {
      // Get the class or interface
      let classOrInterface = dictOfClassesOrInterfaces.get(key);
      // using the key as filename

      // replace / and \ with _
      key = key.replace(/[/\\]/g, '_');

      let namePart = key.split('_').pop();
      if (namePart) {
        logger.checkClassName(namePart);
        logger.log(`Processing ${namePart}`);
        //logger.log(JSON.stringify(classOrInterface, null,  2));
        logger.log(JSON.stringify(classOrInterface?.methods, null, 2));
      }

      let path_to_file = path.join(path_to_ast_output, key + '.json');
      //console.log(`Saving ${key} to ${path_to_file}`);

      //  Save the class or interface to disk as JSON file
      try {
        // make sure the folder exists
        fs.mkdirSync(path.dirname(path_to_file), { recursive: true });

        fs.writeFileSync(path_to_file, JSON.stringify(classOrInterface, null, 2), 'utf8');
      } catch (err) {
        console.error('An error occurred while writing Ast to file:', err);
      }
    }
    //console.log('Results saved to '+path_to_ast_output);
  }

  abstract parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>>;
}
