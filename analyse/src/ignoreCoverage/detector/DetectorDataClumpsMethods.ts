import {DetectorUtils} from "./DetectorUtils";
import {DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {MethodTypeContext} from "./../ParsedAstTypes";
import {SoftwareProjectDicts} from "./../SoftwareProject";
import {DetectorOptions, DetectorOptionsInformation} from "./Detector";
import {DetectorDataClumpsMethodsToOtherMethods} from "./DetectorDataClumpsMethodsToOtherMethods";
import {DetectorDataClumpsMethodsToOtherFields} from "./DetectorDataClumpsMethodsToOtherFields";

/**
 * TODO refactor this method to Detector since there is already the creation, so why not the refactoring
 * 
 * @param rawOptions - The raw options to be parsed
 * @returns The parsed detector options
 * @throws Error if any parsing error occurs
 */
// TODO refactor this method to Detector since there is already the creation, so why not the refactoring
function getParsedValuesFromPartialOptions(rawOptions: DetectorOptions): DetectorOptions{

    /**
     * Parses the given value to a boolean.
     * @param value - The value to be parsed.
     * @returns {boolean} - The parsed boolean value.
     * @throws {Error} - Throws an error if the value is not a valid boolean string.
     */
    function parseBoolean(value: any){
        return ""+value==="true";
    }

    rawOptions.sharedParametersToParametersAmountMinimum = parseInt(rawOptions.sharedParametersToParametersAmountMinimum)
    //rawOptions.sharedMethodParametersHierarchyConsidered = parseBoolean(rawOptions.sharedMethodParametersHierarchyConsidered)
    //rawOptions.sharedFieldParametersCheckIfAreSubtypes = parseBoolean(rawOptions.sharedFieldParametersCheckIfAreSubtypes);
    rawOptions.similarityModifierOfVariablesWithUnknownType = parseFloat(rawOptions.similarityModifierOfVariablesWithUnknownType);

    return rawOptions;
}

export class DetectorDataClumpsMethods {

    public options: DetectorOptions;
    public progressCallback: any;
    public toOtherMethodsDetector: DetectorDataClumpsMethodsToOtherMethods;
    public toOtherFieldsDetector: DetectorDataClumpsMethodsToOtherFields;

    
    public constructor(options: DetectorOptions, progressCallback?: any){
        this.options = getParsedValuesFromPartialOptions(JSON.parse(JSON.stringify(options)));
        this.progressCallback = progressCallback;
        this.toOtherMethodsDetector = new DetectorDataClumpsMethodsToOtherMethods(options, progressCallback);
        this.toOtherFieldsDetector = new DetectorDataClumpsMethodsToOtherFields(options, progressCallback);
    }

    /**
     * Asynchronously detects data clumps in software projects.
     * 
     * @param softwareProjectDicts - The dictionary containing software project data.
     * @returns A promise that resolves to a dictionary of data clump type contexts, or null if no data clumps are detected.
     * @throws This method does not throw any exceptions.
     */
    public async detect(softwareProjectDicts: SoftwareProjectDicts): Promise<Dictionary<DataClumpTypeContext> | null>{
        //console.log("Detecting software project for data clumps in methods");
        let methodsDict = softwareProjectDicts.dictMethod;
        let methodKeys = Object.keys(methodsDict);
        let detectedDataClumpsDict: Dictionary<DataClumpTypeContext> = {};

        let amountMethods = methodKeys.length;
        let index = 0;
        for (let methodKey of methodKeys) {
            if(this.progressCallback){
                await this.progressCallback("Parameter Detector: "+methodKey, index, amountMethods);
            }
            let method = methodsDict[methodKey];

            this.analyzeMethod(method, softwareProjectDicts, detectedDataClumpsDict);
            index++;
        }
        return detectedDataClumpsDict;
    }

    /**
     * Analyzes the given method for data clumps.
     * @param method - The method to analyze
     * @param softwareProjectDicts - The dictionary of software project data
     * @param dataClumpsMethodParameterDataClumps - The dictionary of data clump type context for method parameters
     * @private
     * @throws {Error} - Throws an error if there is a problem analyzing the method
     */
    private analyzeMethod(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>){

        let currentClassOrInterface = MethodTypeContext.getClassOrInterface(method, softwareProjectDicts);
        if(currentClassOrInterface.auxclass){ // ignore auxclasses as are not important for our project
            return;
        }

        let wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod = MethodTypeContext.isWholeHierarchyKnown(method, softwareProjectDicts);
        if(!this.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier){
            //console.log("- check if methods hierarchy is complete")
//            let wholeHierarchyKnown = method.isWholeHierarchyKnown(softwareProjectDicts)
            if(!wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod){ // since we dont the complete hierarchy, we can't detect if a method is inherited or not
                //console.log("-- check if methods hierarchy is complete")
                return; // therefore we stop here
            }
        }

        let methodIsInherited = method.isInheritedFromParentClassOrInterface(softwareProjectDicts);
        if(methodIsInherited) { // if the method is inherited
            // then skip this method
            return;
        }


        // we assume that all methods are not constructors
        this.toOtherMethodsDetector.checkParameterDataClumps(method, softwareProjectDicts, dataClumpsMethodParameterDataClumps, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod);
        this.toOtherFieldsDetector.checkFieldDataClumps(method, softwareProjectDicts, dataClumpsMethodParameterDataClumps, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod)
    }

}
