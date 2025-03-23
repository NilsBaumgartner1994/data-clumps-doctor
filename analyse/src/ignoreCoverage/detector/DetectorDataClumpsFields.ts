import {DetectorUtils} from "./DetectorUtils";
import {Dictionary} from "./../UtilTypes";

import {DataClumpTypeContext} from "data-clumps-type-context";
import {ClassOrInterfaceTypeContext, MemberFieldParameterTypeContext, MethodTypeContext} from "./../ParsedAstTypes";
import {SoftwareProjectDicts} from "./../SoftwareProject";
import {DetectorOptions} from "./Detector";

// TODO refactor this method to Detector since there is already the creation, so why not the refactoring
function getParsedValuesFromPartialOptions(rawOptions: DetectorOptions): DetectorOptions{

    function parseBoolean(value: any){
        return ""+value==="true";
    }

    rawOptions.sharedFieldsToFieldsAmountMinimum = parseInt(rawOptions.sharedFieldsToFieldsAmountMinimum)
    rawOptions.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces = parseBoolean(rawOptions.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces)
    //rawOptions.sharedFieldParametersCheckIfAreSubtypes = parseBoolean(rawOptions.sharedFieldParametersCheckIfAreSubtypes);
    rawOptions.fieldsOfClassesWithUnknownHierarchyProbabilityModifier = parseFloat(rawOptions.fieldsOfClassesWithUnknownHierarchyProbabilityModifier);
    rawOptions.similarityModifierOfVariablesWithUnknownType = parseFloat(rawOptions.similarityModifierOfVariablesWithUnknownType);

    return rawOptions;
}

export class DetectorDataClumpsFields {

    public static TYPE = "fields_to_fields_data_clump"

    public options: DetectorOptions;
    public progressCallback: any;

    public constructor(options: DetectorOptions, progressCallback?: any){
        this.options = getParsedValuesFromPartialOptions(options)
        this.progressCallback = progressCallback;
    }

    public async detect(softwareProjectDicts: SoftwareProjectDicts): Promise<Dictionary<DataClumpTypeContext> | null>{
        console.log("DetectorDataClumpsFields: detect")

        //let classesDict = DetectorUtils.getClassesDict(softwareProjectDicts); // in java also interfaces can have fields
        let classesDict = softwareProjectDicts.dictClassOrInterface;

        let dataClumpsFieldParameters: Dictionary<DataClumpTypeContext> = {};
        let classKeys = Object.keys(classesDict);
        let amountOfClasses = classKeys.length;
        console.log("amountOfClasses: "+amountOfClasses)

        let index = 0;
        for (let classKey of classKeys) {
            if(this.progressCallback){
                await this.progressCallback("Field Detector: "+classKey, index, amountOfClasses);
            }
            let currentClass = classesDict[classKey];// DataclumpsInspection.java line 404

            if(currentClass.auxclass){ // ignore auxclasses as are not important for our project
                continue;
            }

            this.generateMemberFieldParametersRelatedToForClass(currentClass, classesDict, dataClumpsFieldParameters, softwareProjectDicts);
            index++;
        }
        return dataClumpsFieldParameters;
    }

    /**
     * DataclumpsInspection.java line 405
     */
    private generateMemberFieldParametersRelatedToForClass(currentClass: ClassOrInterfaceTypeContext, classesDict: Dictionary<ClassOrInterfaceTypeContext>, dataClumpsFieldParameters: Dictionary<DataClumpTypeContext>, softwareProjectDicts: SoftwareProjectDicts){

        let currentClassWholeHierarchyKnown = currentClass.isWholeHierarchyKnown(softwareProjectDicts)
        if(!currentClassWholeHierarchyKnown){
            //console.log("currentClassWholeHierarchyKnown: "+currentClassWholeHierarchyKnown)
            //console.log("currentClass.name: "+currentClass.name+ " - "+currentClass.file_path)
            currentClass.isWholeHierarchyKnownPrintUnknown(softwareProjectDicts)
        }

        if(!this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier){
            //console.log("- check if hierarchy is complete")

            if(!currentClassWholeHierarchyKnown){ // since we dont the complete hierarchy, we can't detect if a class is inherited or not
                //console.log("-- check if hierarchy is complete")
                return; // therefore we stop here
            }
        }


        let analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces = this.options.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces;
        let memberFieldParameters = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(currentClass, softwareProjectDicts, analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces);
        let amountOfMemberFields = memberFieldParameters.length;
        if(amountOfMemberFields < this.options.sharedFieldsToFieldsAmountMinimum){
            return;
        }
        let otherClassKeys = Object.keys(classesDict);
        for (let otherClassKey of otherClassKeys) {
            let otherClass = classesDict[otherClassKey];

            this.generateMemberFieldParametersRelatedToForClassToOtherClass(currentClass, otherClass, dataClumpsFieldParameters, softwareProjectDicts, currentClassWholeHierarchyKnown);
        }
    }

