import { ParserInterface } from "./ParserInterface";
import {
    createParser,
    ModelParsingOption,
    InterfaceInfo,
    ContentInfo,
    ComplexSchemaInfo,
    PropertyInfo
} from "@azure/dtdl-parser";
import fs from "fs/promises";
import path from "path";
import {ParserBase} from "./ParserBase";
import {ClassOrInterfaceTypeContext, MemberFieldParameterTypeContext} from "../ParsedAstTypes";

export class ParserHelperDigitalTwinsDefinitionLanguage extends ParserBase {
    constructor() {
        super();
    }

    async parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>> {
        let dictOfClassesOrInterfaces: Map<string, ClassOrInterfaceTypeContext> = new Map<string, ClassOrInterfaceTypeContext>();

        console.log("Parsing source to AST for Digital Twins Definition Language");

        console.log(`Loading JSON model contents from ${path_to_source_folder}`);
        const jsonFilePaths = await this.searchForJsonFiles(path_to_source_folder);
        console.log(`Loaded ${jsonFilePaths.length} JSON model contents which need to be verified`);
        let verifiedModelFilePaths: string[] = [];
        const verifiedModelFileContents: string[] = [];

        const verifier = createParser(ModelParsingOption.PermitAnyTopLevelElement);
        for (const jsonFilePath of jsonFilePaths) {
            try {
                const jsonFileContent = await fs.readFile(jsonFilePath, 'utf-8');
                const parsedModel = await verifier.parse([jsonFileContent]);
                if (parsedModel) {
                    //console.log(`Model content is valid JSON: ${jsonFilePath}`);
                    verifiedModelFilePaths.push(jsonFilePath);
                    verifiedModelFileContents.push(jsonFileContent);
                } else {
                    console.log("Model content is not valid DTDL file: " + jsonFilePath);
                }
            } catch (error) {
                console.error("Error parsing JSON model content:", error);
            }
        }

        console.log("Parser created");
        console.log("Parsing models...");
        const parser = createParser(ModelParsingOption.PermitAnyTopLevelElement);
        const parsedModels = await parser.parse(verifiedModelFileContents);
        console.log("Models parsed");

        console.log("Generating AST");
        //console.log(JSON.stringify(Object.keys(parsedModels), null, 2));

        // Nur DTDL-Modelle mit Typ Interface extrahieren

        // https://learn.microsoft.com/de-de/azure/digital-twins/concepts-models
        const interfaceModels = Object.entries(parsedModels)
            .filter(([_, entity]) => {
                if(!!entity){
                    const id = entity.id;
                    //console.log(`Model ID: ${id}`);

                    const type = entity.entityKind;
                    const displayNameObject = entity.displayName;
                    const defaultLanguage = "en";
                    const displayName = displayNameObject?.[defaultLanguage];

                    const isInterface = type === "interface";

                    if (isInterface) {
                        const interfaceInfo = entity as InterfaceInfo;

                        console.log(`Model ID: ${id}`);
                        console.log(`Model Type: ${type}`);
                        console.log(`LanguageVersion: ${interfaceInfo.languageVersion}`);
                        console.log(`Model Display Name: ${displayName}`);
                        console.log(`Model extends: ${interfaceInfo.extends}`);

                        let classOrInterface: ClassOrInterfaceTypeContext = new ClassOrInterfaceTypeContext(id, displayName, type, id);

                        // Properties
                        //console.log(interfaceInfo.supplementalProperties); // Alle leer
                        //console.log(interfaceInfo.supplementalTypeIds); // Alle leer
                        //console.log(interfaceInfo.supplementalTypes); // Alle leer
                        //console.log(interfaceInfo.undefinedProperties); // Alle leer

                        const contents: Record<string,  ContentInfo> | undefined = interfaceInfo.contents;
                        console.log("Model contents:");
                        if (contents) {
                            Object.entries(contents).forEach(([key, content]) => {
                                //console.log(`  Content Key: ${key}`);
                                const contentType = content.entityKind;
                                //console.log(`  Content Type: ${contentType}`);

                                // https://learn.microsoft.com/de-de/azure/digital-twins/concepts-models#model-attributes
                                if(contentType==="property"){
                                    const propertyContent = content as PropertyInfo;

                                    // Properties are data fields, which show the state of the entity
                                    // https://learn.microsoft.com/de-de/azure/digital-twins/concepts-models#properties
                                    const propertyName = propertyContent.name;
                                    const propertyId = propertyContent.id;

                                    //console.log(JSON.stringify(propertyContent, null, 2));
                                    const propertyType = propertyContent.schema?.entityKind;

                                    console.log(` - Property Name: ${propertyName} Type: ${propertyType}`);
                                    const field: MemberFieldParameterTypeContext = new MemberFieldParameterTypeContext(propertyId, propertyName, propertyType, [], false, classOrInterface)
                                    classOrInterface.fields[propertyId] = field;

                                }
                                if(contentType==="relationship"){
                                    // https://learn.microsoft.com/de-de/azure/digital-twins/concepts-models#relationships
                                    // Relationships are links between entities in the digital twins. Can have things like "contains". A "floor" can contain "rooms"
                                    // or an "airconditioner" can "cool" a "room"
                                    // or a "compresor" is "isBilledTo" a "customer"
                                }
                                if(contentType==="component"){
                                    // https://learn.microsoft.com/de-de/azure/digital-twins/concepts-models#components
                                    // example: "room" can have a component "thermostat".

                                    // components define a kind of inteface which can combine multiple models which can be then used.
                                    // example would for a definition of a smartphone we can have a component "camera" which can be used in multiple models
                                    // the component defines a frontCamera and a backCamera. The model can then use the component and define the values for the frontCamera and backCamera
                                }
                            });

                            console.log("Model save to dict");
                            dictOfClassesOrInterfaces[id] = classOrInterface;
                        } else {

                        }



                        console.log("---");
                    }

                    return isInterface;
                    //return type === "Interface" || (Array.isArray(type) && type.includes("Interface"));
                } else {
                    //console.log("Model is undefined or null");
                    return false;
                }
            })
            .map(([dtmi]) => dtmi);

        console.log("Gefundene DTDL-Modelle (Interfaces):", interfaceModels);

        console.log("Dict of classes or interfaces key-value pairs:");
        console.log(Object.keys(dictOfClassesOrInterfaces));

        //throw new Error("Not implemented yet");
        return dictOfClassesOrInterfaces;
    }

    private async searchForJsonFiles(dir: string): Promise<string[]> {
        const files = await this.walkDir(dir);
        const jsonFiles = files.filter(file => file.endsWith('.json'))
        console.log("Found JSON files:");
        return jsonFiles;
    }

    private async walkDir(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const paths: string[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                paths.push(...(await this.walkDir(fullPath)));
            } else if (entry.isFile()) {
                paths.push(fullPath);
            }
        }

        return paths;
    }
}
