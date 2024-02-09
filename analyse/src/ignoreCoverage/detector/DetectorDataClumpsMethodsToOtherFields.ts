import {DetectorUtils} from "./DetectorUtils";
import {DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {ClassOrInterfaceTypeContext, MethodTypeContext} from "./../ParsedAstTypes";
import {SoftwareProjectDicts} from "./../SoftwareProject";
import {DetectorOptions, DetectorOptionsInformation} from "./Detector";
import {DetectorDataClumpsFields} from "./DetectorDataClumpsFields";

/**
 * Refactors the method to Detector since there is already the creation.
 * @param rawOptions - The raw options to be parsed.
 * @throws {TypeError} - Throws a TypeError if the input is not valid.
 * @returns The parsed DetectorOptions.
 */
// TODO refactor this method to Detector since there is already the creation, so why not the refactoring
function getParsedValuesFromPartialOptions(rawOptions: DetectorOptions): DetectorOptions{

    /**
     * Parses the given value to a boolean.
     * @param value - The value to be parsed.
     * @returns The parsed boolean value.
     * @throws {TypeError} If the input value is not a valid boolean string.
     */
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
     * Check for data clumps in the given method.
     * @param method The method to check for data clumps.
     * @param softwareProjectDicts The dictionary of software projects.
     * @param dataClumpsMethodParameterDataClumps The dictionary of data clumps for method parameters.
     * @param methodWholeHierarchyKnown A boolean indicating if the whole hierarchy of the method is known.
     */
    public checkFieldDataClumps(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>, methodWholeHierarchyKnown: boolean){
        //console.log("Checking parameter data clumps for method " + method.key);

        let methodParameters = method.parameters;
        let methodParametersKeys = Object.keys(methodParameters);
        let methodParametersAmount = methodParametersKeys.length;
        if(methodParametersAmount < this.options.sharedParametersToFieldsAmountMinimum){ // avoid checking methods with less than 3 parameters
            //console.log("Method " + otherMethod.key + " has less than " + this.options.sharedParametersToParametersAmountMinimum + " parameters. Skipping this method.")
            return;
        }

        let classesOrInterfacesDict = softwareProjectDicts.dictClassOrInterface;
        let otherClassesOrInterfacesKeys = Object.keys(classesOrInterfacesDict);
        for (let classOrInterfaceKey of otherClassesOrInterfacesKeys) {
            let otherClassOrInterface = classesOrInterfacesDict[classOrInterfaceKey];

            if(otherClassOrInterface.auxclass){ // ignore auxclasses as are not important for our project
                return;
            }

            let foundDataClumps = this.checkMethodParametersForDataClumps(method, otherClassOrInterface, softwareProjectDicts, dataClumpsMethodParameterDataClumps, methodWholeHierarchyKnown);
        }
    }


    /**
     * Checks method parameters for data clumps.
     * @param method - The method to check.
     * @param otherClassOrInterface - The other class or interface to compare with.
     * @param softwareProjectDicts - The dictionary of software projects.
     * @param dataClumpsMethodParameterDataClumps - The dictionary of data clumps for method parameters.
     * @param wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod - Indicates if the whole hierarchy is known for the current method's class or interface.
     * @throws - No explicit exceptions are thrown in this method.
     */
    private checkMethodParametersForDataClumps(method: MethodTypeContext,otherClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod: boolean){
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
        let otherClassParameters = DetectorDataClumpsFields.getMemberParametersFromClassOrInterface(otherClassOrInterface, softwareProjectDicts, analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces);
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
