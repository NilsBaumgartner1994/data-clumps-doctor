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

    /**
     * Checks the provided detection options for compatibility issues.
     * Specifically, it verifies that if fast detection is enabled,
     * the similarity modifier for variables with unknown types must be set to 1.
     * If the conditions are not met, an error is logged and an exception is thrown.
     *
     * @param {DetectorOptions} options - The options to be checked for compatibility.
     * @throws {Error} Throws an error if fast detection is enabled while
     *                 similarityModifierOfVariablesWithUnknownType is not equal to 1.
     */
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

    /**
     * Calculates the probability of data clumps based on the provided context.
     *
     * This method evaluates the known hierarchy of classes and modifies the probability calculation
     * based on whether the current class and other classes have their whole hierarchy known.
     *
     * @param {ProbabilityContext} probabilityContext - The context containing information about class hierarchies and parameters.
     * @param {boolean} probabilityContext.currentClassWholeHierarchyKnown - Indicates if the current class's whole hierarchy is known.
     * @param {boolean} probabilityContext.otherClassWholeHierarchyKnown - Indicates if the other class's whole hierarchy is known.
     * @param {Array} probabilityContext.parameterPairs - An array of parameter pairs used in the probability calculation.
     * @param {Object} probabilityContext.options - Additional options for the calculation.
     * @param {number} probabilityContext.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier - A modifier to adjust the probability when class hierarchies are unknown.
     *
     * @returns {number} The calculated probability of data clumps.
     *
     * @throws {Error} Throws an error if the probability context is invalid or if required properties are missing.
     */
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

    /**
     * Calculates the probability of data clumps between methods based on the provided context.
     *
     * This method evaluates the known hierarchy of classes and interfaces, applies appropriate modifiers,
     * and computes the probability of data clumps using the specified parameter pairs.
     *
     * @param {ProbabilityContext} probabilityContext - The context containing information about the current
     * class hierarchy, other class hierarchy, parameter pairs, and options for probability calculation.
     * @param {boolean} probabilityContext.currentClassWholeHierarchyKnown - Indicates if the current class's
     * whole hierarchy is known.
     * @param {boolean} probabilityContext.otherClassWholeHierarchyKnown - Indicates if the other class's
     * whole hierarchy is known.
     * @param {Array} probabilityContext.parameterPairs - An array of parameter pairs to be evaluated for
     * data clumps.
     * @param {Object} probabilityContext.options - Options for calculating probabilities, including modifiers.
     * @param {number} probabilityContext.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier -
     * The modifier to apply when the hierarchy is unknown.
     *
     * @returns {number} The calculated probability of data clumps between methods.
     *
     * @throws {Error} Throws an error if the probability context is invalid or if required properties are missing.
     */
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

    /**
     * Calculates the probability of data clumps based on the known hierarchy of classes and the provided parameter pairs.
     *
     * This method takes into account whether the whole hierarchy of the current class and the other class is known,
     * and applies modifiers to adjust the probability calculation accordingly.
     *
     * @param {boolean} currentClassWholeHierarchyKnown - Indicates if the whole hierarchy of the current class is known.
     * @param {boolean} otherClassWholeHierarchyKnown - Indicates if the whole hierarchy of the other class is known.
     * @param {ParameterPair[]} parameterPairs - An array of parameter pairs to be analyzed for data clumps.
     * @param {number} methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier - A modifier to adjust the probability
     *        when the methods of classes or interfaces have an unknown hierarchy.
     * @param {number} fieldsOfClassesWithUnknownHierarchyProbabilityModifier - A modifier to adjust the probability
     *        when the fields of classes have an unknown hierarchy.
     * @returns {number} The calculated probability of data clumps based on the provided parameters.
     *
     * @throws {Error} Throws an error if the parameterPairs array is empty or invalid.
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

        return DetectorUtils.calculateProbabilityOfDataClumps(currentModifier, otherModifier, parameterPairs);
    }

    /**
     * Retrieves the common field pair keys from two sets of member field parameters.
     *
     * This method compares two arrays of member field parameters and identifies
     * the keys that are common to both sets, while considering specific options
     * provided through the `DetectorOptions` parameter. The comparison ignores
     * field modifiers to ensure that the focus remains on the names and data types
     * of the fields.
     *
     * @param {MemberFieldParameterTypeContext[]} fields - The first array of member field parameters to compare.
     * @param {MemberFieldParameterTypeContext[]} otherFields - The second array of member field parameters to compare against.
     * @param {DetectorOptions} options - Options that may influence the comparison process.
     *
     * @returns {string[]} An array of common field pair keys found in both input arrays.
     *
     * @throws {Error} Throws an error if the input arrays are not valid or if an unexpected condition occurs during processing.
     */
    public static getCommonFieldFieldPairKeys(fields: MemberFieldParameterTypeContext[], otherFields: MemberFieldParameterTypeContext[], options: DetectorOptions){
        let ignoreFieldModifiers = false; // From: https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These data fields should have same signatures (same names, same data types, and same access modifiers)."
        return DetectorUtils.getCommonParameterPairKeys(fields, otherFields, options, ignoreFieldModifiers);
    }

    /**
     * Retrieves common parameter and field pair keys from the provided method parameters and member fields.
     * This method compares the names and data types of the parameters and fields, ignoring any modifiers.
     *
     * @param {MethodParameterTypeContext[]} parameters - An array of method parameter contexts to compare.
     * @param {MemberFieldParameterTypeContext[]} fields - An array of member field contexts to compare against the parameters.
     * @param {DetectorOptions} options - Options that may affect the detection process.
     * @returns {string[]} An array of common keys found between the parameters and fields.
     *
     * @throws {Error} Throws an error if the input arrays are not valid or if an unexpected condition occurs during processing.
     */
    public static getCommonParameterFieldPairKeys(parameters: MethodParameterTypeContext[], fields: MemberFieldParameterTypeContext[], options: DetectorOptions){
        let ignoreParameterToFieldModifiers = true; // From https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These parameters should have same signatures (same names, same data types)." since parameters can't have modifiers, we have to ignore them. And we shall only check names and data types
        return DetectorUtils.getCommonParameterPairKeys(parameters, fields, options, ignoreParameterToFieldModifiers);
    }

    public static getCommonParameterParameterPairKeys(parameters: MethodParameterTypeContext[], otherParameters: MethodParameterTypeContext[], options: DetectorOptions){
        let ignoreParameterToFieldModifiers = true; // From https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These parameters should have same signatures (same names, same data types)." since parameters can't have modifiers, we have to ignore them. And we shall only check names and data types
        return DetectorUtils.getCommonParameterPairKeys(parameters, otherParameters, options, ignoreParameterToFieldModifiers);
    }

    private static getCommonParameterPairKeys(parameters: VariableTypeContext[], otherParameters: VariableTypeContext[], options: DetectorOptions, ignoreParameterModifiers: boolean){

        let commonParameterPairKeys: ParameterPair[] = [];
        for(let parameter of parameters){
            for(let otherParameter of otherParameters){
                let probabilityOfSimilarity = parameter.isSimilarTo(otherParameter, options.similarityModifierOfVariablesWithUnknownType, ignoreParameterModifiers)

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
