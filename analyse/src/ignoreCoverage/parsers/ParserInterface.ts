export interface ParserInterface{

    parseSourceToAst(path_to_source_folder: string, path_to_ast_output: string): Promise<void>;


}
