import {DetectorUtils} from "./DetectorUtils";
import {DataClumpTypeContext, Dictionary} from "data-clumps-type-context";
import {MethodTypeContext} from "./../ParsedAstTypes";
import {SoftwareProjectDicts} from "./../SoftwareProject";
import {DetectorOptions, DetectorOptionsInformation} from "./Detector";

/**
 * Refactors the method to Detector since there is already the creation.
 * 
 * @param rawOptions - The raw options to be parsed.
 * @returns The parsed DetectorOptions.
 * @throws - Throws an error if parsing fails.
 */
// TODO refactor this method to Detector since there is already the creation, so why not the refactoring
function getParsedValuesFromPartialOptions(rawOptions: DetectorOptions): DetectorOptions{

    /**
     * Parses the given value to a boolean.
     * 
     * @param value - The value to be parsed.
     * @returns The parsed boolean value.
     * @throws {Error} If the value is not a valid boolean string.
     */
    function parseBoolean(value: any){
        return ""+value==="true";
    }

    rawOptions.sharedParametersToParametersAmountMinimum = parseInt(rawOptions.sharedParametersToParametersAmountMinimum)
    //rawOptions.sharedMethodParametersHierarchyConsidered = parseBoolean(rawOptions.sharedMethodParametersHierarchyConsidered)
    //rawOptions.sharedFieldParametersCheckIfAreSubtypes = parseBoolean(rawOptions.sharedFieldParametersCheckIfAreSubtypes);
    rawOptions.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier = parseFloat(rawOptions.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier);
    rawOptions.similarityModifierOfVariablesWithUnknownType = parseFloat(rawOptions.similarityModifierOfVariablesWithUnknownType);

    return rawOptions;
}

export class DetectorDataClumpsMethodsToOtherMethods {

    public static TYPE = "parameters_to_parameters_data_clump";

    public options: DetectorOptions;
    public progressCallback: any;

    
    public constructor(options: DetectorOptions, progressCallback?: any){
        this.options = getParsedValuesFromPartialOptions(JSON.parse(JSON.stringify(options)));
        this.progressCallback = progressCallback;
    }

    /**
     * Check for parameter data clumps in the given method.
     * @param method - The method to check for parameter data clumps.
     * @param softwareProjectDicts - The dictionary of software projects.
     * @param dataClumpsMethodParameterDataClumps - The dictionary of data clumps for method parameter data clumps.
     * @param methodWholeHierarchyKnown - A boolean indicating if the method's whole hierarchy is known.
     */
    public checkParameterDataClumps(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>, methodWholeHierarchyKnown: boolean){
        //console.log("Checking parameter data clumps for method " + method.key);

        let methodParameters = method.parameters;
        let methodParametersKeys = Object.keys(methodParameters);
        let methodParametersAmount = methodParametersKeys.length;
        if(methodParametersAmount < this.options.sharedParametersToParametersAmountMinimum){ // avoid checking methods with less than 3 parameters
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

            let otherMethods = otherClassOrInterface.methods;
            let otherMethodsKeys = Object.keys(otherMethods);
            for (let otherMethodKey of otherMethodsKeys) {
                let otherMethod = otherMethods[otherMethodKey];
                // DataclumpsInspection.java line 511
                let foundDataClumps = this.checkMethodParametersForDataClumps(method, otherMethod, softwareProjectDicts, dataClumpsMethodParameterDataClumps, methodWholeHierarchyKnown);
                // TODO: DataclumpsInspection.java line 512
            }
        }
    }


