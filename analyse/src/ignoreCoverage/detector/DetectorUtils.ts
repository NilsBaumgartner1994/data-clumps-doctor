import {Dictionary} from "../UtilTypes";
import {DataClumpsVariableFromContext, DataClumpsVariableToContext,} from "data-clumps-type-context";
import {MemberFieldParameterTypeContext, MethodParameterTypeContext, VariableTypeContext} from "../ParsedAstTypes";
import {DetectorOptions} from "./Detector";

type ParameterPair = {
    parameterKey: string;
    otherParameterKey: string;
    probability: number | null;
}

export type ProbabilityContext = {
    currentClassWholeHierarchyKnown: boolean,
    otherClassWholeHierarchyKnown: boolean,
    parameterPairs: ParameterPair[],
    options: DetectorOptions
}

export class DetectorUtils {

    public static isIgnoredVariableName(variableName: string, options: DetectorOptions){
        let ignoreVariableNames = options.ignoredVariableNames.map(name => name.toLowerCase().trim());
        return ignoreVariableNames.includes(variableName.toLowerCase().trim());
    }

    public static cleanVariables(variables: VariableTypeContext[], options: DetectorOptions){
        let cleanedVariables: VariableTypeContext[] = [];
        for(let variable of variables){
            if(!DetectorUtils.isIgnoredVariableName(variable.name, options)){
                cleanedVariables.push(variable);
            }
        }
        return cleanedVariables;
    }

    public static sanitizeProjectName(projectName: string){
        // Remove any character that is not a letter, number, hyphen, or underscore
        let sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
        // If the project name starts with a number, prepend an underscore
        if(/^[0-9]/.test(sanitizedProjectName)){
            sanitizedProjectName = '_' + sanitizedProjectName;
        }
        return sanitizedProjectName;
    }

    public static checkIfIncompatibleOptions(options: DetectorOptions){
        // fast Detection cannot be used with similarityModifierOfVariablesWithUnknownType > 0
        if(options.fastDetection){
            if(options.similarityModifierOfVariablesWithUnknownType > 0){
                if(options.similarityModifierOfVariablesWithUnknownType!==1){
                    console.error("Fast detection is enabled, but similarityModifierOfVariablesWithUnknownType is not 1. This is not allowed. Please set similarityModifierOfVariablesWithUnknownType to 1 or disable fast detection.");
                    throw new Error("Fast detection is enabled, but similarityModifierOfVariablesWithUnknownType is not 1. This is not allowed. Please set similarityModifierOfVariablesWithUnknownType to 1 or disable fast detection.");
                }
            }
        }
    }

    private static calculateProbabilityOfDataClumps(currentProbabilityModifier: number, otherProbabilityModifier: number, parameterPairs: ParameterPair[]){
        let modifierCurrentClassKnown = currentProbabilityModifier
        let modifierOtherClassKnown = otherProbabilityModifier

        let averageParameterSimilarity = 0;
        let amountCommonParameters = parameterPairs.length;
        if(amountCommonParameters > 0){
            let sumOfParameterSimilarities = 0;
            for(let parameterPair of parameterPairs){
                if(parameterPair.probability){
                    sumOfParameterSimilarities += parameterPair.probability;
                }
            }
            averageParameterSimilarity = sumOfParameterSimilarities / amountCommonParameters;
        }

        let probabilityOfDataClumps = modifierCurrentClassKnown * modifierOtherClassKnown * averageParameterSimilarity;
        return probabilityOfDataClumps;
    }

