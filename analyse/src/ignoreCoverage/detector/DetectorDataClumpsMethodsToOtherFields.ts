import {DetectorUtils} from "./DetectorUtils";
import {DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {ClassOrInterfaceTypeContext, MethodTypeContext} from "./../ParsedAstTypes";
import {SoftwareProjectDicts} from "./../SoftwareProject";
import {DetectorOptions, DetectorOptionsInformation, InvertedIndexSoftwareProject} from "./Detector";
import {DetectorDataClumpsFields} from "./DetectorDataClumpsFields";

// TODO refactor this method to Detector since there is already the creation, so why not the refactoring
function getParsedValuesFromPartialOptions(rawOptions: DetectorOptions): DetectorOptions{

    function parseBoolean(value: any){
        return ""+value==="true";
    }

    rawOptions.sharedParametersToFieldsAmountMinimum = parseInt(rawOptions.sharedParametersToFieldsAmountMinimum)
    //rawOptions.sharedMethodParametersHierarchyConsidered = parseBoolean(rawOptions.sharedMethodParametersHierarchyConsidered)
    //rawOptions.sharedFieldParametersCheckIfAreSubtypes = parseBoolean(rawOptions.sharedFieldParametersCheckIfAreSubtypes);
    rawOptions.sharedFieldsToFieldsAmountMinimum = parseInt(rawOptions.sharedFieldsToFieldsAmountMinimum)
    rawOptions.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces = parseBoolean(rawOptions.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces)
    rawOptions.fieldsOfClassesWithUnknownHierarchyProbabilityModifier = parseFloat(rawOptions.fieldsOfClassesWithUnknownHierarchyProbabilityModifier);
    rawOptions.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier = parseFloat(rawOptions.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier);
    rawOptions.similarityModifierOfVariablesWithUnknownType = parseFloat(rawOptions.similarityModifierOfVariablesWithUnknownType);

    return rawOptions;
}

export class DetectorDataClumpsMethodsToOtherFields {

    public static TYPE = "parameters_to_fields_data_clump"

    public options: DetectorOptions;
    public progressCallback: any;

    public constructor(options: DetectorOptions, progressCallback?: any){
        this.options = getParsedValuesFromPartialOptions(JSON.parse(JSON.stringify(options)));
        this.progressCallback = progressCallback;
    }

    /**
     * DataclumpsInspection.java line 487
     * @param method
     * @param methodToClassOrInterfaceDict
     * @private
     */
    public checkFieldDataClumps(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>, methodWholeHierarchyKnown: boolean, invertedIndexSoftwareProject: InvertedIndexSoftwareProject){
        //console.log("Checking parameter data clumps for method " + method.key);

        let recordClassesNumberFound: Record<string, {
            amountFound: number,
        }> = {};
        let methodParameters = method.parameters;
        for(let methodParameter of methodParameters){
            let invertedFieldKey = InvertedIndexSoftwareProject.getParameterFieldKeyForParameter(methodParameter);
            let classesHavingField = invertedIndexSoftwareProject.fieldKeyForParameterFieldDataClumpToClassOrInterfaceKey[invertedFieldKey] || {};
            let classesHavingFieldKeys = Object.keys(classesHavingField);
            for(let classHavingFieldKey of classesHavingFieldKeys){
                if(!recordClassesNumberFound[classHavingFieldKey]){
                    recordClassesNumberFound[classHavingFieldKey] = {
                        amountFound: 0,
                    }
                }
                recordClassesNumberFound[classHavingFieldKey].amountFound++;
            }
        }
        // now we have for all classes that have a field in common with the current class
        let classesOrInterfacesDict = softwareProjectDicts.dictClassOrInterface;
        let otherClassesOrInterfacesKeys = Object.keys(recordClassesNumberFound);
        for (let classOrInterfaceKey of otherClassesOrInterfacesKeys) {
            let otherClassOrInterface = classesOrInterfacesDict[classOrInterfaceKey];

            if(otherClassOrInterface.auxclass){ // ignore auxclasses as are not important for our project
                return;
            }

            let foundDataClumps = this.checkMethodParametersForDataClumps(method, otherClassOrInterface, softwareProjectDicts, dataClumpsMethodParameterDataClumps, methodWholeHierarchyKnown, invertedIndexSoftwareProject);
        }
    }


    /**
     * Analyzes the parameters of a method against another class or interface to identify potential data clumps.
     * This method checks if the parameters of the given method share similarities with the fields of another class or interface,
     * and determines if they form a data clump based on defined thresholds.
     *
     * @param {MethodTypeContext} method - The method context to analyze for data clumps.
     * @param {ClassOrInterfaceTypeContext} otherClassOrInterface - The class or interface context to compare against.
     * @param {SoftwareProjectDicts} softwareProjectDicts - A collection of project-wide dictionaries for classes, interfaces, and other entities.
     * @param {Dictionary<DataClumpTypeContext>} dataClumpsMethodParameterDataClumps - A dictionary to store identified data clumps.
     * @param {boolean} wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod - Indicates if the complete hierarchy of the current method's class or interface is known.
     *
     * @returns {void} This method does not return a value. It modifies the provided dictionary to include any identified data clumps.
     *
     * @throws {Error} Throws an error if there is an issue accessing the necessary project dictionaries or if the method parameters are invalid.
     *
     * @private
     */
    private checkMethodParametersForDataClumps(method: MethodTypeContext,otherClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod: boolean, invertedIndexSoftwareProject: InvertedIndexSoftwareProject){
        //console.log("--- otherMethod"+ otherMethod.key)


        let currentClassOrInterfaceKey = method.classOrInterfaceKey;
        let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[currentClassOrInterfaceKey];
        let parameters = method.parameters;

        let otherClassWholeHierarchyKnown = otherClassOrInterface.isWholeHierarchyKnown(softwareProjectDicts)
        if(!this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier){
            //console.log("- check if hierarchy is complete")
            if(!otherClassWholeHierarchyKnown){ // since we dont the complete hierarchy, we can't detect if a class is inherited or not
                //console.log("-- check if hierarchy is complete")
                return; // therefore we stop here
            }
        }

        let analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces = this.options.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces;
        let otherClassParameters = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(otherClassOrInterface, softwareProjectDicts, analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces);
        //console.log("- Found data clumps between method " + method.key + " and method " + otherMethod.key);

        let ignoreParameterToFieldModifiers = true; // From https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These parameters should have same signatures (same names, same data types)." since parameters can't have modifiers, we have to ignore them. And we shall only check names and data types
        let commonMethodParameterPairKeys = DetectorUtils.getCommonParameterPairKeys(method.parameters, otherClassParameters, this.options.similarityModifierOfVariablesWithUnknownType, ignoreParameterToFieldModifiers);

        let amountCommonParameters = commonMethodParameterPairKeys.length;

        //console.log("Amount of common parameters: "+amountCommonParameters);
        if(amountCommonParameters < this.options.sharedParametersToFieldsAmountMinimum) { // is not a data clump
            //console.log("Method " + method.key + " and method " + otherMethod.key + " have less than " + this.options.sharedParametersToParametersAmountMinimum + " common parameters. Skipping this method.")
            return;
        }




        let [currentParameters, commonFieldParamterKeysAsKey] = DetectorUtils.getCurrentAndOtherParametersFromCommonParameterPairKeys(commonMethodParameterPairKeys, method.parameters, otherClassParameters)

        let fileKey = currentClassOrInterface.file_path;

        let probability = DetectorUtils.calculateProbabilityOfDataClumpsMethodsToFields(wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod, otherClassWholeHierarchyKnown, commonMethodParameterPairKeys, this.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier, this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier);

        let data_clump_type = DetectorDataClumpsMethodsToOtherFields.TYPE;
        let dataClumpContext: DataClumpTypeContext = {
            type: "data_clump",
            key: data_clump_type+"-"+fileKey+"-"+method.key+"-"+otherClassOrInterface.key+"-"+commonFieldParamterKeysAsKey, // typically the file path + class name + method name + parameter names

            probability: probability,

            from_file_path: fileKey,
            from_class_or_interface_name: currentClassOrInterface.name,
            from_class_or_interface_key: currentClassOrInterface.key,
            from_method_name: method.name,
            from_method_key: method.key,

            to_file_path: otherClassOrInterface.file_path,
            to_class_or_interface_name: otherClassOrInterface.name,
            to_class_or_interface_key: otherClassOrInterface.key,
            to_method_name: null,
            to_method_key: null,

            data_clump_type: data_clump_type, // "parameter_data_clump" or "field_data_clump"
            data_clump_data: currentParameters
        }
        dataClumpsMethodParameterDataClumps[dataClumpContext.key] = dataClumpContext;

    }

}