    /**
     * Check method parameters for data clumps.
     * @param method - The method to check for data clumps.
     * @param otherMethod - The other method to compare with.
     * @param softwareProjectDicts - The dictionary of software project data.
     * @param dataClumpsMethodParameterDataClumps - The dictionary to store data clump contexts.
     * @param wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod - Flag indicating if the whole hierarchy is known for the current method.
     * @throws - No exceptions are thrown by this method.
     * @private
     */
    private checkMethodParametersForDataClumps(method: MethodTypeContext,otherMethod: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts, dataClumpsMethodParameterDataClumps: Dictionary<DataClumpTypeContext>, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod: boolean) {
        //console.log("--- otherMethod"+ otherMethod.key)


        let isSameMethod = method.key === otherMethod.key;
        if(isSameMethod){ // avoid checking the same method
            //console.log("Method " + method.key + " is the same as method " + otherMethod.key + ". Skipping this method.")
//            console.log("Method " + method.key + " is the same as method " + otherMethod.key + ". Skipping this method.")
            return;
        }

        let currentClassOrInterfaceKey = method.classOrInterfaceKey;
        let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[currentClassOrInterfaceKey];
        let otherClassOrInterfaceKey = otherMethod.classOrInterfaceKey;
        let otherClassOrInterface = softwareProjectDicts.dictClassOrInterface[otherClassOrInterfaceKey];

        let otherMethodParameters = otherMethod.parameters;
        let otherMethodParametersKeys = Object.keys(otherMethodParameters);
        let otherMethodParametersAmount = otherMethodParametersKeys.length;
        if(otherMethodParametersAmount < this.options.sharedParametersToParametersAmountMinimum){ // avoid checking methods with less than 3 parameters
            //console.log("Method " + otherMethod.key + " has less than " + this.options.sharedParametersToParametersAmountMinimum + " parameters. Skipping this method.")
            return;
        }


        let wholeHierarchyKnownOfOtherClassOrInterfaceOfCurrentMethod = MethodTypeContext.isWholeHierarchyKnown(otherMethod, softwareProjectDicts);
        if(!this.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier){
            //console.log("- check if methods hierarchy is complete")
//            let wholeHierarchyKnown = method.isWholeHierarchyKnown(softwareProjectDicts)
            if(!wholeHierarchyKnownOfOtherClassOrInterfaceOfCurrentMethod){ // since we dont the complete hierarchy, we can't detect if a method is inherited or not
                //console.log("-- check if methods hierarchy is complete")
                return; // therefore we stop here
            }
        }



        //console.log("Method " + method.key + " is in a different class or interface than method " + otherMethod.key + ": " + isDifferentClassOrInterface)
        // now we check if the methods are in the same inheritance hierarchy with the same method signature

        // DataclumpsInspection.java line 376
        // We can't rely on @Override annotation because it is not mandatory: https://stackoverflow.com/questions/4822954/do-we-really-need-override-and-so-on-when-code-java
        /* "[...] with a same method signature." */

        /**
         * From: "Improving the Precision of Fowler’s Definitions of Bad Smells"
         * "Expert 1A suggests that in Situation 2 we should exclude methods inherited from parent-classes. This expert’s reason is that the inheritance features of OO programming allow a method from subclasses using the same signature to override a method from parent-classes. In this situation, we should not count the same parameters in these methods as a Data Clump, because they are not duplication.
         * "These methods should not in a same inheritance hierarchy and with a same method signature."
         *
         *
         */
        if(method.hasSameSignatureAs(otherMethod)) { // if the methods have the same signature

            /**
             * This does not work, because it can be for example
             * Class A
             * Class B extends A with method foo()
             * Class C extends A with method foo()
             * Class D extends B with method foo() overriding foo() from B
             * Class E extends C with method foo() overriding foo() from C
             * Then foo() from D and foo() from E are not in the same inheritance hierarchy, but they are overriding foo() from B and C respectively
             * Therefore we should skip these methods. But checking isSubClassOrInterfaceOrParentOfOtherClassOrInterface is not enough
            let isInSameInheritanceHierarchy = currentClassOrInterface.isSubClassOrInterfaceOrParentOfOtherClassOrInterface(otherClassOrInterface, softwareProjectDicts);
            if(isInSameInheritanceHierarchy){
                return; // then skip this method
            }
             */


             // Other methods in the same class or interface should be checked, so these are not skipped
            /**
             * Problem in definition: "Expert 1A suggests that in Situation 2 we should exclude methods inherited from parent-classes."
             * This says we shall exclude all methods which are overridden.
             * But then "These methods should not in a same inheritance hierarchy and with a same method signature." says we only shall exclude methods which are in the same hierarchy with same signature
             * This is a contradiction, because we could have
             * Class A
             * Class B extends A with method foo()
             * Class C extends A with method foo()
             * Class D extends B with method foo() overriding foo() from B
             * Class E extends C with method foo() overriding foo() from C
             * Then foo() from D and foo() from E are not in the same inheritance hierarchy, but they are overriding foo() from B and C respectively
             * But this would still count from D and E as Dataclumps, because they are not dublicated, but overridden, so the root of the problem is in the definition in B and C
             */

            let otherMethodIsInherited = otherMethod.isInheritedFromParentClassOrInterface(softwareProjectDicts);
             if(otherMethodIsInherited) { // if the method is inherited
                // then skip this method
                return;
            }

        }


        let ignoreParameterToFieldModifiers = true; // From https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These parameters should have same signatures (same names, same data types)." since parameters can't have modifiers, we have to ignore them. And we shall only check names and data types
        let commonMethodParameterPairKeys = DetectorUtils.getCommonParameterPairKeys(method.parameters, otherMethod.parameters, this.options.similarityModifierOfVariablesWithUnknownType, ignoreParameterToFieldModifiers);

        let amountCommonParameters = commonMethodParameterPairKeys.length;
        //console.log("Amount of common parameters: "+amountCommonParameters);
        if(amountCommonParameters < this.options.sharedParametersToParametersAmountMinimum) { // is not a data clump
            //console.log("Method " + method.key + " and method " + otherMethod.key + " have less than " + this.options.sharedParametersToParametersAmountMinimum + " common parameters. Skipping this method.")
            return;
        } else {
            //console.log("- Found data clumps between method " + method.key + " and method " + otherMethod.key);

            let [currentParameters, commonFieldParamterKeysAsKey] = DetectorUtils.getCurrentAndOtherParametersFromCommonParameterPairKeys(commonMethodParameterPairKeys, method.parameters, otherMethod.parameters)

            let fileKey = currentClassOrInterface.file_path;

            let probability = DetectorUtils.calculateProbabilityOfDataClumpsMethodsToMethods(wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod, wholeHierarchyKnownOfOtherClassOrInterfaceOfCurrentMethod, commonMethodParameterPairKeys, this.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier);

            let data_clump_type = DetectorDataClumpsMethodsToOtherMethods.TYPE
            let dataClumpContext: DataClumpTypeContext = {
                type: "data_clump",
                key: data_clump_type+"-"+fileKey+"-"+method.key+"-"+otherMethod.key+"-"+commonFieldParamterKeysAsKey, // typically the file path + class name + method name + parameter names

                probability: probability,

                from_file_path: fileKey,
                from_class_or_interface_name: currentClassOrInterface.name,
                from_class_or_interface_key: currentClassOrInterface.key,
                from_method_name: method.name,
                from_method_key: method.key,

                to_file_path: otherClassOrInterface.file_path,
                to_class_or_interface_name: otherClassOrInterface.name,
                to_class_or_interface_key: otherClassOrInterface.key,
                to_method_name: otherMethod.name,
                to_method_key: otherMethod.key,

                data_clump_type: data_clump_type, // "parameter_data_clump" or "field_data_clump"
                data_clump_data: currentParameters
            }
            dataClumpsMethodParameterDataClumps[dataClumpContext.key] = dataClumpContext;

        }
    }

}
