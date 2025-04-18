import {DetectorUtils} from "./DetectorUtils";
import {DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {ClassOrInterfaceTypeContext, MethodTypeContext} from "./../ParsedAstTypes";
import {SoftwareProjectDicts} from "./../SoftwareProject";
import {DetectorOptions, DetectorOptionsInformation, InvertedIndexSoftwareProject} from "./Detector";
import {DetectorDataClumpsFields} from "./DetectorDataClumpsFields";
import {ContextAnalyseDataClumpParameter} from "./DetectorDataClumpsMethods";

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
     * @private
     * @param detectContext
     * @param methodWholeHierarchyKnown
     */
    public checkFieldDataClumps(detectContext: ContextAnalyseDataClumpParameter, methodWholeHierarchyKnown: boolean){
        //console.log("Checking parameter data clumps for method " + method.key);

        const {currentMethod, detectedDataClumpsDict, softwareProjectDicts, invertedIndexSoftwareProject} = detectContext;

        // now we have for all classes that have a field in common with the current class
        let classesOrInterfacesToCheck: ClassOrInterfaceTypeContext[] = [];

        let useFastSearch = this.options.fastDetection
        if(useFastSearch){
            classesOrInterfacesToCheck = invertedIndexSoftwareProject.getPossibleClassesOrInterfacesForParameterFieldDataClump(currentMethod, softwareProjectDicts);
        } else {
            // This will cause a N*N complexity, as we have to check all classes with all classes
            let otherClassKeys = Object.keys(softwareProjectDicts.dictClassOrInterface);
            for (let otherClassKey of otherClassKeys) {
                let otherClass = softwareProjectDicts.dictClassOrInterface[otherClassKey];
                classesOrInterfacesToCheck.push(otherClass);
            }
        }

        for (let otherClassOrInterface of classesOrInterfacesToCheck) {
            let foundDataClumps = this.checkMethodParametersForDataClumps(detectContext, otherClassOrInterface, methodWholeHierarchyKnown);
        }
    }


    /**
     * Analyzes the parameters of a method against another class or interface to identify potential data clumps.
     * This method checks if the parameters of the given method share similarities with the fields of another class or interface,
     * and determines if they form a data clump based on defined thresholds.
     *
     * @param detectContext
     * @param {ClassOrInterfaceTypeContext} otherClassOrInterface - The class or interface context to compare against.
     * @param {boolean} wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod - Indicates if the complete hierarchy of the current method's class or interface is known.
     *
     * @returns {void} This method does not return a value. It modifies the provided dictionary to include any identified data clumps.
     *
     * @throws {Error} Throws an error if there is an issue accessing the necessary project dictionaries or if the method parameters are invalid.
     *
     * @private
     */
    private checkMethodParametersForDataClumps(detectContext: ContextAnalyseDataClumpParameter ,otherClassOrInterface: ClassOrInterfaceTypeContext, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod: boolean){
        //console.log("--- otherMethod"+ otherMethod.key)

        const {currentMethod, detectedDataClumpsDict, softwareProjectDicts, invertedIndexSoftwareProject} = detectContext;

        if(otherClassOrInterface.auxclass){ // ignore auxclasses as are not important for our project
            return;
        }

        let currentClassOrInterfaceKey = currentMethod.classOrInterfaceKey;
        let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[currentClassOrInterfaceKey];
        let parameters = currentMethod.parameters;

        let otherClassWholeHierarchyKnown = otherClassOrInterface.isWholeHierarchyKnown(softwareProjectDicts)
        if(!this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier){
            //console.log("- check if hierarchy is complete")
            if(!otherClassWholeHierarchyKnown){ // since we dont know the complete hierarchy, we can't detect if a class is inherited or not
                //console.log("-- check if hierarchy is complete")
                return; // therefore we stop here
            }
        }

        let otherClassFields = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(otherClassOrInterface, softwareProjectDicts, this.options);
        //console.log("- Found data clumps between method " + method.key + " and method " + otherMethod.key);

        let commonMethodParameterPairKeys = DetectorUtils.getCommonParameterFieldPairKeys(currentMethod.parameters, otherClassFields, this.options);

        let amountCommonParameters = commonMethodParameterPairKeys.length;

        //console.log("Amount of common parameters: "+amountCommonParameters);
        if(amountCommonParameters < this.options.sharedParametersToFieldsAmountMinimum) { // is not a data clump
            //console.log("Method " + method.key + " and method " + otherMethod.key + " have less than " + this.options.sharedParametersToParametersAmountMinimum + " common parameters. Skipping this method.")
            return;
        }




        let [currentParameters, commonFieldParamterKeysAsKey] = DetectorUtils.getCurrentAndOtherParametersFromCommonParameterPairKeys(commonMethodParameterPairKeys, currentMethod.parameters, otherClassFields)

        let fileKey = currentClassOrInterface.file_path;

        let probability = DetectorUtils.calculateProbabilityOfDataClumpsMethodsToFields(wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod, otherClassWholeHierarchyKnown, commonMethodParameterPairKeys, this.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier, this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier);

        let data_clump_type = DetectorDataClumpsMethodsToOtherFields.TYPE;
        let dataClumpContext: DataClumpTypeContext = {
            type: "data_clump",
            key: data_clump_type+"-"+fileKey+"-"+currentMethod.key+"-"+otherClassOrInterface.key+"-"+commonFieldParamterKeysAsKey, // typically the file path + class name + method name + parameter names

            probability: probability,

            from_file_path: fileKey,
            from_class_or_interface_name: currentClassOrInterface.name,
            from_class_or_interface_key: currentClassOrInterface.key,
            from_method_name: currentMethod.name,
            from_method_key: currentMethod.key,

            to_file_path: otherClassOrInterface.file_path,
            to_class_or_interface_name: otherClassOrInterface.name,
            to_class_or_interface_key: otherClassOrInterface.key,
            to_method_name: null,
            to_method_key: null,

            data_clump_type: data_clump_type, // "parameter_data_clump" or "field_data_clump"
            data_clump_data: currentParameters
        }
        detectedDataClumpsDict[dataClumpContext.key] = dataClumpContext;

    }

}