    public static calculateProbabilityOfDataClumpsFields(probabilityContext: ProbabilityContext){
        const {currentClassWholeHierarchyKnown, otherClassWholeHierarchyKnown, parameterPairs, options} = probabilityContext;
        const fieldsOfClassesWithUnknownHierarchyProbabilityModifier = options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier;

        let currentModifier = 1
        if(!currentClassWholeHierarchyKnown){
            currentModifier = fieldsOfClassesWithUnknownHierarchyProbabilityModifier * currentModifier
        }

        let otherModifier = 1
        if(!otherClassWholeHierarchyKnown){
            otherModifier = fieldsOfClassesWithUnknownHierarchyProbabilityModifier * otherModifier
        }

        let probabilityOfDataClumps = DetectorUtils.calculateProbabilityOfDataClumps(currentModifier, otherModifier, parameterPairs);
        return probabilityOfDataClumps;
    }

    public static calculateProbabilityOfDataClumpsMethodsToMethods(probabilityContext: ProbabilityContext){
        const {currentClassWholeHierarchyKnown, otherClassWholeHierarchyKnown, parameterPairs, options} = probabilityContext;

        let currentModifier = 1;
        if(!currentClassWholeHierarchyKnown){
            currentModifier = options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier * currentModifier
        }
        let otherModifier = 1;
        if(!otherClassWholeHierarchyKnown){
            otherModifier = options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier * otherModifier
        }

        let probabilityOfDataClumps = DetectorUtils.calculateProbabilityOfDataClumps(currentModifier, otherModifier, parameterPairs);
        return probabilityOfDataClumps;
    }

    public static calculateProbabilityOfDataClumpsMethodsToFields(currentClassWholeHierarchyKnown: boolean, otherClassWholeHierarchyKnown: boolean, parameterPairs: ParameterPair[], methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier: number, fieldsOfClassesWithUnknownHierarchyProbabilityModifier: number){
        let currentModifier = 1;
        if(!currentClassWholeHierarchyKnown){
            currentModifier = methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier * currentModifier
        }

        let otherModifier = 1;
        if(!otherClassWholeHierarchyKnown){
            otherModifier = fieldsOfClassesWithUnknownHierarchyProbabilityModifier * otherModifier
        }

        return DetectorUtils.calculateProbabilityOfDataClumps(currentModifier, otherModifier, parameterPairs);
    }

    public static getCommonFieldFieldPairKeys(fields: MemberFieldParameterTypeContext[], otherFields: MemberFieldParameterTypeContext[], options: DetectorOptions){
        let ignoreFieldModifiers = false; // From: https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These data fields should have same signatures (same names, same data types, and same access modifiers)."
        return DetectorUtils.getCommonVariablePairKeys(fields, otherFields, options, ignoreFieldModifiers);
    }

    public static getCommonParameterFieldPairKeys(parameters: MethodParameterTypeContext[], fields: MemberFieldParameterTypeContext[], options: DetectorOptions){
        let ignoreParameterToFieldModifiers = true; // From https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These parameters should have same signatures (same names, same data types)." since parameters can't have modifiers, we have to ignore them. And we shall only check names and data types
        return DetectorUtils.getCommonVariablePairKeys(parameters, fields, options, ignoreParameterToFieldModifiers);
    }

    public static getCommonParameterParameterPairKeys(parameters: MethodParameterTypeContext[], otherParameters: MethodParameterTypeContext[], options: DetectorOptions){
        let ignoreParameterToFieldModifiers = true; // From https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These parameters should have same signatures (same names, same data types)." since parameters can't have modifiers, we have to ignore them. And we shall only check names and data types
        return DetectorUtils.getCommonVariablePairKeys(parameters, otherParameters, options, ignoreParameterToFieldModifiers);
    }

