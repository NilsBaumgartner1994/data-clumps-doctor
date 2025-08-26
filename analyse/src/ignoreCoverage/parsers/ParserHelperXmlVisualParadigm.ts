import {SoftwareProjectDicts} from "./../SoftwareProject";

import fs from 'fs';
import path from 'path';
import {
    ClassOrInterfaceTypeContext,
    MemberFieldParameterTypeContext,
    MethodParameterTypeContext,
    MethodTypeContext
} from "./../ParsedAstTypes";
import {ParserBase} from "./ParserBase";
import {ParserInterface} from "./ParserInterface";

const xml2js = require('xml2js');
const parser = new xml2js.Parser();

export class ParserHelperXmlVisualParadigm extends ParserBase implements ParserInterface{

    constructor() {
        super();
    }

    /**
     * Parses XML files in a source folder to create a dictionary of class or interface contexts.
     */
    async parseSourceToDictOfClassesOrInterfaces(path_to_source_folder: string): Promise<Map<string, ClassOrInterfaceTypeContext>> {
        let dictOfClassesOrInterfaces: Map<string, ClassOrInterfaceTypeContext> = await this.parseXMlToDictClassOrInterface(path_to_source_folder);
        return dictOfClassesOrInterfaces;
    }

    /**
     * Parses XML data to JSON and returns a promise.
     */
    private parseXmlToJSON(xmlData): Promise<any> {
        return new Promise((resolve, reject) => {
            parser.parseString(xmlData, (err, result) => {
                if (err) {
                    console.error("Error parsing XML:", err);
                    reject(err);
                } else {
                    console.log("XML parsed successfully");
                    resolve(result);
                }
            });
        });
    }

