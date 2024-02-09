import {SoftwareProjectDicts} from "../SoftwareProject";
import {Dictionary} from "../UtilTypes";
import {DataClumpsVariableFromContext, DataClumpsVariableToContext,} from "data-clumps-type-context";
import {ClassOrInterfaceTypeContext, MemberFieldParameterTypeContext, VariableTypeContext} from "../ParsedAstTypes";

type ParameterPair = {
    parameterKey: string;
    otherParameterKey: string;
    probability: number | null;
}

export class DetectorUtils {

    /**
     * Calculate the probability of data clumps based on the current and other probability modifiers and parameter pairs.
     * @param currentProbabilityModifier The probability modifier for the current class.
     * @param otherProbabilityModifier The probability modifier for the other class.
     * @param parameterPairs An array of ParameterPair objects representing the common parameters between the classes.
     * @returns The probability of data clumps.
     * @throws {Error} If the parameterPairs array is empty or null.
     */
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

    /**
     * Calculate the probability of data clumps in fields.
     * 
     * @param currentClassWholeHierarchyKnown - Indicates if the whole hierarchy of the current class is known.
     * @param otherClassWholeHierarchyKnown - Indicates if the whole hierarchy of the other class is known.
     * @param parameterPairs - An array of parameter pairs.
     * @param fieldsOfClassesWithUnknownHierarchyProbabilityModifier - The probability modifier for fields of classes with unknown hierarchy.
     * 
     * @returns The probability of data clumps in the fields.
     * 
     * @throws {Error} If there is an issue with calculating the probability.
     */
    public static calculateProbabilityOfDataClumpsFields(currentClassWholeHierarchyKnown: boolean, otherClassWholeHierarchyKnown: boolean, parameterPairs: ParameterPair[], fieldsOfClassesWithUnknownHierarchyProbabilityModifier: number){
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

    /**
     * Calculates the probability of data clumps between methods.
     * @param currentClassWholeHierarchyKnown - Indicates if the whole hierarchy of the current class is known.
     * @param otherClassWholeHierarchyKnown - Indicates if the whole hierarchy of the other class is known.
     * @param parameterPairs - Array of parameter pairs.
     * @param methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier - Modifier for classes or interfaces with unknown hierarchy.
     * @returns The probability of data clumps between methods.
     * @throws {Error} Throws an error if there is an issue in calculating the probability.
     */
    public static calculateProbabilityOfDataClumpsMethodsToMethods(currentClassWholeHierarchyKnown: boolean, otherClassWholeHierarchyKnown: boolean, parameterPairs: ParameterPair[], methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier: number){
        let currentModifier = 1;
        if(!currentClassWholeHierarchyKnown){
            currentModifier = methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier * currentModifier
        }
        let otherModifier = 1;
        if(!otherClassWholeHierarchyKnown){
            otherModifier = methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier * otherModifier
        }

        let probabilityOfDataClumps = DetectorUtils.calculateProbabilityOfDataClumps(currentModifier, otherModifier, parameterPairs);
        return probabilityOfDataClumps;
    }

    /**
     * Calculate the probability of data clumps based on the given parameters.
     * @param currentClassWholeHierarchyKnown - Indicates if the whole hierarchy of the current class is known.
     * @param otherClassWholeHierarchyKnown - Indicates if the whole hierarchy of the other class is known.
     * @param parameterPairs - Array of parameter pairs.
     * @param methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier - Modifier for classes or interfaces with unknown hierarchy for methods.
     * @param fieldsOfClassesWithUnknownHierarchyProbabilityModifier - Modifier for classes with unknown hierarchy for fields.
     * @returns The probability of data clumps.
     * @throws {Error} If there is an issue in calculating the probability.
     */
    public static calculateProbabilityOfDataClumpsMethodsToFields(currentClassWholeHierarchyKnown: boolean, otherClassWholeHierarchyKnown: boolean, parameterPairs: ParameterPair[], methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier: number, fieldsOfClassesWithUnknownHierarchyProbabilityModifier: number){
        let currentModifier = 1;
        if(!currentClassWholeHierarchyKnown){
            currentModifier = methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier * currentModifier
        }

        let otherModifier = 1;
        if(!otherClassWholeHierarchyKnown){
            otherModifier = fieldsOfClassesWithUnknownHierarchyProbabilityModifier * otherModifier
        }

        let probabilityOfDataClumps = DetectorUtils.calculateProbabilityOfDataClumps(currentModifier, otherModifier, parameterPairs);
        return probabilityOfDataClumps;
    }


    /**
     * Retrieves common parameter pair keys between two arrays of VariableTypeContext objects.
     * @param parameters - The first array of VariableTypeContext objects.
     * @param otherParameters - The second array of VariableTypeContext objects.
     * @param similarityModifierOfVariablesWithUnknownType - The similarity modifier for variables with unknown type.
     * @param ignoreParameterModifiers - Indicates whether to ignore parameter modifiers.
     * @returns An array of ParameterPair objects representing the common parameter pair keys.
     * @throws {Error} Throws an error if the input parameters are not valid.
     */
    public static getCommonParameterPairKeys(parameters: VariableTypeContext[], otherParameters: VariableTypeContext[], similarityModifierOfVariablesWithUnknownType, ignoreParameterModifiers: boolean){


        let commonParameterPairKeys: ParameterPair[] = [];
        for(let parameter of parameters){
            for(let otherParameter of otherParameters){
                let probabilityOfSimilarity = parameter.isSimilarTo(otherParameter, similarityModifierOfVariablesWithUnknownType, ignoreParameterModifiers)

                if(probabilityOfSimilarity > 0.5){
                    let commonParameterPairKey = {
                        parameterKey: parameter.key,
                        otherParameterKey: otherParameter.key,
                        probability: probabilityOfSimilarity
                    }
                    commonParameterPairKeys.push(commonParameterPairKey);
                }
            }
        }
        return commonParameterPairKeys;
    }

    /**
     * Retrieves current and other parameters from common parameter pair keys.
     * @param commonFieldParameterPairKeys - Array of parameter pairs
     * @param currentClassParameters - Array of current class parameters
     * @param otherClassParameters - Array of other class parameters
     * @returns Tuple containing dictionary of current parameters and string representing common field parameter keys
     * @throws Error if unable to retrieve parameters from the given keys
     */
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
