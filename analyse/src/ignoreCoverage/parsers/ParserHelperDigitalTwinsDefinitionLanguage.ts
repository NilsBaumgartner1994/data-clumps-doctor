import {ParserInterface} from "./ParserInterface";

export class ParserHelperDigitalTwinsDefinitionLanguage implements ParserInterface {

    constructor() {

    }

    parseSourceToAst(path_to_source: string, path_to_ast_output: string): Promise<void> {
        return Promise.resolve(undefined);
    }



}
