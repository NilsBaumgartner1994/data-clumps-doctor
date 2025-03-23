import { spawn } from 'child_process';

export class ParserHelperJavaSourceCode {

    private static async runMakeCommand(path_to_ast_generator_folder: string, source: string, destination: string, verbose = false): Promise<void> {
        return new Promise((resolve, reject) => {
            const command = `make run SOURCE="${source}" DESTINATION="${destination}"`;
            const proc = spawn(command, {
                cwd: path_to_ast_generator_folder,
                shell: true,
                env: { ...process.env },
            });

            if (verbose) {
                proc.stdout.on('data', (data) => process.stdout.write(data));
                proc.stderr.on('data', (data) => process.stderr.write(data));
            } else {
                proc.stdout.on('data', () => {});
                proc.stderr.on('data', () => {});
            }

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`make exited with code ${code}`));
                }
            });
        });
    }


    /**
     * Parses source code into an Abstract Syntax Tree (AST) and saves it to a specified location.
     *
     * This asynchronous method utilizes a helper to execute a command that generates the AST from the provided source code.
     *
     * @param {string} path_to_source_code - The file path to the source code that needs to be parsed.
     * @param {string} path_to_save_parsed_ast - The file path where the generated AST will be saved.
     * @param {string} path_to_ast_generator_folder - The directory containing the necessary tools or scripts for AST generation.
     * @returns {Promise<void>} A promise that resolves when the parsing and saving process is complete.
     *
     * @throws {Error} Throws an error if the command execution fails, which is logged to the console.
     */
    static async parseSourceCodeToAst(path_to_source_code: string, path_to_save_parsed_ast: string, path_to_ast_generator_folder: string): Promise<void> {
        try {
            await ParserHelperJavaSourceCode.runMakeCommand(path_to_ast_generator_folder, path_to_source_code, path_to_save_parsed_ast);
        } catch (error) {
            console.error(`Error executing make: ${error}`);
        }
    }
}
