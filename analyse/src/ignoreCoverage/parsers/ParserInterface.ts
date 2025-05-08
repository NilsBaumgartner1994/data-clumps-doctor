export interface ParserInterface{

    parseSourceToAst(path_to_source: string, path_to_ast_output: string): Promise<void>;


}