    private async parseUmlClassOrInterface(dictOfClassesOrInterfaces, ModelChild, RootModelRelationshipContainer){
        //console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++")
        //console.log("parseUmlClassOrInterface")
//    console.log(ModelChild)
//    console.log("----------------")
        let ClassOrInterface = ModelChild;

        let classOrInterfaceName = ClassOrInterface?.["$"]?.Name;
        let Id = ClassOrInterface?.["$"]?.Id;
        let key = Id;

        let isInterface = false;

        /**
         <Stereotypes>
         <Stereotype Idref="tIkllVGGAqFkIwpZ" Name="Interface"/>
         </Stereotypes>
         */
        let Stereotypes = ClassOrInterface?.Stereotypes;
        if(Stereotypes){
            let Stereotype = Stereotypes[0].Stereotype;
            if(Stereotype){
                let StereotypeName = Stereotype[0]["$"].Name;
                if(StereotypeName === "Interface"){
                    isInterface = true;
                }
            }
        }


        const type = isInterface ? "interface" : "class";
        const path = "";

        let classOrInterface = new ClassOrInterfaceTypeContext(key, classOrInterfaceName, type, path);


        classOrInterface.modifiers = [];

        let visibility = ClassOrInterface?.["$"]?.Visibility;
        if(visibility){
            // "public" -> "PUBLIC"
            let visibilityCapsLock = visibility.toUpperCase();
            classOrInterface.modifiers.push(visibilityCapsLock);
        }

        let isAbstract = ClassOrInterface?.["$"]?.Abstract === "true";
        if(isAbstract){
            classOrInterface.modifiers.push("ABSTRACT");
        }

        let isFinalSpecialization = ClassOrInterface?.["$"]?.FinalSpecialization === "true";
        if(isFinalSpecialization){
            // "true" -> "FINAL"
            classOrInterface.modifiers.push("FINAL");
        }

        //console.log("classOrInterface", classOrInterface)

        dictOfClassesOrInterfaces[classOrInterface.key] = classOrInterface;

        //console.log("ModelChildrenAttributes")
        // Check if class or interface has attributes:
        let ModelChildrenAttributes = ClassOrInterface?.ModelChildren?.[0]?.Attribute;
        //console.log(ModelChildrenAttributes)

        if(ModelChildrenAttributes){
            for(let i=0; i<ModelChildrenAttributes.length; i++){
                let fieldModifiers: any[] = [];

                let ModelChildAttribute = ModelChildrenAttributes[i];
                let fieldScope = ModelChildAttribute["$"].Scope;
                let fieldName = ModelChildAttribute["$"].Name;
                let fieldType: any = null;


                let simpleFieldType = ModelChildAttribute["$"].Type;
                if(simpleFieldType){
                    fieldType = simpleFieldType;
                }

                // <Attribute Abstract="false" Aggregation="None" AllowEmptyName="false" BacklogActivityId="0" ConnectToCodeModel="1" Derived="false" DerivedUnion="false" Documentation_plain="" HasGetter="false" HasSetter="false" Id="HqBb5VGGAqFkIwW8" IsID="false" Leaf="false" Multiplicity="Unspecified" Name="description" PmAuthor="" PmCreateDateTime="2017-06-21T18:49:15.848" PmLastModified="2023-09-18T12:33:18.094" QualityReason_IsNull="true" QualityScore="-1" ReadOnly="false" Scope="instance" Type="String" TypeModifier="" UserIDLastNumericValue="0" UserID_IsNull="true" Visibility="private" Visible="true"/>

                let fieldTypeObject = ModelChildAttribute?.Type;
                if(fieldTypeObject){
                    /**
                     <Attribute Abstract="false" Aggregation="None" AllowEmptyName="false" BacklogActivityId="0" ConnectToCodeModel="1" Derived="false" DerivedUnion="false" Documentation_plain="" HasGetter="false" HasSetter="false" Id="bqBb5VGGAqFkIwW7" IsID="false" Leaf="false" Multiplicity="Unspecified" Name="weight" PmAuthor="" PmCreateDateTime="2017-06-21T18:49:09.311" PmLastModified="2023-09-18T12:33:18.094" QualityReason_IsNull="true" QualityScore="-1" ReadOnly="false" Scope="instance" TypeModifier="" UserIDLastNumericValue="0" UserID_IsNull="true" Visibility="private" Visible="true">
                     <Type>
                     <DataType Idref="7RCb5VGGAqFkIwBU" Name="float"/>
                     </Type>
                     </Attribute>
                     */
                    let explicitType = fieldTypeObject[0]?.DataType?.[0]?.["$"].Name;
                    if(explicitType){
                        fieldType = explicitType;
                        // TODO: maybe check Idref if it is a reference to another class or interface?

                    }

                }


                let fieldVisibility: any = ModelChildAttribute["$"].Visibility;
                if(fieldVisibility){
                    fieldVisibility = fieldVisibility.toUpperCase();
                    fieldModifiers.push(fieldVisibility);
                }

                let fieldTypeModifier: any = ModelChildAttribute["$"].TypeModifier;
                if(fieldTypeModifier && fieldTypeModifier !== ""){
                    fieldModifiers.push(fieldTypeModifier);
                }

                let fieldId = ModelChildAttribute["$"].Id;
                let fieldKey = fieldId;

                let ignore = false;


                classOrInterface.fields[fieldKey] = new MemberFieldParameterTypeContext(fieldKey, fieldName, fieldType, fieldModifiers, ignore, classOrInterface);

                //       await parseUmlAttribute(classOrInterface, ModelChildAttribute);
            }
        }

        //console.log("ModelChildrenMethods")

        // Check if class or interface has methods:
        let ModelChildrenMethods = ClassOrInterface?.ModelChildren?.[0]?.Operation;
        //console.log(ModelChildrenMethods)

        if(ModelChildrenMethods){
            for(let i=0; i<ModelChildrenMethods.length; i++){
                let ModelChildMethod = ModelChildrenMethods[i];
                let methodModifiers: any[] = [];

                let methodKey = ModelChildMethod["$"].Id;
                let methodScope = ModelChildMethod["$"].Scope;
                let methodName = ModelChildMethod["$"].Name;
                let methodType: any = null;

                let methodTypeObject = ModelChildMethod?.ReturnType;
                if(methodTypeObject){
                    let explicitType = methodTypeObject[0]?.DataType?.[0]?.["$"].Name;
                    if(explicitType){
                        methodType = explicitType;
                    }
                }

                let methodVisibility: any = ModelChildMethod["$"].Visibility;
                if(methodVisibility){
                    methodVisibility = methodVisibility.toUpperCase();
                    methodModifiers.push(methodVisibility);
                }
                let overrideAnnotation = false;

                let methodTypeContext = new MethodTypeContext(methodKey, methodName, methodType, overrideAnnotation, classOrInterface);

                let parameters: MethodParameterTypeContext[] = [];
                let parameterObjects = ModelChildMethod?.ModelChildren?.[0]?.Parameter;
                if(parameterObjects){
                    //console.log("parameterObjects")
                    //console.log(parameterObjects)
                    for(let j=0; j<parameterObjects.length; j++){
                        let parameterObject = parameterObjects[j];
                        let parameterName = parameterObject["$"].Name;
                        let parameterType = null;

                        let parameterSimpleType = parameterObject["$"].Type;
                        if(parameterSimpleType){
                            parameterType = parameterSimpleType;
                        }

                        let parameterTypeObject = parameterObject?.Type;
                        if(parameterTypeObject){

                            let explicitType = parameterTypeObject[0]?.DataType?.[0]?.["$"].Name;
                            if(explicitType){
                                parameterType = explicitType;
                                // TODO: maybe check Idref if it is a reference to another class or interface?

                            }

                        }

                        let parameterModifiers: any[] = [];

                        let parameterKey = parameterObject["$"].Id;

                        let ignore = false;
                        let parameter = new MethodParameterTypeContext(parameterKey, parameterName, parameterType, parameterModifiers, ignore, methodTypeContext)
                        parameters.push(parameter);
                    }
                }

                methodTypeContext.parameters = parameters;

                classOrInterface.methods[methodKey] = methodTypeContext;


//            await parseUmlMethod(classOrInterface, ModelChildMethod);
            }
        }


        let ModelRelationshipContainer_ModelChildren = RootModelRelationshipContainer?.[0].ModelChildren;
        let ModelRelationshipContainers = ModelRelationshipContainer_ModelChildren?.[0].ModelRelationshipContainer;
        if(ModelRelationshipContainers){
            for(let i=0; i<ModelRelationshipContainers.length; i++){
                let ModelRelationshipContainer = ModelRelationshipContainers[i];
//        console.log("ModelRelationshipContainer")
//        console.log(ModelRelationshipContainer)
//        console.log("----------------")
                let RelationshipModelChildren = ModelRelationshipContainer.ModelChildren;
                let Generalizations = RelationshipModelChildren[0].Generalization;
                if(Generalizations){
                    //console.log("Generalizations")
                    //console.log(Generalizations)
                    for(let j=0; j<Generalizations.length; j++){
                        let Generalization = Generalizations[j];
                        //console.log("Generalization")
                        //console.log(Generalization)

                        let From = Generalization["$"].From;
                        let To = Generalization["$"].To;
                        if(To === Id){
                            classOrInterface.extends_.push(From)
                        }
                    }
                }

                //console.log("RelationshipModelChildren")
                //console.log(RelationshipModelChildren)
                let Realizations = RelationshipModelChildren[0].Realization;
                if(Realizations){
                    //console.log("Realizations")
                    //console.log(Realizations)
                    for(let j=0; j<Realizations.length; j++){
                        let Realization = Realizations[j];
                        let From = Realization["$"].From;
                        let To = Realization["$"].To;
                        if(To === Id){
                            classOrInterface.implements_.push(From)
                        }
                    }
                }
            }
        }

        //console.log("classOrInterface")
        //console.log(classOrInterface)

        //console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++")
    }

