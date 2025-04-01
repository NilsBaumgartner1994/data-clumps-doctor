import {SoftwareProjectDicts} from "../SoftwareProject";
import {DetectorDataClumpsMethods} from "./DetectorDataClumpsMethods";
import {DetectorDataClumpsFields} from "./DetectorDataClumpsFields";
import {DataClumpsTypeContext} from "data-clumps-type-context";
import {Timer} from "../Timer";
import path from "path";
import fs from "fs";
import {DetectorDataClumpsMethodsToOtherFields} from "./DetectorDataClumpsMethodsToOtherFields";
import {DetectorDataClumpsMethodsToOtherMethods} from "./DetectorDataClumpsMethodsToOtherMethods";
import {
    ClassOrInterfaceTypeContext,
    MemberFieldParameterTypeContext,
    MethodParameterTypeContext,
    MethodTypeContext, VariableTypeContext
} from "../ParsedAstTypes";
import {DetectorUtils} from "./DetectorUtils";

let detector_version = "unknown";
let reportVersion = "unknown";

try {
    const packageJsonPath = path.join(__dirname, '..','..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    detector_version = packageJson.version;
} catch (e) {
    console.log("Could not read package.json to get version of detector");
}

try {
    const packageJsonLockPath = path.join(__dirname, '..','..', '..', 'package-lock.json');
    const packageJsonLock = JSON.parse(fs.readFileSync(packageJsonLockPath, 'utf8'));
    reportVersion = packageJsonLock?.dependencies?.["data-clumps-type-context"]?.version || "unknown";
} catch (e) {
    console.log("Could not read package-lock.json to get version of report");
}


const defaultValueField = "defaultValue";

type DetectorOptionInformationParameter = {
    label: string;
    description: string;
    [defaultValueField]: any
    group: any;
    type: any;
}

export class DetectorOptionsInformation {

    /**
     * TODO: name similarity:
     *  - ignore case: boolean
     *  - ignore underscores: boolean
     *  - use levenshtein distance: boolean
     *  - use jaro winkler distance: boolean
     *  - use jaccard similarity: boolean
     *  - use ngram similarity: boolean
     */

    /**
     * TODO: Explain the resulting probability modifiers in the report?
     * Example: probability: 0.7
     *  - name_similarity: 0.8
     *  - type_similarity: 0.9
     *  - whole_hierarchy_known: 0.5
     *  - ...
     */

    /**
     * TODO: Probability threshold for data clumps?
     */

    public static fastDetection: DetectorOptionInformationParameter = {
        label: "Use Fast Detection",
        description: "If set to true, the detector will use a fast detection algorithm. Default value is true. Names, Types and other variables are only equal if they are exactly the same.",
        defaultValue: true,
        group: "all",
        type: "boolean"
    }

    /**
     * Fields
     */
    public static typeVariablesConsidered: DetectorOptionInformationParameter = {
        label: "Types Variables Considered",
        description: "In Java Generics like: List<T> have a variable Type. On the other hand List<Number> has not (type argument). Default value is false, so variable types will not be considered.",
        defaultValue: false,
        group: "all",
        type: "boolean"
    }

    public static similarityModifierOfVariablesWithUnknownType: DetectorOptionInformationParameter = {
        label: "Similarity of Variables Ignores Unknown Type",
        description: "Default value is 0. Range [0,1]. For example in class diagrams types are not always explicitly shown and therefore unknown. If set to true, the detector will ignore unknown types of variables when checking for similarity. Setting it to true may result in faulty detection of data clumps.",
        defaultValue: 0,
        group: "all",
        type: "float"
    }

    public static fieldsOfClassesWithUnknownHierarchyProbabilityModifier: DetectorOptionInformationParameter = {
        label: "Probability for Data Clumps in analyzed Classes with Unknown Hierarchy",
        description: "If set not to 0, the detector will analyze classes that are not part of a known hierarchy of related classes. Range [0,1]. Default value is true. If set to 1, it may find more data clumps but they are maybe false positive, but they have a lower probability score.",
        defaultValue: 0,
        group: "method",
        type: "float"
    }

    public static sharedFieldsToFieldsAmountMinimum: DetectorOptionInformationParameter = {
        label: "Minimum Number of Shared Fields",
        description: "The minimum number of fields that classes must share to be considered related. Default value is 3. The lower the value, the more data clumps will be found.",
        defaultValue: 3,
        group: "field",
        type: "number"
    }
    /**
    public static sharedFieldParametersCheckIfAreSubtypes: DetectorOptionInformationParameter = {
        label: "Check Subtyping of Shared Fields",
        description: "If set to true, the detector will check if shared fields in related classes are subtypes of each other. Default value is false.",
        defaultValue: false,
        group: "field",
        type: "boolean"
    }
     */

    public static analyseFieldsInClassesOrInterfacesInheritedFromSuperClassesOrInterfaces: DetectorOptionInformationParameter = {
        label: "Class or Interface inherits all fields from super class or interface",
        description: "If set to true, the detector will use all inherited fields from its super class (and their superclasses) for comparison. Default value is false. We do not consider them since it is not might not be obvious to the user and by definition it is not in one 'place'. If set to true, we it may find more data clumps.",
        defaultValue: false,
        group: "field",
        type: "boolean"
    }

    /**
     * Methods
     */

    public static sharedParametersToParametersAmountMinimum: DetectorOptionInformationParameter = {
        label: "Minimum Number of Shared Method Parameters",
        description: "The minimum number of method parameters that a method must share to be considered related. Default value is 3. The lower the value, the more data clumps will be found.",
        defaultValue: 3,
        group: "method",
        type: "number"
    }

    public static sharedParametersToFieldsAmountMinimum: DetectorOptionInformationParameter = {
        label: "Minimum Number of Shared Method Parameters to Fields",
        description: "The minimum number of method parameters that a method must share with class fields to be considered related. Default value is 3. The lower the value, the more data clumps will be found.",
        defaultValue: 3,
        group: "method",
        type: "number"
    }

    /**
    public static sharedMethodParametersHierarchyConsidered: DetectorOptionInformationParameter = {
        label: "Consider Hierarchy for Shared Method Parameters",
        description: "If set to true, the detector will consider the hierarchy of classes when checking for shared method parameters. Default value is false.",
        defaultValue: false,
        group: "method",
        type: "boolean"
    }
    */

    public static methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier: DetectorOptionInformationParameter = {
        label: "Probability of Data Clumps in analyzed Methods of Classes with Unknown Hierarchy",
        description: "If set not to 0, the detector will analyze methods of classes that are not part of a known hierarchy of related classes. Range [0,1]. Default value is 0. If set not to 0, it may find more data clumps but they are maybe false positive, but they have a lower probability score.",
        defaultValue: 0,
        group: "method",
        type: "float"
    }
}

export type DetectorOptions = {
    [K in keyof typeof DetectorOptionsInformation]: any;
};



function getDefaultValuesFromPartialOptions(partialOptions: Partial<DetectorOptions>): DetectorOptions{
    // @ts-ignore
    let result: DetectorOptions = {}

    let DetectorOptionsKeys = Object.keys(DetectorOptionsInformation);
    //console.log(DetectorOptionsKeys)

    for (const key of DetectorOptionsKeys) {
        const attributeKey = key;

        if (DetectorOptionsInformation.hasOwnProperty(attributeKey)) {
            const parameter: DetectorOptionInformationParameter = DetectorOptionsInformation[attributeKey];

            if (partialOptions.hasOwnProperty(attributeKey)) {
                result[attributeKey] = partialOptions[attributeKey]!;
            } else if (parameter.hasOwnProperty(defaultValueField)) {
                result[attributeKey] = parameter[defaultValueField];
            }
        } else {
            result[attributeKey] = "";
        }
    }

    return result;
}

/**
 * The idea is to have all fields to show to their class and all parameters to show to their method.
 */
export class InvertedIndexSoftwareProject {

    public softwareProjectDicts: SoftwareProjectDicts;
    public fieldKeyForFieldFieldDataClumpToClassOrInterfaceKey: Record<string, Record<string, string>> = {};
    public parameterKeyForParameterParameterDataClumpToMethodKey: Record<string, Record<string, string>> = {};
    public fieldKeyForParameterFieldDataClumpToClassOrInterfaceKey: Record<string, Record<string, string> | undefined> = {};

    public options: DetectorOptions;

    private getVariableKeyForIndex(variable: VariableTypeContext){
        let key = "";
        if(this.options.similarityModifierOfVariablesWithUnknownType!==1){
            key += variable.type + " ";
        }
        key += variable.name;
        return key;
    }

    private getFieldFieldKeyForField(field: MemberFieldParameterTypeContext){
        let modifiers = field.modifiers;
        let modifiersString = "";
        if(!!modifiers){
            modifiersString = modifiers.join(" ");
        }
        let signature = "";
        if(modifiersString.length>0){
            signature = modifiersString + " ";
        }
        return signature+this.getVariableKeyForIndex(field);
    }

    private getParameterParameterKeyForParameter(parameter: MethodParameterTypeContext){
        return this.getVariableKeyForIndex(parameter);
    }

    private getParameterFieldKeyForParameter(parameter: MethodParameterTypeContext){
        return this.getVariableKeyForIndex(parameter);
    }

    private getParameterFieldKeyForField(field: MemberFieldParameterTypeContext){
        return this.getVariableKeyForIndex(field);
    }

    public getPossibleMethodsForParameterParameterDataClump(currentMethod: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts){
        let methodRecordCounting: Record<string, {
            amountFound: number,
        }> = {};
        let methodParameters = currentMethod.parameters;
        for(let methodParameter of methodParameters){
            let invertedFieldKey = this.getParameterParameterKeyForParameter(methodParameter);
            let methodsHavingParameter = this.parameterKeyForParameterParameterDataClumpToMethodKey[invertedFieldKey];
            let methodsHavingParameterKeys = Object.keys(methodsHavingParameter);
            for(let methodHavingParameterKey of methodsHavingParameterKeys){
                if(!methodRecordCounting[methodHavingParameterKey]){
                    methodRecordCounting[methodHavingParameterKey] = {
                        amountFound: 0,
                    }
                }
                methodRecordCounting[methodHavingParameterKey].amountFound++;
            }
        }

        let otherMethodKeys = Object.keys(methodRecordCounting);
        let otherMethods: MethodTypeContext[] = [];
        for(let otherMethodKey of otherMethodKeys){
            let otherMethod = softwareProjectDicts.dictMethod[otherMethodKey];
            if(otherMethod.key!==currentMethod.key){
                otherMethods.push(otherMethod);
            }
        }
        return otherMethods;
    }

    public getPossibleClassesOrInterfacesForParameterFieldDataClump(currentMethod: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts){
        let recordClassesNumberFound: Record<string, {
            amountFound: number,
        }> = {};
        let methodParameters = currentMethod.parameters;
        for(let methodParameter of methodParameters){
            let invertedFieldKey = this.getParameterFieldKeyForParameter(methodParameter);
            let classesHavingField = this.fieldKeyForParameterFieldDataClumpToClassOrInterfaceKey[invertedFieldKey];
            if(!!classesHavingField){
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
        }
        let otherClassesOrInterfaces: ClassOrInterfaceTypeContext[] = [];
        let otherClassOrInterfaceKeys = Object.keys(recordClassesNumberFound);
        for(let otherClassOrInterfaceKey of otherClassOrInterfaceKeys){
            let otherClassOrInterface = softwareProjectDicts.dictClassOrInterface[otherClassOrInterfaceKey];
            otherClassesOrInterfaces.push(otherClassOrInterface);
        }
        return otherClassesOrInterfaces;
    }

    public getPossibleClassesOrInterfacesForFieldFieldDataClump(currentClass: ClassOrInterfaceTypeContext, memberFieldParameters: MemberFieldParameterTypeContext[], softwareProjectDicts: SoftwareProjectDicts){
        let recordClassesNumberFound: Record<string, {
            amountFound: number,
        }> = {};
        for(let memberFieldParameter of memberFieldParameters){
            let invertedFieldKey = this.getFieldFieldKeyForField(memberFieldParameter);
            let classesHavingField = this.fieldKeyForFieldFieldDataClumpToClassOrInterfaceKey[invertedFieldKey];
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
        let otherClassesOrInterfaces: ClassOrInterfaceTypeContext[] = [];
        let otherClassOrInterfaceKeys = Object.keys(recordClassesNumberFound);
        for(let otherClassOrInterfaceKey of otherClassOrInterfaceKeys){
            let otherClassOrInterface = softwareProjectDicts.dictClassOrInterface[otherClassOrInterfaceKey];
            if(otherClassOrInterface.key!==currentClass.key){
                otherClassesOrInterfaces.push(otherClassOrInterface);
            }
        }
        return otherClassesOrInterfaces;
    }


    public constructor(softwareProjectDicts: SoftwareProjectDicts, options: DetectorOptions){
        this.softwareProjectDicts = softwareProjectDicts;
        this.options = options;
        let classOrInterfaceKeys = Object.keys(softwareProjectDicts.dictClassOrInterface);
        for(let classOrInterfaceKey of classOrInterfaceKeys){
            let classOrInterface = softwareProjectDicts.dictClassOrInterface[classOrInterfaceKey];

            let fields = DetectorDataClumpsFields.getMemberFieldsFromClassOrInterface(classOrInterface, this.softwareProjectDicts, this.options);
            for(let field of fields){
                let invertedIndexFieldKey = this.getFieldFieldKeyForField(field);
                if(!this.fieldKeyForFieldFieldDataClumpToClassOrInterfaceKey[invertedIndexFieldKey]){
                    this.fieldKeyForFieldFieldDataClumpToClassOrInterfaceKey[invertedIndexFieldKey] = {};
                }
                this.fieldKeyForFieldFieldDataClumpToClassOrInterfaceKey[invertedIndexFieldKey][classOrInterfaceKey] = classOrInterfaceKey;

                let invertedIndexParameterFieldKey = this.getParameterFieldKeyForField(field);
                if(!this.fieldKeyForParameterFieldDataClumpToClassOrInterfaceKey[invertedIndexParameterFieldKey]){
                    this.fieldKeyForParameterFieldDataClumpToClassOrInterfaceKey[invertedIndexParameterFieldKey] = {};
                }
                // @ts-ignore
                this.fieldKeyForParameterFieldDataClumpToClassOrInterfaceKey[invertedIndexParameterFieldKey][classOrInterfaceKey] = classOrInterfaceKey;
            }
        }

        let parameterKeys = Object.keys(this.softwareProjectDicts.dictMethodParameters);
        for(let parameterKey of parameterKeys){
            let parameter = softwareProjectDicts.dictMethodParameters[parameterKey];
            let invertedIndexParameterKey = this.getParameterParameterKeyForParameter(parameter);
            if(!this.parameterKeyForParameterParameterDataClumpToMethodKey[invertedIndexParameterKey]){
                this.parameterKeyForParameterParameterDataClumpToMethodKey[invertedIndexParameterKey] = {};
            }
            let methodKey = parameter.methodKey;
            this.parameterKeyForParameterParameterDataClumpToMethodKey[invertedIndexParameterKey][methodKey] = methodKey;
        }
    }
}

export class Detector {

    public options: DetectorOptions;
    public softwareProjectDicts: SoftwareProjectDicts;
    public timer: Timer;
    public progressCallback: any;
    public target_language: string;
    public project_url: string | null;
    public project_name: string;
    public project_version: string | null;
    public project_commit_hash: string | null;
    public project_tag: string | null;
    public project_commit_date: string | null;
    public additional: any;
    public detector_version: string;

    static getDefaultOptions(options?: Partial<DetectorOptions>){
        return getDefaultValuesFromPartialOptions(options || {});
    }

    public constructor(softwareProjectDicts: SoftwareProjectDicts,
                       options: Partial<DetectorOptions> | null,
                       progressCallback: any,
                       project_url: string | null,
                       project_name: string | null,
                       project_version: string | null,
                       project_commit_hash: string | null,
                       project_tag: string | null,
                       project_commit_date: string | null,
                       additional?: any,
                       target_language?: string,
    ){
        this.options = Detector.getDefaultOptions(options || {});
        this.softwareProjectDicts = softwareProjectDicts;
        this.timer = new Timer();
        this.progressCallback = progressCallback;

        this.target_language = target_language || "java";
        this.project_url = project_url || "unknown"
        this.project_name = project_name || "unknown";
        this.project_version = project_version || "unknown";
        this.project_commit_hash = project_commit_hash || "unknown";
        this.project_tag = project_tag || null;
        this.project_commit_date = project_commit_date || null;
        this.additional = additional || {};
        this.detector_version = detector_version;


        DetectorUtils.checkIfIncompatibleOptions(this.options);
    }

    public async detect(): Promise<DataClumpsTypeContext>{
        this.timer.start();

        let keys_for_classes_or_interfaces = Object.keys(this.softwareProjectDicts.dictClassOrInterface);
        let file_paths = {};
        for(let key of keys_for_classes_or_interfaces){
            let classOrInterface = this.softwareProjectDicts.dictClassOrInterface[key];
            file_paths[classOrInterface.file_path] = true;
        }

        let number_of_files = Object.keys(file_paths).length;
        let number_of_classes = keys_for_classes_or_interfaces.length;
        let number_of_methods = Object.keys(this.softwareProjectDicts.dictMethod).length;
        let number_of_data_fields = Object.keys(this.softwareProjectDicts.dictMemberFieldParameters).length;
        let number_of_method_parameters = Object.keys(this.softwareProjectDicts.dictMethodParameters).length;

        let dataClumpsTypeContext: DataClumpsTypeContext = {
            report_version: reportVersion,
            report_timestamp: new Date().toISOString(),
            target_language: this.target_language || "unkown",
            report_summary: {
                additional: null,
                amount_classes_or_interfaces_with_data_clumps: null,
                amount_files_with_data_clumps: null,
                amount_methods_with_data_clumps: null,
                fields_to_fields_data_clump: null,
                parameters_to_fields_data_clump: null,
                parameters_to_parameters_data_clump: null,
                amount_data_clumps: null,
            },
            project_info: {
                project_url: this.project_url,
                project_name: this.project_name,
                project_version: this.project_version,
                project_commit_hash: this.project_commit_hash,
                project_tag: this.project_tag,
                project_commit_date: this.project_commit_date,
                additional: this.additional,
                number_of_files: number_of_files,
                number_of_classes_or_interfaces: number_of_classes,
                number_of_methods: number_of_methods,
                number_of_data_fields: number_of_data_fields,
                number_of_method_parameters: number_of_method_parameters
            },
            detector: {
                name: "data-clumps-doctor",
                url: "https://github.com/NilsBaumgartner1994/data-clumps-doctor",
                version: this.detector_version,
                options: JSON.parse(JSON.stringify(this.options))
            },
            data_clumps: {}
        };

        let invertedIndexSoftwareProject = new InvertedIndexSoftwareProject(this.softwareProjectDicts, this.options);

        //console.log("Detecting software project for data clumps");
        //console.log(softwareProjectDicts);
        let detectorDataClumpsMethods = new DetectorDataClumpsMethods(this.options, this.progressCallback);
        let commonMethodParameters = await detectorDataClumpsMethods.detect(this.softwareProjectDicts, invertedIndexSoftwareProject);
        let commonMethodParametersKeys: any[] = []
        if(!!commonMethodParameters){
            commonMethodParametersKeys = Object.keys(commonMethodParameters);
            for (let commonMethodParametersKey of commonMethodParametersKeys) {
                let commonMethodParameter = commonMethodParameters[commonMethodParametersKey];
                dataClumpsTypeContext.data_clumps[commonMethodParameter.key] = commonMethodParameter;
            }
        }

        let detectorDataClumpsFields = new DetectorDataClumpsFields(this.options, this.progressCallback);
        let commonFields = await detectorDataClumpsFields.detect(this.softwareProjectDicts, invertedIndexSoftwareProject);
        let commonFieldsKeys: any[] = []
        if(!!commonFields){
            commonFieldsKeys = Object.keys(commonFields);
            for (let commonFieldsKey of commonFieldsKeys) {
                let commonField = commonFields[commonFieldsKey];
                dataClumpsTypeContext.data_clumps[commonField.key] = commonField;
            }
        }


        let detected_data_clumps = dataClumpsTypeContext.data_clumps;
        let data_clumps_keys = Object.keys(detected_data_clumps);
        dataClumpsTypeContext.report_summary.amount_data_clumps = data_clumps_keys.length

        let files_with_data_clumps: any = {};
        let classes_or_interfaces_with_data_clumps: any = {};
        let methods_with_data_clumps: any = {};
        for(let data_clumps_key of data_clumps_keys){
            let data_clump = detected_data_clumps[data_clumps_key];
            files_with_data_clumps[data_clump.from_file_path] = true;
            classes_or_interfaces_with_data_clumps[data_clump.from_class_or_interface_key] = true;
            files_with_data_clumps[data_clump.to_file_path] = true;
            if(!!data_clump.from_method_key){
                methods_with_data_clumps[data_clump.from_method_key] = true;
            }
            if(!!data_clump.to_method_key){
                methods_with_data_clumps[data_clump.to_method_key] = true;
            }
        }

        let amount_files_with_data_clumps = Object.keys(files_with_data_clumps).length;
        dataClumpsTypeContext.report_summary.amount_files_with_data_clumps = amount_files_with_data_clumps;
        let amount_classes_or_interfaces_with_data_clumps = Object.keys(classes_or_interfaces_with_data_clumps).length
        dataClumpsTypeContext.report_summary.amount_classes_or_interfaces_with_data_clumps = amount_classes_or_interfaces_with_data_clumps;
        let amount_methods_with_data_clumps = Object.keys(methods_with_data_clumps).length;
        dataClumpsTypeContext.report_summary.amount_methods_with_data_clumps = amount_methods_with_data_clumps;

        let data_clump_types = [DetectorDataClumpsFields.TYPE, DetectorDataClumpsMethodsToOtherFields.TYPE, DetectorDataClumpsMethodsToOtherMethods.TYPE];
        for(let data_clump_type of data_clump_types){
            let amount_for_type = 0;
            for(let data_clumps_key of data_clumps_keys){
                let data_clump = detected_data_clumps[data_clumps_key];
                if(data_clump.data_clump_type===data_clump_type){
                    amount_for_type++;
                }
            }

            dataClumpsTypeContext.report_summary[data_clump_type] = amount_for_type;
        }



        // timeout for testing

        this.timer.stop();

        //console.log("Detecting software project for data clumps (done)")

        return dataClumpsTypeContext;
    }

}
