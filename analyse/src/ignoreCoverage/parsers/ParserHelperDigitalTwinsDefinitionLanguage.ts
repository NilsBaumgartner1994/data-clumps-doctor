import {ContentInfo, createParser, InterfaceInfo, ModelParsingOption, PropertyInfo,} from "@azure/dtdl-parser";
import fs from "fs/promises";
import path from "path";
import {ParserBase} from "./ParserBase";
import {
    ClassOrInterfaceTypeContext,
    MemberFieldParameterTypeContext,
    MethodParameterTypeContext,
    MethodTypeContext
} from "../ParsedAstTypes";

export class ParserHelperDigitalTwinsDefinitionLanguage extends ParserBase {
    constructor() {
        super();
    }

    async parseSourceToDictOfClassesOrInterfaces(
        path_to_source_folder: string
    ): Promise<Map<string, ClassOrInterfaceTypeContext>> {
        return await this.parseSourceToDictOfClassesOrInterfacesAzure(path_to_source_folder);
    }

    private createDummyDisplayName(dtmi: string): string {
        // Select a shorter value for 'displayName' or trim current value to fewer than 64 characters
        let defaultDummyName = `Dummy Schema for ${dtmi}`
        if (defaultDummyName.length > 64) {
            defaultDummyName = defaultDummyName.substring(0, 61) + "...";
        }
        return defaultDummyName;
    }

    private createDummy(dtmi: string, usage: "interface" | "schema" = "interface"): any {
        const displayName = this.createDummyDisplayName(dtmi);
        if (usage === "schema") {
            return {
                "@id": dtmi,
                "@type": "Enum",
                "valueSchema": "string",
                "enumValues": [
                    { "name": "Unknown", "enumValue": "unknown" }
                ],
                "displayName": { "en": displayName },
                "@context": ["dtmi:dtdl:context;3"]
            };
        } else {
            return {
                "@id": dtmi,
                "@type": "Interface",
                "displayName": { "en": displayName },
                "contents": [],
                "@context": ["dtmi:dtdl:context;3"]
            };
        }
    }