    private static getCommonVariablePairKeys(variables: VariableTypeContext[], otherVariables: VariableTypeContext[], options: DetectorOptions, ignoreParameterModifiers: boolean){
        let cleanedVariables = DetectorUtils.cleanVariables(variables, options);
        let cleanedOtherVariables = DetectorUtils.cleanVariables(otherVariables, options);

        let commonParameterPairKeys: ParameterPair[] = [];
        for(let variable of cleanedVariables){
            for(let otherVariable of cleanedOtherVariables){
                let probabilityOfSimilarity = variable.isSimilarTo(otherVariable, options.similarityModifierOfVariablesWithUnknownType, ignoreParameterModifiers)

                if(probabilityOfSimilarity > 0.5){
                    let commonParameterPairKey = {
                        parameterKey: variable.key,
                        otherParameterKey: otherVariable.key,
                        probability: probabilityOfSimilarity
                    }
                    commonParameterPairKeys.push(commonParameterPairKey);
                }
            }
        }
        return commonParameterPairKeys;
    }

    public static getCurrentAndOtherParametersFromCommonParameterPairKeys(commonFieldParameterPairKeys: ParameterPair[], currentClassParameters: VariableTypeContext[], otherClassParameters: VariableTypeContext[])
        :[Dictionary<DataClumpsVariableFromContext>, string]
    {
        let currentParameters: Dictionary<DataClumpsVariableFromContext> = {};

        let commonFieldParameterKeysAsKey = "";

        for(let commonFieldParameterPairKey of commonFieldParameterPairKeys){

            let currentFieldParameterKey = commonFieldParameterPairKey.parameterKey;
            for(let currentClassParameter of currentClassParameters){
                if(currentClassParameter.key === currentFieldParameterKey){
                    commonFieldParameterKeysAsKey += currentClassParameter.name;

                    let related_to_context: any | DataClumpsVariableToContext = null;

                    let otherFieldParameterKey = commonFieldParameterPairKey.otherParameterKey;
                    for(let otherClassParameter of otherClassParameters){
                        if(otherClassParameter.key === otherFieldParameterKey){

                            let related_to_parameter: DataClumpsVariableToContext = {
                                key: otherClassParameter.key,
                                name: otherClassParameter.name,
                                // @ts-ignore
                                type: otherClassParameter.type,
                                modifiers: otherClassParameter.modifiers,
                                position: {
                                    startLine: otherClassParameter.position?.startLine,
                                    startColumn: otherClassParameter.position?.startColumn,
                                    endLine: otherClassParameter.position?.endLine,
                                    endColumn: otherClassParameter.position?.endColumn
                                }
                            }

                            related_to_context = related_to_parameter;
                        }
                    }

                    currentParameters[currentClassParameter.key] = {
                        key: currentClassParameter.key,
                        name: currentClassParameter.name,
                        // @ts-ignore
                        type: currentClassParameter.type,
                        probability: commonFieldParameterPairKey.probability,
                        modifiers: currentClassParameter.modifiers,
                        to_variable: related_to_context,
                        position:{
                            startLine: currentClassParameter.position?.startLine,
                            startColumn: currentClassParameter.position?.startColumn,
                            endLine: currentClassParameter.position?.endLine,
                            endColumn: currentClassParameter.position?.endColumn
                        }
                    }
                }
            }


        }
        return [currentParameters, commonFieldParameterKeysAsKey];
    }

    /**
     * In Java also interfaces can have fields, so we need to check if the classOrInterface is a class
     * Therefore this method is not needed, but it is kept for future reference
    public static getClassesDict(softwareProjectDicts: SoftwareProjectDicts){
        let classesOrInterfacesDict: Dictionary<ClassOrInterfaceTypeContext> = softwareProjectDicts.dictClassOrInterface;
        let classesDict: Dictionary<ClassOrInterfaceTypeContext> = {};
        let classOrInterfaceKeys = Object.keys(classesOrInterfacesDict);
        for (let classOrInterfaceKey of classOrInterfaceKeys) {
            let classOrInterface = classesOrInterfacesDict[classOrInterfaceKey];
            let type = classOrInterface.type; // ClassOrInterfaceTypeContext type is either "class" or "interface"
            if(type === "class"){ // DataclumpsInspection.java line 407
                classesDict[classOrInterfaceKey] = classOrInterface;
            }
        }
        return classesDict;
    }
     */

}
