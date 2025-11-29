import { MyLogger, ParserBase } from './ParserBase';
import { ParserInterface } from './ParserInterface';
import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import { ClassOrInterfaceTypeContext, MemberFieldParameterTypeContext, MethodParameterTypeContext, MethodTypeContext } from '../ParsedAstTypes';

export class ParserHelperTypeScript extends ParserBase implements ParserInterface {
  private readonly logger: MyLogger = new MyLogger();

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

    const dict = new Map<string, ClassOrInterfaceTypeContext>();

    for (const sourceFile of project.getSourceFiles()) {
      const relativePath = path.relative(path_to_source_folder, sourceFile.getFilePath());

      for (const cls of sourceFile.getClasses()) {
        const name = cls.getName() || 'anonymous_class';
        this.logger.checkClassName(name);

        this.logger.log('  - Found class: ' + name);

        const key = `${relativePath}/class/${name}`;
        const ctx = new ClassOrInterfaceTypeContext(key, name, 'class', relativePath);
        ctx.modifiers = [];
        if (cls.isAbstract()) ctx.modifiers.push('ABSTRACT');

        // --- New: resolve extends / implements ---
        try {
          const heritageClauses = (cls as any).getHeritageClauses ? (cls as any).getHeritageClauses() : [];
          for (const clause of heritageClauses) {
            const token = clause.getToken ? clause.getToken() : undefined;
            const isExtends = token === SyntaxKind.ExtendsKeyword;
            const isImplements = token === SyntaxKind.ImplementsKeyword;
            const typeNodes = clause.getTypeNodes ? clause.getTypeNodes() : [];
            for (const tn of typeNodes) {
              let raw = tn.getText();
              raw = this.normalizeTypeText(raw, path_to_source_folder);
              const resolved = this.resolveTypeToClassOrInterfaceKey(raw, sourceFile, path_to_source_folder, project);
              if (resolved) {
                if (isExtends) ctx.extends_.push(resolved);
                if (isImplements) ctx.implements_.push(resolved);
              } else {
                // fallback: push normalized textual representation
                if (isExtends) ctx.extends_.push(raw);
                if (isImplements) ctx.implements_.push(raw);
              }
            }
          }
        } catch (e) {
          // ignore heritage parsing errors
        }

        this.logger.log('   Properties:');

        for (const prop of cls.getProperties()) {
          const propName = prop.getName();
          const fieldKey = propName;
          const typeText = this.normalizeTypeText(prop.getType().getText(), path_to_source_folder);
          this.logger.log('     - Found property ' + propName + ' : ' + typeText);
          const modifiers: string[] = [];
          if (prop.hasModifier('public')) modifiers.push('PUBLIC');
          if (prop.hasModifier('protected')) modifiers.push('PROTECTED');
          if (prop.hasModifier('private')) modifiers.push('PRIVATE');
          if (prop.isReadonly()) modifiers.push('READONLY');
          const field = new MemberFieldParameterTypeContext(fieldKey, propName, typeText, modifiers, false, ctx);
          ctx.fields[field.key] = field;
        }

        this.logger.log('   Methods:');
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
            const paramCtx = new MethodParameterTypeContext(paramName, paramName, paramType, [], false, methodCtx);
            methodCtx.parameters.push(paramCtx);
          }
          this.logger.log('     - Found method ' + methodName + ' (' + paramNames.join(', ') + ') : ' + returnTypeText);

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
        this.logger.checkClassName(name);

        this.logger.log('  - Found interface: ' + name);

        const key = `${relativePath}/interface/${name}`;
        const ctx = new ClassOrInterfaceTypeContext(key, name, 'interface', relativePath);
        ctx.modifiers = [];

        // --- New: resolve extends (interfaces can extend other interfaces) ---
        try {
          const heritageClauses = (intf as any).getHeritageClauses ? (intf as any).getHeritageClauses() : [];
          for (const clause of heritageClauses) {
            const token = clause.getToken ? clause.getToken() : undefined;
            const isExtends = token === SyntaxKind.ExtendsKeyword;
            const typeNodes = clause.getTypeNodes ? clause.getTypeNodes() : [];
            for (const tn of typeNodes) {
              let raw = tn.getText();
              raw = this.normalizeTypeText(raw, path_to_source_folder);
              const resolved = this.resolveTypeToClassOrInterfaceKey(raw, sourceFile, path_to_source_folder, project);
              if (resolved) {
                if (isExtends) ctx.extends_.push(resolved);
              } else {
                if (isExtends) ctx.extends_.push(raw);
              }
            }
          }
        } catch (e) {
          // ignore
        }

        // iterate properties of interface; convert function-typed properties to methods
        for (const prop of intf.getProperties()) {
          const propName = prop.getName();
          const fieldKey = propName;

          // Prefer reading the TypeNode (FunctionTypeNode) if present
          const typeNode = prop.getTypeNode ? prop.getTypeNode() : undefined;
          const isFunctionTypeNode = typeNode && typeof (typeNode as any).getParameters === 'function';

          if (isFunctionTypeNode) {
            try {
              const paramsNodes = (typeNode as any).getParameters ? (typeNode as any).getParameters() : [];
              const returnTypeNode = (typeNode as any).getReturnTypeNode ? (typeNode as any).getReturnTypeNode() : undefined;
              const returnTypeText = returnTypeNode ? this.normalizeTypeText(returnTypeNode.getText(), path_to_source_folder) : this.normalizeTypeText(prop.getType().getCallSignatures && prop.getType().getCallSignatures()[0] ? prop.getType().getCallSignatures()[0].getReturnType().getText() : 'void', path_to_source_folder);

              const methodCtx = new MethodTypeContext(fieldKey, propName, returnTypeText, false, ctx);
              methodCtx.modifiers = [];

              for (const pNode of paramsNodes) {
                const paramName = typeof (pNode as any).getName === 'function' ? (pNode as any).getName() : (pNode as any).getText ? (pNode as any).getText() : 'param';
                let paramType = 'any';
                try {
                  const pTypeNode = (pNode as any).getTypeNode ? (pNode as any).getTypeNode() : undefined;
                  if (pTypeNode && typeof pTypeNode.getText === 'function') {
                    paramType = this.normalizeTypeText(pTypeNode.getText(), path_to_source_folder);
                  } else if ((pNode as any).getType && typeof (pNode as any).getType === 'function') {
                    const pType = (pNode as any).getType();
                    if (pType && typeof pType.getText === 'function') {
                      paramType = this.normalizeTypeText(pType.getText(), path_to_source_folder);
                    }
                  }
                } catch (e) {
                  // ignore
                }

                const paramCtx = new MethodParameterTypeContext(paramName, paramName, paramType, [], false, methodCtx);
                methodCtx.parameters.push(paramCtx);
              }

              ctx.methods[methodCtx.key] = methodCtx;
              continue; // skip adding as field
            } catch (e) {
              // fallback to old behavior if signature parsing fails
            }
          }

          // fallback: normal property
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
            const paramCtx = new MethodParameterTypeContext(paramName, paramName, paramType, [], false, methodCtx);
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

  /**
   * Versucht einen Type-String (z.B. `import("./foo").Bar` oder `IBar`) aufzulösen und
   * den erwarteten Key im Format `<relativePath>/interface|class/Name` zurückzugeben.
   * Liefert `undefined` wenn keine Auflösung möglich ist.
   */
  private resolveTypeToClassOrInterfaceKey(typeText: string, sourceFile: any, projectRoot: string, project: Project): string | undefined {
    // 1) Prüfe auf import("...").TypeName Pattern
    const importRegex = /import\((['"])([^'"\\]+)\1\)\.?([A-ZaZ0-9_$]+)?/;
    let m = importRegex.exec(typeText);
    if (m) {
      const importPath = m[2];
      const typeName = m[3];
      if (!typeName) {
        return undefined;
      }

      // Build a list of candidate absolute paths to look for in the project
      const dirOfSource = path.dirname(sourceFile.getFilePath());
      const candidates: string[] = [];

      // If importPath is relative, resolve it relative to the source file
      if (importPath.startsWith('.')) {
        const abs = path.resolve(dirOfSource, importPath);
        candidates.push(abs);
        candidates.push(abs + '.ts', abs + '.tsx', abs + '.d.ts', path.join(abs, 'index.ts'), path.join(abs, 'index.tsx'));
      } else {
        // non-relative imports: try resolving relative to project root and also try as-is
        const absFromRoot = path.resolve(projectRoot, importPath);
        candidates.push(absFromRoot, absFromRoot + '.ts', absFromRoot + '.tsx', absFromRoot + '.d.ts', path.join(absFromRoot, 'index.ts'), path.join(absFromRoot, 'index.tsx'));
        candidates.push(importPath, importPath + '.ts', importPath + '.tsx', importPath + '/index.ts');
      }

      // Normalize and try to find a matching source file
      for (const candidate of candidates) {
        const normCandidate = candidate.split(path.sep).join('/');
        const found = project.getSourceFiles().find(sf => {
          const sfPath = sf.getFilePath().split(path.sep).join('/');
          return sfPath === normCandidate || sfPath.endsWith('/' + normCandidate) || sfPath.endsWith(normCandidate);
        });
        if (found) {
          const rel = path.relative(projectRoot, found.getFilePath()).split(path.sep).join('/');
          // prüfe, ob Klasse oder Interface existiert
          const cls = found.getClass(typeName);
          if (cls) return `${rel}/class/${typeName}`;
          const intf = found.getInterface(typeName);
          if (intf) return `${rel}/interface/${typeName}`;
        }
      }

      return undefined;
    }

    // 2) Kein import(...) - entferne Generics und mögliche Qualifier
    let baseName = typeText.split('<')[0].trim();
    // falls qualifiziert wie module.Type -> nur das letzte Segment
    if (baseName.includes('.')) {
      const parts = baseName.split('.');
      baseName = parts[parts.length - 1];
    }

    // 3) Suche in den Import-Statements der aktuellen Datei
    try {
      const importDecls = sourceFile.getImportDeclarations ? sourceFile.getImportDeclarations() : [];
      for (const imp of importDecls) {
        // check named imports
        const named = imp.getNamedImports ? imp.getNamedImports() : [];
        for (const ni of named) {
          const niName = ni.getName ? ni.getName() : undefined;
          if (niName === baseName) {
            const moduleSpec = imp.getModuleSpecifierValue ? imp.getModuleSpecifierValue() : undefined;
            if (moduleSpec && moduleSpec.startsWith('.')) {
              // Auflösen relativ zur Datei
              const dir = path.dirname(sourceFile.getFilePath());
              const abs = path.resolve(dir, moduleSpec);
              const possible = [abs, abs + '.ts', abs + '.tsx', abs + '/index.ts', abs + '/index.tsx'];
              for (const p of possible) {
                const found = project.getSourceFiles().find(sf => sf.getFilePath() === p || sf.getFilePath().endsWith(p));
                if (found) {
                  const rel = path.relative(projectRoot, found.getFilePath()).split(path.sep).join('/');
                  const cls = found.getClass(baseName);
                  if (cls) return `${rel}/class/${baseName}`;
                  const intf = found.getInterface(baseName);
                  if (intf) return `${rel}/interface/${baseName}`;
                }
              }
            }
          }
        }

        // check default import
        const defaultImport = imp.getDefaultImport ? imp.getDefaultImport() : undefined;
        if (defaultImport && defaultImport.getText && defaultImport.getText() === baseName) {
          const moduleSpec = imp.getModuleSpecifierValue ? imp.getModuleSpecifierValue() : undefined;
          if (moduleSpec && moduleSpec.startsWith('.')) {
            const dir = path.dirname(sourceFile.getFilePath());
            const abs = path.resolve(dir, moduleSpec);
            const possible = [abs, abs + '.ts', abs + '.tsx', abs + '/index.ts', abs + '/index.tsx'];
            for (const p of possible) {
              const found = project.getSourceFiles().find(sf => sf.getFilePath() === p || sf.getFilePath().endsWith(p));
              if (found) {
                const rel = path.relative(projectRoot, found.getFilePath()).split(path.sep).join('/');
                const cls = found.getClass(baseName);
                if (cls) return `${rel}/class/${baseName}`;
                const intf = found.getInterface(baseName);
                if (intf) return `${rel}/interface/${baseName}`;
              }
            }
          }
        }

        // check namespace import (import * as X from './m') -> usage X.Type
        const namespaceImport = imp.getNamespaceImport ? imp.getNamespaceImport() : undefined;
        if (namespaceImport && namespaceImport.getName && baseName === namespaceImport.getName()) {
          // if baseName equals namespace name, then the original type looked like Namespace.Type, but we took last segment earlier
          // so we try to resolve the module directly
          const moduleSpec = imp.getModuleSpecifierValue ? imp.getModuleSpecifierValue() : undefined;
          if (moduleSpec && moduleSpec.startsWith('.')) {
            const dir = path.dirname(sourceFile.getFilePath());
            const abs = path.resolve(dir, moduleSpec);
            const possible = [abs, abs + '.ts', abs + '.tsx', abs + '/index.ts', abs + '/index.tsx'];
            for (const p of possible) {
              const found = project.getSourceFiles().find(sf => sf.getFilePath() === p || sf.getFilePath().endsWith(p));
              if (found) {
                const rel = path.relative(projectRoot, found.getFilePath()).split(path.sep).join('/');
                const cls = found.getClass(baseName);
                if (cls) return `${rel}/class/${baseName}`;
                const intf = found.getInterface(baseName);
                if (intf) return `${rel}/interface/${baseName}`;
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // 4) Suche in der selben Datei (innere Definition)
    try {
      const localCls = sourceFile.getClass ? sourceFile.getClass(baseName) : undefined;
      if (localCls) {
        const rel = path.relative(projectRoot, sourceFile.getFilePath()).split(path.sep).join('/');
        return `${rel}/class/${baseName}`;
      }
      const localIntf = sourceFile.getInterface ? sourceFile.getInterface(baseName) : undefined;
      if (localIntf) {
        const rel = path.relative(projectRoot, sourceFile.getFilePath()).split(path.sep).join('/');
        return `${rel}/interface/${baseName}`;
      }
    } catch (e) {
      // ignore
    }

    return undefined;
  }
}