    private async parseParsedXmlDataToDictClassesOrInterfaces(parsedXMLDataToJSON){

        let dictOfClassesOrInterfaces: Map<string, ClassOrInterfaceTypeContext> = new Map<string, ClassOrInterfaceTypeContext>();

        // Step 3
        console.log("1")
        console.log("parsedXMLDataToJSON.Project.Models")

        let Model: any = undefined;

        // If there is a model inside a model, then use that one
        if(parsedXMLDataToJSON.Project.Models?.[0]?.Model?.[0].ModelChildren?.[0]?.Class){
            Model = parsedXMLDataToJSON.Project.Models?.[0]?.Model?.[0].ModelChildren?.[0];
        }
        // otherwise use the first model
        else if(parsedXMLDataToJSON.Project.Models?.[0].Class){
            Model = parsedXMLDataToJSON.Project.Models[0];
        }

        console.log(Model)
        console.log("2")
        const ModelChildrenClasses = Model.Class;

        const ModelRelationshipContainer = Model.ModelRelationshipContainer;

        if(ModelChildrenClasses && ModelChildrenClasses.length > 0){
            for(let i=0; i<ModelChildrenClasses.length; i++){
                let ModelChild = ModelChildrenClasses[i];
                await this.parseUmlClassOrInterface(dictOfClassesOrInterfaces, ModelChild, ModelRelationshipContainer);
            }
        }


        return dictOfClassesOrInterfaces;
    }

    static async getDictClassOrInterfaceFromParsedAstFolder(path_to_folder_of_parsed_ast){
        let softwareProjectDicts: SoftwareProjectDicts = new SoftwareProjectDicts();
        console.log("Started loading ASTs")
        console.log("path_to_folder_of_parsed_ast", path_to_folder_of_parsed_ast)

        let filesAndFoldersInPath = fs.readdirSync(path_to_folder_of_parsed_ast, { withFileTypes: true });
        for (let fileOrFolder of filesAndFoldersInPath) {
            let fullPath = path.join(path_to_folder_of_parsed_ast, fileOrFolder.name);
            if (fileOrFolder.isDirectory()) {
                continue;
            } else {
                let fileContent = fs.readFileSync(fullPath, 'utf-8');
                const loadedJsonData: any = JSON.parse(fileContent); // Parse the JSON data
                const classOrInterfaceTypeContext: ClassOrInterfaceTypeContext = ClassOrInterfaceTypeContext.fromObject(loadedJsonData);
                softwareProjectDicts.loadClassOrInterface(classOrInterfaceTypeContext);
            }
        }

        return softwareProjectDicts
    }

    private async parseXMlToDictClassOrInterface(path_to_xml_file: string){
        const xmlData = fs.readFileSync(path_to_xml_file, 'utf8');

        // Parse XML to JSON
        let parsedXMLDataToJSON = await this.parseXmlToJSON(xmlData);
        console.log("parsedXMLDataToJSON")
        console.log(parsedXMLDataToJSON)

        let dictOfClassesOrInterfaces = await this.parseParsedXmlDataToDictClassesOrInterfaces(parsedXMLDataToJSON);
        return dictOfClassesOrInterfaces;
    }


}
