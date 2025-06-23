import {ParserBase} from "./ParserBase";
import {ParserInterface} from "./ParserInterface";
import {Project} from "ts-morph";
import path from "path";
import {
    ClassOrInterfaceTypeContext,
    MemberFieldParameterTypeContext,
    MethodParameterTypeContext,
    MethodTypeContext
} from "../ParsedAstTypes";

export class ParserHelperTypeScript extends ParserBase implements ParserInterface {
    constructor() {
        super();
    }

    async parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>> {
        const project = new Project({});
        project.addSourceFilesAtPaths([
            path.join(path_to_source_folder, "**/*.ts"),
            path.join(path_to_source_folder, "**/*.tsx"),
            `!**/node_modules/**`, // <- exclude node_modules
            `!**/dist/**`, // <- exclude dist
            `!**/build/**`, // <- exclude build
            `!**/out/**`, // <- exclude out
            `!**/coverage/**`, // <- exclude coverage
            `!**/test/**`, // <- exclude test
            `!**/__tests__/**` // <- exclude __tests__
        ]);

        console.log("Parse TypeScript project");

        const dict: Map<string, ClassOrInterfaceTypeContext> = new Map();

        for (const sourceFile of project.getSourceFiles()) {

            const relativePath = path.relative(path_to_source_folder, sourceFile.getFilePath());
            console.log("Parse file: ", relativePath);

            for (const cls of sourceFile.getClasses()) {
                const name = cls.getName() || "anonymous_class";
                const key = `${relativePath}/class/${name}`;
                const ctx = new ClassOrInterfaceTypeContext(key, name, "class", relativePath);
                ctx.modifiers = [];
                if (cls.isAbstract()) ctx.modifiers.push("ABSTRACT");

                for (const prop of cls.getProperties()) {
                    const propName = prop.getName();
                    const fieldKey = propName;
                    const typeText = prop.getType().getText();
                    const modifiers: string[] = [];
                    if (prop.hasModifier("public")) modifiers.push("PUBLIC");
                    if (prop.hasModifier("protected")) modifiers.push("PROTECTED");
                    if (prop.hasModifier("private")) modifiers.push("PRIVATE");
                    if (prop.isReadonly()) modifiers.push("READONLY");
                    const field = new MemberFieldParameterTypeContext(fieldKey, propName, typeText, modifiers, false, ctx);
                    ctx.fields[field.key] = field;
                }

                for (const method of cls.getMethods()) {
                    const methodName = method.getName();
                    const methodKey = methodName;
                    const returnTypeText = method.getReturnType().getText();
                    const methodCtx = new MethodTypeContext(methodKey, methodName, returnTypeText, false, ctx);
                    methodCtx.modifiers = [];
                    if (method.hasModifier("public")) methodCtx.modifiers.push("PUBLIC");
                    if (method.hasModifier("protected")) methodCtx.modifiers.push("PROTECTED");
                    if (method.hasModifier("private")) methodCtx.modifiers.push("PRIVATE");
                    if (method.isStatic()) methodCtx.modifiers.push("STATIC");

                    for (const param of method.getParameters()) {
                        const paramName = param.getName();
                        const paramKey = paramName;
                        const paramType = param.getType().getText();
                        const paramCtx = new MethodParameterTypeContext(paramKey, paramName, paramType, [], false, methodCtx);
                        methodCtx.parameters.push(paramCtx);
                    }

                    ctx.methods[methodCtx.key] = methodCtx;
                }

                dict[ctx.key] = ctx;
            }

            for (const intf of sourceFile.getInterfaces()) {
                const name = intf.getName() || "anonymous_interface";
                const key = `${relativePath}/interface/${name}`;
                const ctx = new ClassOrInterfaceTypeContext(key, name, "interface", relativePath);
                ctx.modifiers = [];

                for (const prop of intf.getProperties()) {
                    const propName = prop.getName();
                    const fieldKey = propName;
                    const typeText = prop.getType().getText();
                    const field = new MemberFieldParameterTypeContext(fieldKey, propName, typeText, [], false, ctx);
                    ctx.fields[field.key] = field;
                }

                dict[ctx.key] = ctx;
            }

        }

        return dict;
    }
}
