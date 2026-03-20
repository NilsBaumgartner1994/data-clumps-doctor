import path from 'path';
import { Node, Project } from 'ts-morph';
import { DataClumpTypeContext, DataClumpsVariableFromContext, Dictionary } from 'data-clumps-type-context';

export interface RefactoringResult {
  parameterObjectFileName: string;
  parameterObjectInterfaceName: string;
  modifiedFiles: string[];
}

/**
 * Generates a PascalCase name for the parameter object interface from the shared variable names.
 * Example: ['patientId', 'doctorId', 'requiresFollowUp'] → 'PatientIdDoctorIdRequiresFollowUpParams'
 */
function generateParameterObjectName(variableNames: string[]): string {
  const parts = variableNames.map(name => name.charAt(0).toUpperCase() + name.slice(1));
  return parts.join('') + 'Params';
}

/**
 * Refactors a parameter-parameter data clump by introducing a parameter object:
 *
 * 1. Creates a new TypeScript file with an exported interface containing the shared parameters.
 * 2. Updates both methods to accept the new parameter object instead of the individual parameters.
 * 3. Adds a destructuring statement at the top of each method body so that existing variable
 *    references inside the body continue to work without further changes.
 * 4. Adds the necessary import statements to both source files.
 */
export class TsMorphDataClumpRefactorer {
  private readonly project: Project;
  private readonly sourceRoot: string;

  constructor(sourceRoot: string) {
    this.sourceRoot = sourceRoot;
    this.project = new Project({ skipAddingFilesFromTsConfig: true });
    this.project.addSourceFilesAtPaths([path.join(sourceRoot, '**/*.ts'), path.join(sourceRoot, '**/*.tsx'), `!**/node_modules/**`, `!**/dist/**`]);
  }

  async refactorDataClump(dataClump: DataClumpTypeContext): Promise<RefactoringResult> {
    if (dataClump.data_clump_type !== 'parameters_to_parameters_data_clump') {
      throw new Error(`Unsupported data clump type: ${dataClump.data_clump_type}. Only parameters_to_parameters_data_clump is currently supported.`);
    }

    if (!dataClump.from_method_name || !dataClump.to_method_name) {
      throw new Error('Data clump must have both from_method_name and to_method_name set.');
    }

    const variables = dataClump.data_clump_data;
    const variableNames = Object.values(variables).map(v => v.name);
    const interfaceName = generateParameterObjectName(variableNames);
    const interfaceFileName = `${interfaceName}.ts`;
    const interfaceFilePath = path.join(this.sourceRoot, interfaceFileName);

    this.createParameterObjectInterface(interfaceFilePath, interfaceName, variables);

    const fromFilePath = path.resolve(this.sourceRoot, dataClump.from_file_path);
    this.updateMethodToUseParameterObject(fromFilePath, dataClump.from_class_or_interface_name, dataClump.from_method_name, variableNames, interfaceName, interfaceFilePath);

    const toFilePath = path.resolve(this.sourceRoot, dataClump.to_file_path);
    const toMethodDiffersFromFrom = fromFilePath !== toFilePath || dataClump.to_method_name !== dataClump.from_method_name;
    if (toMethodDiffersFromFrom) {
      this.updateMethodToUseParameterObject(toFilePath, dataClump.to_class_or_interface_name, dataClump.to_method_name, variableNames, interfaceName, interfaceFilePath);
    }

    await this.project.save();

    const modifiedFiles = [interfaceFilePath, fromFilePath];
    if (fromFilePath !== toFilePath) {
      modifiedFiles.push(toFilePath);
    }

    return {
      parameterObjectFileName: interfaceFileName,
      parameterObjectInterfaceName: interfaceName,
      modifiedFiles,
    };
  }

  private createParameterObjectInterface(filePath: string, interfaceName: string, variables: Dictionary<DataClumpsVariableFromContext>): void {
    const existing = this.project.getSourceFile(filePath);
    if (existing) {
      existing.delete();
    }

    const sourceFile = this.project.createSourceFile(filePath, '', { overwrite: true });
    sourceFile.addInterface({
      name: interfaceName,
      isExported: true,
      properties: Object.values(variables).map(variable => ({
        name: variable.name,
        type: variable.type,
      })),
    });
  }

  private updateMethodToUseParameterObject(filePath: string, className: string, methodName: string, variableNames: string[], interfaceName: string, interfaceFilePath: string): void {
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Source file not found in project: ${filePath}`);
    }

    const classDeclaration = sourceFile.getClass(className);
    if (!classDeclaration) {
      throw new Error(`Class '${className}' not found in ${filePath}`);
    }

    const method = classDeclaration.getMethod(methodName);
    if (!method) {
      throw new Error(`Method '${methodName}' not found in class '${className}' (${filePath})`);
    }

    const allParams = method.getParameters();
    const clumpParamIndices = allParams
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => variableNames.includes(p.getName()))
      .map(({ i }) => i);

    if (clumpParamIndices.length === 0) {
      return;
    }

    const insertIndex = clumpParamIndices[0];

    const params = method.getParameters();
    for (let i = clumpParamIndices.length - 1; i >= 0; i--) {
      params[clumpParamIndices[i]].remove();
    }

    method.insertParameter(insertIndex, {
      name: 'params',
      type: interfaceName,
    });

    const body = method.getBody();
    if (body && Node.isBlock(body)) {
      body.insertStatements(0, `const { ${variableNames.join(', ')} } = params;`);
    }

    const relativeImportPath = path.relative(path.dirname(filePath), interfaceFilePath).replace(/\.ts$/, '').replace(/\\/g, '/');
    const interfaceImportPath = relativeImportPath.startsWith('.') ? relativeImportPath : `./${relativeImportPath}`;
    const existingImport = sourceFile.getImportDeclaration(d => d.getModuleSpecifierValue() === interfaceImportPath);
    if (!existingImport) {
      sourceFile.addImportDeclaration({
        namedImports: [interfaceName],
        moduleSpecifier: interfaceImportPath,
      });
    }
  }
}