    private normalizeDescriptions(obj: any): any {
        // ... property 'description' with language code 'en' has value [...] which is not a JSON string.

        if (Array.isArray(obj)) {
            return obj.map(x => this.normalizeDescriptions(x));
        } else if (typeof obj === "object" && obj !== null) {
            const newObj: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key === "description" && value && typeof value === "object") {
                    const fixed: any = {};
                    for (const [lang, v] of Object.entries(value as Record<string, unknown>)) {
                        if (Array.isArray(v)) {
                            fixed[lang] = v.join(" ");
                        } else {
                            fixed[lang] = v;
                        }
                    }
                    newObj[key] = fixed;
                    continue;
                }
                newObj[key] = this.normalizeDescriptions(value);
            }
            return newObj;
        }
        return obj;
    }

    cleanJson(text: string): string {
        const ByteOrderMark = "\uFEFF"; // Some editors add BOM to start of file which breaks JSON.parse
        const stringsToRemove = [ByteOrderMark];
        let result = text;
        for (const str of stringsToRemove) {
            const regex = new RegExp(str, "g"); // alle Vorkommen
            result = result.replace(regex, "");
        }
        return result;
    }

    async parseAndFix(allModelTexts: string[], parser: any): Promise<Record<string, any>> {
        try {
            return await parser.parse(allModelTexts);
        } catch (e: any) {
            // 1) Fehlende Modelle (ResolutionError)
            if (e.name === "ResolutionError" && e._undefinedIdentifiers) {
                console.warn("⚠️ Missing models, creating dummies:", e._undefinedIdentifiers);
                const fixedTexts = this.parseAndFixMissingModels(allModelTexts, e._undefinedIdentifiers);
                return this.parseAndFix(fixedTexts, parser);
            }

            // 2) Fehlendes @context
            if (e._parsingErrors?.some((err: any) => err.validationId === "dtmi:dtdl:parsingError:missingContext")) {
                console.warn("⚠️ Missing @context, adding defaults");
                const fixedTexts = this.parseAndFixMissingContext(allModelTexts);
                return this.parseAndFix(fixedTexts, parser);
            }

            // 3) Fehlendes @id
            if (e._parsingErrors?.some((err: any) => err.validationId === "dtmi:dtdl:parsingError:missingTopLevelId")) {
                console.warn("⚠️ Missing @id, generating dummies");
                const fixedTexts = this.parseAndFixMissingId(allModelTexts);
                return this.parseAndFix(fixedTexts, parser);
            }

            // sonst nicht behandelbar → throw
            console.error("❌ Unhandled parsing error:", e);
            throw e;
        }
    }

    private generateValidDtmi(base: string, counter: number): string {
        // Nur Buchstaben, Zahlen, Unterstriche erlaubt
        const safeBase = base.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        return `dtmi:dummy:${safeBase}_${counter};1`;
    }

    private removeUnsupportedProperties(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(x => this.removeUnsupportedProperties(x));
        } else if (typeof obj === "object" && obj !== null) {
            const newObj: any = {};
            for (const [key, value] of Object.entries(obj)) {
                // ⚠️ Bekannte Nicht-DTDL-Felder ignorieren
                if (key === "recommendations" || key.startsWith("cSpell")) continue;

                // Rekursiv weiter
                newObj[key] = this.removeUnsupportedProperties(value);
            }
            return newObj;
        }
        return obj;
    }

    private parseAndFixMissingId(allModelTexts: string[]): string[] {
        const fixed: string[] = [];
        let counter = 0;

        for (const text of allModelTexts) {
            try {
                const json = JSON.parse(text);
                if (!json["@id"]) {
                    counter++;
                    // Generiere Dummy-DTMI
                    json["@id"] = this.generateValidDtmi("autogen", counter);
                    if (!json["@type"]) {
                        json["@type"] = "Interface"; // minimal gültig
                    }
                    if (!json["@context"]) {
                        json["@context"] = ["dtmi:dtdl:context;3"];
                    }
                }
                fixed.push(JSON.stringify(json));
            } catch {
                fixed.push(text);
            }
        }

        return fixed;
    }

    private parseAndFixMissingModels(allModelTexts: string[], missingIds: string[]): string[] {
        const fixed = [...allModelTexts];
        for (const missingDtmi of missingIds) {
            if (missingDtmi.includes("Unit")) {
                fixed.push(JSON.stringify(this.createDummy(missingDtmi, "schema")));
            } else {
                fixed.push(JSON.stringify(this.createDummy(missingDtmi, "interface")));
            }
        }
        return fixed;
    }

    private parseAndFixMissingContext(allModelTexts: string[]): string[] {
        const fixed: string[] = [];
        for (const text of allModelTexts) {
            try {
                const json = JSON.parse(text);
                if (!json["@context"]) {
                    json["@context"] = ["dtmi:dtdl:context;3"];
                }
                fixed.push(JSON.stringify(json));
            } catch {
                fixed.push(text);
            }
        }
        return fixed;
    }


    async parseSourceToDictOfClassesOrInterfacesAzure(
        path_to_source_folder: string
    ): Promise<Map<string, ClassOrInterfaceTypeContext>> {
        const dictOfClassesOrInterfaces = new Map<string, ClassOrInterfaceTypeContext>();

        console.log("Parsing source to AST for Digital Twins Definition Language");
        console.log(`Loading JSON model contents from ${path_to_source_folder}`);

        const jsonFilePaths = await this.searchForModelFiles(path_to_source_folder);
        console.log(`Found ${jsonFilePaths.length} potential DTDL files`);

        // 1) Alle Dateien laden + DTMI→Text indexieren (für Resolver)
        const allModelTexts: string[] = [];

        function tryJsonParse(text: string, file: string): boolean {
            try { JSON.parse(text); return true; }
            catch (e: any) {
                const m = /position (\d+)/.exec(e.message || "");
                const pos = m ? Number(m[1]) : 0;
                const pre = text.slice(0, pos);
                const line = pre.split("\n").length;
                const col  = pre.length - pre.lastIndexOf("\n");
                //console.error(`❌ JSON-Syntaxfehler in ${file} bei ${line}:${col}: ${e.message}`);
                //console.error(text.slice(Math.max(0, pos-60), pos+60));
                return false;
            }
        }

        const mapDtmiIdToFilePath = new Map<string, string>();
        const mapDtmiIdToRawJson = new Map<string, any>();

        for (const filePath of jsonFilePaths) {
            try {
                const textRaw = await fs.readFile(filePath, "utf-8");
                const text = this.cleanJson(textRaw);
                if (!tryJsonParse(text, filePath)) continue;

                // JSON parsen
                const json = JSON.parse(text);

                // 🔧 normalize Descriptions hier aufrufen
                const normalized = this.normalizeDescriptions(json);
                const cleaned = this.removeUnsupportedProperties(normalized);
                //console.log("Cleaned JSON:", cleaned);
                const relativePath = path.relative(path_to_source_folder, filePath);
                // ID merken
                const dtmi = cleaned["@id"];
                if (dtmi && typeof dtmi === "string") {
                    if (mapDtmiIdToFilePath.has(dtmi)) {
                        console.warn(`⚠️ Duplicate @id ${dtmi} in files:\n - ${mapDtmiIdToFilePath.get(dtmi)}\n - ${relativePath}`);
                    } else {
                        //console.log("Model ID "+ dtmi + " from file " + relativePath);
                        mapDtmiIdToFilePath.set(dtmi, relativePath);
                        mapDtmiIdToRawJson.set(dtmi, cleaned);
                    }
                } else {
                    console.warn(`⚠️ No valid @id in ${relativePath}`);
                }

                allModelTexts.push(JSON.stringify(cleaned));
            } catch (e: any) {
                console.warn(`⚠️ Could not read ${filePath}:`, e);
            }
        }

        // 2) Parser mit PermitAnyTopLevelElement erstellen
        const parser = createParser(
            ModelParsingOption.PermitAnyTopLevelElement
        );

        const parsedModels = await this.parseAndFix(allModelTexts, parser);

        // 3) Alle Modelle in einem Rutsch parsen
        console.log("Parsing models…");


        // 5) Nur Interfaces extrahieren und in AST-Struktur überführen
        console.log("Generating AST");
        const interfaceIds: string[] = [];

        for (const [_, entity] of Object.entries(parsedModels)) {
            if (!entity) continue;

            const type = entity.entityKind;
            if (type !== "interface") continue;

            //console.log("Entity entityKind: ", entity.entityKind);
            //console.log("Entity id: ", entity.id);

            const interfaceInfo = entity as InterfaceInfo;
            const id = interfaceInfo.id;
            interfaceIds.push(id);

            const displayName = this.getDisplayName(interfaceInfo);

            let usedFilePath = mapDtmiIdToFilePath.get(id) || id;

            const classOrInterface = new ClassOrInterfaceTypeContext(
                id,
                displayName,
                type,
                usedFilePath
            );

            this.setFieldsFromPropertyInfo(interfaceInfo, classOrInterface, mapDtmiIdToRawJson);
            this.setMethodsFromOperationInfo(interfaceInfo, classOrInterface, mapDtmiIdToRawJson)
            this.setExtendsFromInterfaceInfo(interfaceInfo, classOrInterface);
            this.setImplementsFromInterfaceInfo(interfaceInfo, classOrInterface, mapDtmiIdToRawJson);

            dictOfClassesOrInterfaces.set(id, classOrInterface);
            //console.log("---");
        }


        console.log("Gefundene DTDL-Modelle (Interfaces):", interfaceIds.length);
        //console.log("DictOfClassesOrInterfaces keys: ",dictOfClassesOrInterfaces.keys())

        return dictOfClassesOrInterfaces;
    }

    private setExtendsFromInterfaceInfo(interfaceInfo: InterfaceInfo, classOrInterface: ClassOrInterfaceTypeContext) {
        if( interfaceInfo.extends ) {
            if (Array.isArray(interfaceInfo.extends)) {
                for (const ext of interfaceInfo.extends) {
                    if (typeof ext === "string") {
                        classOrInterface.extends_.push(ext);
                    } else if (ext && typeof ext === "object" && ext.id) {
                        classOrInterface.extends_.push(ext.id);
                    }
                }
            } else if (typeof interfaceInfo.extends === "string") {
                classOrInterface.extends_.push(interfaceInfo.extends);
            }
        }
    }

    private getPropertiesWhichDefineImplements(): string[] {
        return ["definedBy", "specifiedBy"];
    }

    private setImplementsFromInterfaceInfo(interfaceInfo: InterfaceInfo, classOrInterface: ClassOrInterfaceTypeContext, mapDtmiIdToRawJson: Map<string, any>) {
        // DTDL hat kein "implements", sondern "extends" für Interfaces
        // Diese Methode ist hier nur der Vollständigkeit halber
        // Wir schauen uns aber die "definedBy" Relationships an, die oft wie "implements" wirken
        // Diese Logik ist in setFieldsFromPropertyInfo implementiert

        const raw = mapDtmiIdToRawJson.get(interfaceInfo.id);
        const contentsFromRaw = raw?.contents || [];

        for (const content of contentsFromRaw) {
            switch (content["@type"]) {
                case "Relationship": {
                    const relName = content.name;
                    if (this.getPropertiesWhichDefineImplements().includes(relName)) {
                        const target = content.target || "unknown";
                        if (!classOrInterface.implements_.includes(target)) {
                            classOrInterface.implements_.push(target);
                            //console.log(`  - implements ${target} (from definedBy)`);
                        }
                    }
                }
            }
        }
    }

    private setMethodsFromOperationInfo(interfaceInfo: InterfaceInfo, classOrInterface: ClassOrInterfaceTypeContext, mapDtmiIdToRawJson: Map<string, any>) {
        const raw = mapDtmiIdToRawJson.get(interfaceInfo.id);
        const contentsFromRaw = raw?.contents || [];

        // got any operations/commands?
        let hasCommands = contentsFromRaw.some((c: any) => c["@type"] === "Command");
        if(hasCommands){
            console.log(`Interface ${interfaceInfo.id} has commands:`);
        }

        for (const content of contentsFromRaw) {
            switch (content["@type"]) {
                case "Command": {
                    const cmdName = content.name;
                    const cmdId = content["@id"] || `${interfaceInfo.id}#${cmdName}`;

                    // Request-Parameter sammeln
                    const parameters: MethodParameterTypeContext[] = [];
                    if (content.request) {
                        const requestName = content.request.name || "param";
                        const schema = content.request.schema;
                        let paramType = "unknown";
                        if (typeof schema === "string") {
                            paramType = schema;
                        } else if (schema && typeof schema === "object") {
                            paramType = schema["@id"] || schema["@type"] || "unknown";
                        }

                        const param = new MethodParameterTypeContext(
                            requestName,
                            requestName,
                            paramType,
                            [],       // keine Modifier bei DTDL
                            false,
                            null as any // wir hängen den MethodKey gleich unten an
                        );
                        parameters.push(param);
                    }

                    // Response bestimmen
                    let responseType: string | undefined = "void";
                    if (content.response) {
                        const schema = content.response.schema;
                        if (typeof schema === "string") {
                            responseType = schema;
                        } else if (schema && typeof schema === "object") {
                            responseType = schema["@id"] || schema["@type"] || "unknown";
                        }
                    }

                    console.log(`  - command ${cmdName}(${parameters.map(p => p.type).join(", ")}) : ${responseType}`);

                    // Methode als AST-Knoten anlegen
                    const method = new MethodTypeContext(
                        cmdId,
                        cmdName,
                        "command",        // Typ kannst du fest als "command" oder responseType setzen
                        false,            // overrideAnnotation irrelevant hier
                        classOrInterface
                    );
                    method.returnType = responseType;
                    method.parameters = parameters;

                    // methodKey an die Parameter hängen
                    method.parameters = method.parameters.map(
                        p => new MethodParameterTypeContext(p.name, p.name, p.type, [], false, method)
                    );

                    classOrInterface.methods[cmdId] = method;
                    break;
                }


                default:
                    //console.warn(`⚠️ Unsupported content type: ${content["@type"]}`);
            }
        }
    }

    private setFieldsFromPropertyInfo(interfaceInfo: InterfaceInfo, classOrInterface: ClassOrInterfaceTypeContext, mapDtmiIdToRawJson: Map<string, any>) {
        //console.log(`Interface ${interfaceInfo.id}`);
        /**
         * // Das Problem ist, dass @azure/dtdl-parser gibt dir bei InterfaceInfo.contents immer alle Contents, also auch die geerbten aus extends
        if (contentsFromInterfaceInfo) {
            for (const [key, content] of Object.entries(contentsFromInterfaceInfo)) {
                const contentKind = (content as any).entityKind;

                if (contentKind === "property") {
                    const propertyContent = content as PropertyInfo;

                    const propertyName = propertyContent.name;
                    const propertyId = propertyContent.id;

                    // Schema-Typ robust bestimmen
                    const schema: any = (propertyContent as any).schema;
                    let propertyType: string = "unknown";
                    if (schema) {
                        // Viele SchemaInfos haben entityKind, manche nur id (bei referenzierten Schemas)
                        propertyType = schema.entityKind ?? schema.id ?? "unknown";
                    }

                    console.log(`  - property ${propertyName} :: ${propertyType}`);
                    const field = new MemberFieldParameterTypeContext(
                        propertyId,
                        propertyName,
                        propertyType,
                        [],
                        false,
                        classOrInterface
                    );
                    // Member in dein Objekt eintragen (interne Struktur bleibt bei dir)
                    classOrInterface.fields[propertyId] = field;
                }
            }
        }
        */

        const raw = mapDtmiIdToRawJson.get(interfaceInfo.id);
        const contentsFromRaw = raw?.contents || [];

        for (const content of contentsFromRaw) {
            switch (content["@type"]) {
                case "Property": {
                    const propertyName = content.name;
                    const propertyId = content["@id"] || `${interfaceInfo.id}#${propertyName}`;
                    const schema = content.schema;
                    let propertyType: string = "unknown";

                    if (typeof schema === "string") {
                        propertyType = schema;
                    } else if (schema && typeof schema === "object") {
                        const schemaType = schema["@type"] || schema.entityKind || "unknown";

                        if (schemaType === "Enum" && Array.isArray(schema.enumValues)) {
                            const values = schema.enumValues.map((v: any) => v.enumValue || v.name).filter(Boolean);
                            propertyType = `Enum:[${values.join(",")}]`;
                        } else {
                            propertyType = schema["@id"] || schemaType;
                        }
                    }

                    //console.log(`  - property ${propertyName} :: ${propertyType}`);
                    const field = new MemberFieldParameterTypeContext(
                        propertyId,
                        propertyName,
                        propertyType,
                        [],
                        false,
                        classOrInterface
                    );
                    classOrInterface.fields[propertyId] = field;
                    break;
                }

                case "Relationship": {



                    const relName = content.name;
                    if (this.getPropertiesWhichDefineImplements().includes(relName)) {
                        /**
                         *  definedBy sollten wir ignorieren, da es eigentlich ein "implements" ist
                         *         {
                         *             "@type": "Relationship",
                         *             "name": "definedBy",
                         *             "displayName": "Defined by",
                         *             "description": "The operations event definition that defines the structure and generic context of the operation event message",
                         *             "target": "dtmi:digitaltwins:isa95:OperationsEventDefinition;1",
                         *             "comment": "Mandatory - Cardinality 1",
                         *             "maxMultiplicity": 1
                         *         },
                         */
                        //console.log(`  - relationship ${relName} -> (ignored as 'implements')`);
                        break;
                    }

                    const relId = content["@id"] || `${interfaceInfo.id}#${relName}`;
                    const target = content.target || "unknown";

                    // Als Typ setzen wir eine Liste von IDs
                    const propertyType = "List<"+relId+">";

                    //console.log(`  - relationship ${relName} -> ${target}`);

                    const field = new MemberFieldParameterTypeContext(
                        relId,
                        relName,
                        propertyType,
                        [],       // evtl. zusätzliche Attribute später
                        false,    // ist kein required Flag bisher
                        classOrInterface
                    );

                    classOrInterface.fields[relId] = field;
                    break;
                }

                case "Component": {
                    const compName = content.name;
                    //console.log(`  - component ${compName} :: ${content.schema}`);
                    break;
                }

                default:
                    //console.warn(`⚠️ Unsupported content type: ${content["@type"]}`);
            }
        }
    }

    // --- helpers ---------------------------------------------------------------

    /** Sucht rekursiv nach .json und .jsonld */
    private async searchForModelFiles(dir: string): Promise<string[]> {
        const files = await this.walkDir(dir);
        const modelFiles = files.filter((f) => f.endsWith(".json") || f.endsWith(".jsonld"));
        return modelFiles;
    }

    private async walkDir(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const paths: string[] = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // ⚠️ ignorieren, wenn .vscode oder andere "dot"-Ordner
                if (entry.name === ".vscode" || entry.name.startsWith(".")) {
                    continue;
                }
                paths.push(...(await this.walkDir(fullPath)));
            } else if (entry.isFile()) {
                paths.push(fullPath);
            }
        }
        return paths;
    }

    /** Holt den DisplayName (bevorzugt "en", sonst erstes vorhandenes Sprachlabel) */
    private getDisplayName(entity: any): string | undefined {
        const dn = entity?.displayName;
        if (!dn) return undefined;
        if (typeof dn === "string") return dn;
        // lokalisierte Map
        if (dn["en"]) return dn["en"];
        const firstKey = Object.keys(dn)[0];
        return firstKey ? dn[firstKey] : undefined;
    }
}
