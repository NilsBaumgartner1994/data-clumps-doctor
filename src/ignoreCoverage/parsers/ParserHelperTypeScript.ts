import { ParserBase } from './ParserBase';
import { ParserInterface } from './ParserInterface';
import { Project } from 'ts-morph';
import path from 'path';
import { ClassOrInterfaceTypeContext, MemberFieldParameterTypeContext, MethodParameterTypeContext, MethodTypeContext } from '../ParsedAstTypes';

export class ParserHelperTypeScript extends ParserBase implements ParserInterface {
  constructor() {
    super();
  }

  async parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>> {
    const project = new Project({});
    project.addSourceFilesAtPaths([
      path.join(path_to_source_folder, '**/*.ts'),
      path.join(path_to_source_folder, '**/*.tsx'),
      `!**/node_modules/**`, // <- exclude node_modules
      `!**/dist/**`, // <- exclude dist
      `!**/build/**`, // <- exclude build
      `!**/out/**`, // <- exclude out
      `!**/coverage/**`, // <- exclude coverage
      `!**/test/**`, // <- exclude test
      `!**/__tests__/**`, // <- exclude __tests__
    ]);

    //console.log('Parse TypeScript project');

    const dict = new Map<string, ClassOrInterfaceTypeContext>();

    for (const sourceFile of project.getSourceFiles()) {
      const relativePath = path.relative(path_to_source_folder, sourceFile.getFilePath());
      //console.log('Parse file: ', relativePath);

      for (const cls of sourceFile.getClasses()) {
        const name = cls.getName() || 'anonymous_class';
        //console.log("  - Found class: ", name);
        const key = `${relativePath}/class/${name}`;
        const ctx = new ClassOrInterfaceTypeContext(key, name, 'class', relativePath);
        ctx.modifiers = [];
        if (cls.isAbstract()) ctx.modifiers.push('ABSTRACT');

        //console.log("    Properties:");
        for (const prop of cls.getProperties()) {
          const propName = prop.getName();
          const fieldKey = propName;
          const typeText = this.normalizeTypeText(prop.getType().getText(), path_to_source_folder);
          //console.log("     - Found property "+propName+" : "+typeText);
          const modifiers: string[] = [];
          if (prop.hasModifier('public')) modifiers.push('PUBLIC');
          if (prop.hasModifier('protected')) modifiers.push('PROTECTED');
          if (prop.hasModifier('private')) modifiers.push('PRIVATE');
          if (prop.isReadonly()) modifiers.push('READONLY');
          const field = new MemberFieldParameterTypeContext(fieldKey, propName, typeText, modifiers, false, ctx);
          ctx.fields[field.key] = field;
        }

        //console.log("    Methods:");
        for (const method of cls.getMethods()) {
          const methodName = method.getName();

          const methodKey = methodName;
          const returnTypeText = this.normalizeTypeText(method.getReturnType().getText(), path_to_source_folder);
          const methodCtx = new MethodTypeContext(methodKey, methodName, returnTypeText, false, ctx);
          methodCtx.modifiers = [];
          if (method.hasModifier('public')) methodCtx.modifiers.push('PUBLIC');
          if (method.hasModifier('protected')) methodCtx.modifiers.push('PROTECTED');
          if (method.hasModifier('private')) methodCtx.modifiers.push('PRIVATE');
          if (method.isStatic()) methodCtx.modifiers.push('STATIC');

          let paramNames: string[] = [];
          for (const param of method.getParameters()) {
            const paramName = param.getName();
            paramNames.push(paramName);
            const paramKey = paramName;
            const paramType = this.normalizeTypeText(param.getType().getText(), path_to_source_folder);
            const paramCtx = new MethodParameterTypeContext(paramKey, paramName, paramType, [], false, methodCtx);
            methodCtx.parameters.push(paramCtx);
          }
          //console.log("     - Found method "+methodName+" ("+paramNames.join(", ")+") : "+returnTypeText);

          ctx.methods[methodCtx.key] = methodCtx;
        }

        for (const ctor of cls.getConstructors()) {
          const parameterInfos = ctor.getParameters().map(param => ({
            name: param.getName(),
            type: this.normalizeTypeText(param.getType().getText(), path_to_source_folder),
          }));
          const signature = parameterInfos.map(param => `${param.type} ${param.name}`).join(', ');
          const ctorKey = `constructor(${signature})`;
          const ctorCtx = new MethodTypeContext(ctorKey, 'constructor', undefined, false, ctx, 'constructor');
          ctorCtx.modifiers = [];
          if (ctor.hasModifier('public')) ctorCtx.modifiers.push('PUBLIC');
          if (ctor.hasModifier('protected')) ctorCtx.modifiers.push('PROTECTED');
          if (ctor.hasModifier('private')) ctorCtx.modifiers.push('PRIVATE');

          for (const paramInfo of parameterInfos) {
            const paramCtx = new MethodParameterTypeContext(paramInfo.name, paramInfo.name, paramInfo.type, [], false, ctorCtx);
            ctorCtx.parameters.push(paramCtx);
          }

          ctx.constructors[ctorCtx.key] = ctorCtx;
        }

        dict.set(ctx.key, ctx);
      }

      for (const intf of sourceFile.getInterfaces()) {
        const name = intf.getName() || 'anonymous_interface';
        const key = `${relativePath}/interface/${name}`;
        const ctx = new ClassOrInterfaceTypeContext(key, name, 'interface', relativePath);
        ctx.modifiers = [];

        for (const prop of intf.getProperties()) {
          const propName = prop.getName();
          const fieldKey = propName;
          const typeText = this.normalizeTypeText(prop.getType().getText(), path_to_source_folder);
          const field = new MemberFieldParameterTypeContext(fieldKey, propName, typeText, [], false, ctx);
          ctx.fields[field.key] = field;
        }

        for (const method of intf.getMethods()) {
          const methodName = method.getName();
          const methodKey = methodName;
          const returnTypeText = this.normalizeTypeText(method.getReturnType().getText(), path_to_source_folder);
          const methodCtx = new MethodTypeContext(methodKey, methodName, returnTypeText, false, ctx);
          methodCtx.modifiers = [];

          for (const param of method.getParameters()) {
            const paramName = param.getName();
            const paramKey = paramName;
            const paramType = this.normalizeTypeText(param.getType().getText(), path_to_source_folder);
            const paramCtx = new MethodParameterTypeContext(paramKey, paramName, paramType, [], false, methodCtx);
            methodCtx.parameters.push(paramCtx);
          }

          ctx.methods[methodCtx.key] = methodCtx;
        }

        dict.set(ctx.key, ctx);
      }
    }

    return dict;
  }

  private normalizeTypeText(typeText: string, projectRoot: string): string {
    if (!typeText.includes('import(')) {
      return typeText;
    }

    const absoluteProjectRoot = path.resolve(projectRoot);
    const importRegex = /import\((['"])([^'"]+)\1\)/g;

    return typeText.replace(importRegex, (_match, quote, importPath) => {
      const normalizedImportPath = path.normalize(importPath);
      if (!path.isAbsolute(normalizedImportPath)) {
        const normalized = normalizedImportPath.split(path.sep).join('/');
        return `import(${quote}${normalized}${quote})`;
      }

      const relativeImportPath = path.relative(absoluteProjectRoot, normalizedImportPath);

      if (relativeImportPath.startsWith('..')) {
        const normalized = normalizedImportPath.split(path.sep).join('/');
        return `import(${quote}${normalized}${quote})`;
      }

      const posixRelativePath = relativeImportPath.split(path.sep).join('/');
      return `import(${quote}${posixRelativePath}${quote})`;
    });
  }
}