    private generateMemberFieldParametersRelatedToForClassToOtherClass(currentClass: ClassOrInterfaceTypeContext, otherClass: ClassOrInterfaceTypeContext, dataClumpsFieldParameters: Dictionary<DataClumpTypeContext>, softwareProjectDicts: SoftwareProjectDicts, currentClassWholeHierarchyKnown: boolean){

        let debug = false;

        if(debug) console.log("------------------")
        if(debug) console.log("generateMemberFieldParametersRelatedToForClassToOtherClass: "+currentClass.name+" to "+otherClass.name)
        if(debug) console.log("current file path: "+currentClass.file_path)
        if(debug) console.log("other file path: "+otherClass.file_path)



        if(otherClass.auxclass){ // ignore auxclasses as are not important for our project
            return;
        }

        // DataclumpsInspection.java line 410
        let currentClassKey = currentClass.key
        let otherClassKey = otherClass.key;
        if(currentClassKey === otherClassKey) {
            return; // skip the same class // DataclumpsInspection.java line 411
        }

        let otherClassWholeHierarchyKnown = otherClass.isWholeHierarchyKnown(softwareProjectDicts);

        if(debug) console.log("otherClassWholeHierarchyKnown: "+otherClassWholeHierarchyKnown)

        if(!this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier){
            //console.log("- check if hierarchy is complete")

            if(!otherClassWholeHierarchyKnown){ // since we dont the complete hierarchy, we can't detect if a class is inherited or not
                //console.log("-- check if hierarchy is complete")
                return; // therefore we stop here
            }
        }

        // we can always ignore classes in the same hierarchy.
        // when class A is subclass of class B --> A will always have all fields of class B.
        // Although class A can override a field already inherited, this then must be intended.
        let hasCurrentClassOrInterfaceOtherClassOrInterfaceAsParent = currentClass.isSubClassOrInterfaceOrParentOfOtherClassOrInterface(otherClass, softwareProjectDicts);

        if(debug) console.log("hasCurrentClassOrInterfaceOtherClassOrInterfaceAsParent: "+hasCurrentClassOrInterfaceOtherClassOrInterfaceAsParent)

        if(hasCurrentClassOrInterfaceOtherClassOrInterfaceAsParent){
            return;
        }

        /**
         * Fields declared in a superclass
         * Are maybe new fields and not inherited fields
         * Or are overridden fields
         * In both cases, we need to check them
         */

        let analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces = this.options.analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces;
        let currentClassParameters = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(currentClass, softwareProjectDicts, analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces);
        if(debug) console.log("currentClassParameters: "+currentClassParameters.length)
        if(debug) console.log(JSON.stringify(currentClassParameters, null, 2))

        let otherClassParameters = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(otherClass, softwareProjectDicts, analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces);
        if(debug) console.log("otherClassParameters: "+otherClassParameters.length)
        if(debug) console.log(JSON.stringify(otherClassParameters, null, 2))

        let ignoreFieldModifiers = false; // From: https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 "These data fields should have same signatures (same names, same data types, and same access modifiers)."
        let commonFieldParameterPairKeys = DetectorUtils.getCommonParameterPairKeys(currentClassParameters, otherClassParameters, this.options.similarityModifierOfVariablesWithUnknownType, ignoreFieldModifiers);

        let amountOfCommonFieldParameters = commonFieldParameterPairKeys.length;

        if(debug) console.log("amountOfCommonFieldParameters: "+amountOfCommonFieldParameters)
        if(amountOfCommonFieldParameters < this.options.sharedFieldsToFieldsAmountMinimum){ //
            return; // DataclumpsInspection.java line 410
        }

        let [currentParameters, commonFieldParamterKeysAsKey] = DetectorUtils.getCurrentAndOtherParametersFromCommonParameterPairKeys(commonFieldParameterPairKeys, currentClassParameters, otherClassParameters);

        let fileKey = currentClass.file_path;
        let data_clump_type = DetectorDataClumpsFields.TYPE;

        let probability = DetectorUtils.calculateProbabilityOfDataClumpsFields(currentClassWholeHierarchyKnown, otherClassWholeHierarchyKnown, commonFieldParameterPairKeys, this.options.fieldsOfClassesWithUnknownHierarchyProbabilityModifier);

        if(debug) console.log("probability: "+probability)

        let dataClumpContext: DataClumpTypeContext = {
            type: "data_clump",
            key: data_clump_type+"-"+fileKey+"-"+currentClass.key+"-"+otherClass.key+"-"+commonFieldParamterKeysAsKey, // typically the file path + class name + method name + parameter names

            probability: probability,

            from_file_path: fileKey,
            from_class_or_interface_name: currentClass.name,
            from_class_or_interface_key: currentClass.key,
            from_method_name: null,
            from_method_key: null,

            to_file_path: otherClass.file_path,
            to_class_or_interface_key: otherClass.key,
            to_class_or_interface_name: currentClass.name,
            to_method_key: null,
            to_method_name: null,

            data_clump_type: data_clump_type, // "parameter_data_clump" or "field_data_clump"
            data_clump_data: currentParameters
        }
        dataClumpsFieldParameters[dataClumpContext.key] = dataClumpContext;
    }

    public static getMemberFieldsFromClassOrInterface(currentClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts, analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces): MemberFieldParameterTypeContext[]{
        let totalClassFields: MemberFieldParameterTypeContext[] = [];

        let currentClassFields = currentClassOrInterface.fields;
        let currentClassFieldKeys = Object.keys(currentClassFields);
        for (let fieldKey of currentClassFieldKeys) {
            let currentClassField = currentClassFields[fieldKey];
            if(!currentClassField.ignore){
                // DONE: The parser itself should set the Flag if we should ignore this field.
                totalClassFields.push(currentClassField);
            }
        }

        // A class can inherit all members from its superclass
        // An interface can inherit all members from its superinterfaces or abstract interfaces
        if(analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces){
            let superclassesDict = currentClassOrInterface.extends_ // {Batman: 'Batman.java/class/Batman'}
            let superclassNames = Object.keys(superclassesDict);
            for (let superclassName of superclassNames) {
                // superclassName = 'Batman'
                let superClassKey = superclassesDict[superclassName];
                // superClassKey = 'Batman.java/class/Batman'
                let superclass = softwareProjectDicts.dictClassOrInterface[superClassKey];
                let superclassFields = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(superclass, softwareProjectDicts, true);
                totalClassFields = totalClassFields.concat(superclassFields);
            }
        }

        return totalClassFields;
    }
}
