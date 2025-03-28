import { spawn } from 'child_process';
import {exec} from 'child_process';

export class ParserHelperJavaSourceCode {

    /**
     * Allow large files to be parsed
     * We don't use it because it seems, that this will bring up huge data.
     * The analysis will not be useful at all, because the data is too big. The project has some major issues.
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
        */

    private static async execAsync(command): Promise<{ stdout: string, stderr: string }> {
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

    static async parseSourceCodeToAst(path_to_source_code: string, path_to_save_parsed_ast: string, path_to_ast_generator_folder: string): Promise<void> {
        try {
            //await ParserHelperJavaSourceCode.runMakeCommand(path_to_ast_generator_folder, path_to_source_code, path_to_save_parsed_ast);
            const { stdout } = await ParserHelperJavaSourceCode.execAsync('cd '+path_to_ast_generator_folder+' && make run SOURCE="'+path_to_source_code+'" DESTINATION="'+path_to_save_parsed_ast+'"');
        } catch (error) {
            console.error(`Error executing make: ${error}`);
        }
    }
}
