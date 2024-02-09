import {exec} from 'child_process';


export class ParserHelperJavaSourceCode {

    /**
     * Asynchronously executes a command and returns the stdout and stderr.
     * @param command The command to be executed.
     * @returns A promise that resolves to an object containing the stdout and stderr.
     * @throws {Error} If there is an error executing the command.
     */
    static async execAsync(command): Promise<{ stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ stdout, stderr });
            });
        });
    };

    /**
     * Parse the source code to abstract syntax tree (AST) and save it to a specified location.
     * @param path_to_source_code - The path to the source code file.
     * @param path_to_save_parsed_ast - The path to save the parsed AST.
     * @param path_to_ast_generator_folder - The path to the folder containing the AST generator.
     * @throws Error - If there is an error executing the make command.
     * @returns A Promise that resolves when the AST is successfully generated and saved.
     */
    static async parseSourceCodeToAst(path_to_source_code: string, path_to_save_parsed_ast: string, path_to_ast_generator_folder): Promise<void> {
        //console.log("Started generating ASTs");
        try {
            const { stdout } = await ParserHelperJavaSourceCode.execAsync('cd '+path_to_ast_generator_folder+' && make run SOURCE="'+path_to_source_code+'" DESTINATION="'+path_to_save_parsed_ast+'"');
            //console.log(stdout);
        } catch (error) {
            console.error(`Error executing make: ${error}`);
        }
        //console.log("Finished generating ASTs");
    }



}
