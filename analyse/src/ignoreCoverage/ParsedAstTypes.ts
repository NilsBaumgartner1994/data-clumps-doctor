import {Dictionary} from "./UtilTypes";
import {SoftwareProjectDicts} from "./SoftwareProject";

export class AstPosition{
    public startLine: any;
    public startColumn: any;
    public endLine: any;
    public endColumn: any
}

export class AstElementTypeContext {
    public name: string;
    public key: string;
    public type: string | undefined | null;
    public hasTypeVariable: boolean;
    public position: AstPosition | undefined;

    
    public constructor(key, name, type){
        this.key = key;
        this.name = name;
        this.type = type;
        this.hasTypeVariable = false;
    }
}

export class VariableTypeContext extends AstElementTypeContext{
    public modifiers: string[] | undefined;
    public ignore: boolean;

    
    public constructor(key, name, type, modifiers, ignore){
        super(key, name, type);
        this.modifiers = modifiers;
        this.ignore = ignore;
    }

    /**
     * Returns a number between 0 and 1. 1 means the parameters are equal, 0 means they are not equal at all.
     * @param otherParameter The other parameter to compare with.
     * @param similarityModifierOfVariablesWithUnknownType The similarity modifier for variables with unknown type.
     * @param ignoreParameterModifiers If true, the modifiers are ignored like "public" or "private". This is required for method parameters because they can't have "public" or "private" modifiers and therefore a comparison with data fields would be wrong and always return 0. But for data fields compared to other data fields, the modifiers should be considered and therefore this option shall be true.
     * @returns A number representing the similarity between the parameters.
     * @throws {Error} If an error occurs during the comparison process.
     */
    public isSimilarTo(otherParameter: VariableTypeContext, similarityModifierOfVariablesWithUnknownType: number, ignoreParameterModifiers: boolean): number{
        //TODO: we need to check the similarity of the name
        // https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 page 164
        // not only the data fields with same
        // signatures (same name, same data type, same access
        // modifier), but also data fields with similar signatures (similar
        // name, same data type, same access modifier)
        let sameType = (!!this.type && !!otherParameter.type && this.type === otherParameter.type) || (!this.type && !otherParameter.type);

        let baseSimilarity = 1;
        if(!ignoreParameterModifiers){ // because method parameters can't have "public" or "private" modifiers, a comparison with data fields would be wrong and always return 0. Therefore support a variable to ignore the modifiers
            baseSimilarity *= this.getSimilarityModifierOfSameVariableModifiers(otherParameter)
        }
        // TODO: Add ignore Type
        if(!sameType){
            if(similarityModifierOfVariablesWithUnknownType > 0){
                baseSimilarity *= similarityModifierOfVariablesWithUnknownType;
            } else {
                baseSimilarity *= 0;
            }
        }

        baseSimilarity *= this.isSimilarName(this.name, otherParameter.name);

        return baseSimilarity
    }

    /**
     * Get the similarity modifier of same variable modifiers.
     * @param otherParameter The other variable type context to compare with.
     * @returns Returns the similarity modifier (0 if modifiers are not the same, 1 if they are the same).
     * @throws {Error} Throws an error if there is an issue with comparing the modifiers.
     */
    public getSimilarityModifierOfSameVariableModifiers(otherParameter: VariableTypeContext){
        let sameModifiers = this.haveSameModifiers(otherParameter);
        if(!sameModifiers){
            return 0
        } else {
            return 1;
        }
    }

    /**
     * Check if two names are similar.
     * @param nameA - The first name to compare.
     * @param nameB - The second name to compare.
     * @returns 0 if the names are not similar, 1 if they are similar.
     * @throws {Error} Throws an error if nameA or nameB is not a string.
     */
    public isSimilarName(nameA: string, nameB: string){
        let sameName = nameA === nameB;
        if(!sameName){
            return 0;
        }
        return 1;
    }

    /**
     * Check if the current parameter has the same modifiers as the other parameter.
     * @param otherParameter - The other parameter to compare with.
     * @returns true if both parameters have the same modifiers, false otherwise.
     * @throws {Error} - Throws an error if there is an issue with comparing the modifiers.
     */
    public haveSameModifiers(otherParameter: VariableTypeContext){
        let sameModifiers = true;
        let bothHaveModifiers = this.modifiers !== undefined && otherParameter.modifiers !== undefined;
        if(bothHaveModifiers){
            // check if both have all modifiers but the order can be different
            // @ts-ignore
            let weHaveAllModifiersOtherHas = this.allKeysInArray(this.modifiers, otherParameter.modifiers);
            // @ts-ignore
            let otherHasAllModifiersWeHave = this.allKeysInArray(otherParameter.modifiers, this.modifiers);
            sameModifiers = weHaveAllModifiersOtherHas && otherHasAllModifiersWeHave;
        } else {
            let bothHaveNoModifiers = this.modifiers === undefined && otherParameter.modifiers === undefined;
            if(bothHaveNoModifiers){
                sameModifiers = true;
            } else {
                sameModifiers = false;
            }
        }
        return sameModifiers;
    }

    /**
     * Checks if all keys in array1 are present in array2.
     * @param array1 The first array of keys to check.
     * @param array2 The second array to check for the presence of keys.
     * @returns Returns true if all keys in array1 are present in array2, otherwise returns false.
     */
    private allKeysInArray(array1: string[], array2: string[]){
        for(let i = 0; i < array1.length; i++){
            let key = array1[i];
            if(array2.indexOf(key) === -1){
                return false;
            }
        }
        return true;
    }
}

export class ParameterTypeContextUtils{
    /**
     * Converts the parameter type context to a string representation.
     * @param parameterTypeContext The variable type context to convert.
     * @returns A string representation of the parameter type context.
     * @throws If the parameterTypeContext is null or undefined.
     */
    public static parameterToString(parameterTypeContext: VariableTypeContext){
        return `{${parameterTypeContext.type} ${parameterTypeContext.name}}`;
    }

    /**
     * Converts an array of VariableTypeContext objects to a string representation.
     * @param parameters - An array of VariableTypeContext objects to be converted to string.
     * @returns A string representation of the parameters array.
     * @throws {Error} If the parameters array is empty.
     */
    public static parametersToString(parameters: VariableTypeContext[]){
        let orderedParameters = parameters.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        let parametersString = "[";
        for(let i = 0; i < orderedParameters.length; i++){
            parametersString += ParameterTypeContextUtils.parameterToString(orderedParameters[i]);
            if(i < orderedParameters.length - 1){
                parametersString += ", ";
            }
        }
        parametersString += "]";
        return parametersString;
    }
}

export class ClassOrInterfaceTypeContext extends AstElementTypeContext{
    public modifiers: string[] | undefined;
    public fields: Dictionary<MemberFieldParameterTypeContext>;
    public methods: Dictionary<MethodTypeContext>;
    public file_path: string;
    public anonymous: boolean;
    public auxclass: boolean; // true: wont be analysed. the class is only an aux class in order to support the hierarchy.

    public implements_: string[]
    public extends_: string[] // Languages that support multiple inheritance include: C++, Common Lisp

    public definedInClassOrInterfaceTypeKey: string | undefined; // key of the class or interface where this class or interface is defined

    //dict of classes with name as key
    public innerDefinedClasses: Dictionary<ClassOrInterfaceTypeContext>;
    public innerDefinedInterfaces: Dictionary<ClassOrInterfaceTypeContext>;

    /**
     * Creates a new instance of ClassOrInterfaceTypeContext from the provided object.
     * 
     * @param obj The object to create the instance from.
     * @returns A new instance of ClassOrInterfaceTypeContext.
     * @throws {Error} If the provided object is not valid or if any of the internal operations fail.
     */
    public static fromObject(obj: ClassOrInterfaceTypeContext){
        //console.log("Copy ClassOrInterfaceTypeContext");

        // @ts-ignore
        let instance = new ClassOrInterfaceTypeContext();
        Object.assign(instance, obj);
        for(let fieldKey of Object.keys(instance.fields)){
            instance.fields[fieldKey] = MemberFieldParameterTypeContext.fromObject(instance.fields[fieldKey]);
        }
        for(let methodKey of Object.keys(instance.methods)){
            instance.methods[methodKey] = MethodTypeContext.fromObject(instance.methods[methodKey]);
        }
        for(let innerDefinedClassKey of Object.keys(instance.innerDefinedClasses)){
            instance.innerDefinedClasses[innerDefinedClassKey] = ClassOrInterfaceTypeContext.fromObject(instance.innerDefinedClasses[innerDefinedClassKey]);
        }
        for(let innerDefinedInterfaceKey of Object.keys(instance.innerDefinedInterfaces)){
            instance.innerDefinedInterfaces[innerDefinedInterfaceKey] = ClassOrInterfaceTypeContext.fromObject(instance.innerDefinedInterfaces[innerDefinedInterfaceKey]);
        }

        //console.log("Copy ClassOrInterfaceTypeContext finished");
        return instance;
    }

    
    public constructor(key, name, type, file_path){
        super(key, name, type);
        this.file_path = file_path;
        this.name = name;
        this.modifiers = [];
        this.fields = {};
        this.methods = {};
        this.innerDefinedClasses = {};
        this.innerDefinedInterfaces = {};
        this.implements_ = [];
        this.extends_ = [];
        this.anonymous = false;
        this.auxclass = false;
    }

    /**
     * Check if the given class or interface is a subclass, interface, or parent of another class or interface.
     * @param possibleSubOrSuperClassOrInterface The class or interface to check against.
     * @param softwareProjectDicts The dictionary of software projects.
     * @throws {Error} Throws an error if the comparison fails.
     * @returns {boolean} Returns true if the given class or interface is a subclass, interface, or parent of another class or interface; otherwise, returns false.
     */
    public isSubClassOrInterfaceOrParentOfOtherClassOrInterface(possibleSubOrSuperClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts){
        let isSubClassOf = this.isSubClassOrInterfaceOfOtherClassOrInterface(possibleSubOrSuperClassOrInterface, softwareProjectDicts);
        if(isSubClassOf){
            return true;
        }
        let isParentClassOf = possibleSubOrSuperClassOrInterface.isSubClassOrInterfaceOfOtherClassOrInterface(this, softwareProjectDicts);
        if(isParentClassOf){
            return true
        }
        return false;
    }

    /**
     * Check if the given class or interface is a subclass or interface of another class or interface.
     * @param possibleSuperClassOrInterface The class or interface to check against.
     * @param softwareProjectDicts The dictionary containing software project information.
     * @throws {Error} Throws an error if the provided class or interface is not found in the dictionary.
     * @returns {boolean} Returns true if the given class or interface is a subclass or interface of another class or interface; otherwise, returns false.
     */
    public isSubClassOrInterfaceOfOtherClassOrInterface(possibleSuperClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts){
        let superClassesAndInterfacesKeys = this.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
        let possibleSuperClassOrInterfaceKey = possibleSuperClassOrInterface.key;
        return !!superClassesAndInterfacesKeys[possibleSuperClassOrInterfaceKey]
    }

    /**
     * Checks if the whole hierarchy is known for the given software project dictionaries.
     * @param softwareProjectDicts The software project dictionaries containing class or interface information.
     * @throws Throws an error if the super classes or interfaces are not found in the dictionary.
     * @returns Returns true if the whole hierarchy is known, otherwise false.
     */
    public isWholeHierarchyKnown(softwareProjectDicts: SoftwareProjectDicts){
        let currentClassOrInterface = this;
        //console.log("-- currentClassOrInterface.key: "+currentClassOrInterface?.key)
        let superClassesOrInterfacesKeys = currentClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
        //console.log("-- superClassesOrInterfacesKeys");
        //console.log(superClassesOrInterfacesKeys);
        for(let superClassesOrInterfaceKey of superClassesOrInterfacesKeys){
            let superClassesOrInterface = softwareProjectDicts.dictClassOrInterface[superClassesOrInterfaceKey];
            if(!superClassesOrInterface){
                //console.log("Found no superClassesOrInterface for: "+superClassesOrInterfaceKey);
                //console.log("The hierarchy is therefore not complete");
                return false;
            }
        }

        return true;
    }

    /**
     * Checks if the whole hierarchy is known and prints unknown if not
     * @param softwareProjectDicts - The dictionary of software projects
     * @throws {Error} - Throws an error if superClassesOrInterface is not found
     * @returns {boolean} - Returns true if the hierarchy is known, otherwise false
     */
    public isWholeHierarchyKnownPrintUnknown(softwareProjectDicts: SoftwareProjectDicts){
        let currentClassOrInterface = this;
        console.log("-- currentClassOrInterface.key: "+currentClassOrInterface?.key)
        let superClassesOrInterfacesKeys = currentClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
        console.log("-- superClassesOrInterfacesKeys");
        console.log(superClassesOrInterfacesKeys);
        for(let superClassesOrInterfaceKey of superClassesOrInterfacesKeys){
            // remove generics from key --> no we dont do that --> fix the AST parser instead
            //let superClassesOrInterfaceKeyWithoutGenerics = superClassesOrInterfaceKey.split("<")[0];
            //superClassesOrInterfaceKey = superClassesOrInterfaceKeyWithoutGenerics;
            let superClassesOrInterface = softwareProjectDicts.dictClassOrInterface[superClassesOrInterfaceKey];
            if(!superClassesOrInterface){
                console.log("Found no superClassesOrInterface for: "+superClassesOrInterfaceKey);
                console.log("The hierarchy is therefore not complete");
                return false;
            }
        }

        return true;
    }

    /**
     * Retrieves the keys of super classes and interfaces for the given software project dictionaries.
     * 
     * @param softwareProjectDicts The software project dictionaries to retrieve keys from.
     * @param recursive Flag to indicate whether to retrieve keys recursively.
     * @param checkedKeys The dictionary of checked keys.
     * @param level The level of recursion.
     * @returns An array of keys representing the super classes and interfaces.
     * @throws {Error} Throws an error if there is an issue with retrieving the keys.
     */
    public getSuperClassesAndInterfacesKeys(softwareProjectDicts: SoftwareProjectDicts, recursive: boolean, checkedKeys: Dictionary<string | null> = {}, level=0): any[] {
        //console.log(level+" - getSuperClassesAndInterfacesKeys for: "+this.key);
        //console.log(this);
        let foundKeys: Dictionary<string | null> = {};

        if(!checkedKeys){
            checkedKeys = {};
        }
        checkedKeys[this.key] = this.key;

        let extendingClassesOrInterfacesKeys: string[] = []
        let extendingKeys = this.extends_;
        for(let extendingKey of extendingKeys){
            extendingClassesOrInterfacesKeys.push(extendingKey)
        }
        let implementsKeys = this.implements_;
        for(let implementsKey of implementsKeys){
            extendingClassesOrInterfacesKeys.push(implementsKey)
        }

        //console.log("implements and extends");
        //console.log(JSON.parse(JSON.stringify(extendingClassesOrInterfacesKeys)))

        for(let extendingClassesOrInterfacesKey of extendingClassesOrInterfacesKeys){
            if(!checkedKeys[extendingClassesOrInterfacesKey]){
                let newFinding = !foundKeys[extendingClassesOrInterfacesKey];
                if(newFinding){
                    foundKeys[extendingClassesOrInterfacesKey] = extendingClassesOrInterfacesKey;
                    if(recursive){
                        let foundClassOrInterface = softwareProjectDicts.dictClassOrInterface[extendingClassesOrInterfacesKey];
                        if(!!foundClassOrInterface){
                            //console.log("--> Recursive call for: "+foundClassOrInterface.key)
                            let recursiveFindings = foundClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, recursive, checkedKeys, level+1);
                            //console.log("<-- Recursive call endet");
                            for(let recursiveFindingKey of recursiveFindings){
                                let newRecursiveFinding = !foundKeys[recursiveFindingKey];
                                if(newRecursiveFinding){
                                    foundKeys[recursiveFindingKey] = recursiveFindingKey;
                                }
                            }
                        }
                    }
                }
            }
        }

        let superClassesAndInterfacesKeys = Object.keys(foundKeys);
        return superClassesAndInterfacesKeys;
    }
}

export class MemberFieldParameterTypeContext extends VariableTypeContext{
    public classOrInterfaceKey: string;

    
    public constructor(key, name, type, modifiers, ignore, classOrInterface: ClassOrInterfaceTypeContext){
        super(classOrInterface?.key+"/"+"memberField"+"/"+key, name, type, modifiers, ignore);
        this.classOrInterfaceKey = classOrInterface?.key;
    }

    /**
     * Create a MemberFieldParameterTypeContext instance from an object.
     * @param obj The object to create the instance from.
     * @returns A new instance of MemberFieldParameterTypeContext.
     * @throws {Error} If obj is not provided.
     */
    public static fromObject(obj: MemberFieldParameterTypeContext){
        //console.log("MemberFieldParameterTypeContext fromObject")
        // @ts-ignore
        let instance = new MemberFieldParameterTypeContext();
        Object.assign(instance, obj);
        return instance;
    }
}

export class MethodParameterTypeContext extends VariableTypeContext{
    public methodKey: string;

    /**
     * Creates a new instance of MethodParameterTypeContext from the provided object.
     * 
     * @param obj The object to create the instance from.
     * @returns A new instance of MethodParameterTypeContext.
     * @throws {Error} If the provided object is not of type MethodParameterTypeContext.
     */
    public static fromObject(obj: MethodParameterTypeContext){
        // @ts-ignore
        let instance = new MethodParameterTypeContext();
        Object.assign(instance, obj);
        return instance;
    }

    
    public constructor(key, name, type, modifiers, ignore, method: MethodTypeContext){
        super(method?.key+"/parameter/"+key, name, type, modifiers, ignore);
        this.methodKey = method?.key;
    }
}

export class MethodTypeContext extends AstElementTypeContext{
    public modifiers: string[];
    public overrideAnnotation: boolean
    public returnType: string | undefined;
    public parameters: MethodParameterTypeContext[];
    public classOrInterfaceKey: string;

    /**
     * Creates a MethodTypeContext instance from the given object.
     * @param obj The object to create the MethodTypeContext instance from.
     * @throws {Error} Throws an error if the obj parameter is not of type MethodTypeContext.
     * @returns A new MethodTypeContext instance created from the given object.
     */
    public static fromObject(obj: MethodTypeContext){
        // @ts-ignore
        let instance = new MethodTypeContext();
        Object.assign(instance, obj);
        for(let i=0; i<instance.parameters.length; i++){
            instance.parameters[i] = MethodParameterTypeContext.fromObject(instance.parameters[i]);
        }
        return instance;
    }

    
    public constructor(key, name, type, overrideAnnotation: boolean, classOrInterface: ClassOrInterfaceTypeContext){
        super(classOrInterface?.key+"/method/"+key, name, type);
        this.modifiers = [];
        this.parameters = [];
        this.classOrInterfaceKey = classOrInterface?.key;
        this.overrideAnnotation = overrideAnnotation;
    }

    /**
     * Get the method signature.
     * @returns {string} The method signature.
     * @throws {Error} If there is an error in getting the method signature.
     */
    public getMethodSignature(){
        let methodSignature = this.name+"(";
        for(let i = 0; i < this.parameters.length; i++){
            let parameter = this.parameters[i];
            methodSignature += parameter.type;
            if(i < this.parameters.length - 1){
                methodSignature += ", ";
            }
        }
        methodSignature += ")";
        return methodSignature;
    }

    /**
     * Checks if the method has the same signature as another method.
     * @param otherMethod The other method to compare with.
     * @throws {Error} Throws an error if the number of parameters is different.
     * @throws {Error} Throws an error if the method signatures are different.
     * @returns {boolean} Returns true if the methods have the same signature, otherwise false.
     */
    public hasSameSignatureAs(otherMethod: MethodTypeContext){
        let hasSameSignature = true;

        if(this.parameters.length !== otherMethod.parameters.length){
            hasSameSignature = false;
        } else {
            let thisMethodSignature = this.getMethodSignature();
            let otherMethodSignature = otherMethod.getMethodSignature();
            if(thisMethodSignature !== otherMethodSignature){
                hasSameSignature = false;
            }
        }
        return hasSameSignature;
    }

    /**
     * Retrieves the class or interface based on the provided method type context and software project dictionaries.
     * @param method The method type context.
     * @param softwareProjectDicts The software project dictionaries.
     * @returns The current class or interface based on the provided method type context.
     * @throws If the current class or interface is not found in the software project dictionaries.
     */
    public static getClassOrInterface(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts){
        let currentClassOrInterfaceKey = method.classOrInterfaceKey;
        let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[currentClassOrInterfaceKey];
        return currentClassOrInterface;
    }

    /**
     * Check if the whole hierarchy is known for a given method.
     * @param method The method type context.
     * @param softwareProjectDicts The software project dictionaries.
     * @throws {Error} Throws an error if the current class or interface is not found.
     */
    public static isWholeHierarchyKnown(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts){
        //console.log("isWholeHierarchyKnown?: method.key: "+method?.key);
        //console.log("softwareProjectDicts.dictClassOrInterface")
        //console.log(softwareProjectDicts.dictClassOrInterface);


        let currentClassOrInterface = MethodTypeContext.getClassOrInterface(method, softwareProjectDicts);
        return currentClassOrInterface.isWholeHierarchyKnown(softwareProjectDicts);
    }


    /**
     * Check if the method is inherited from a parent class or interface.
     * @param softwareProjectDicts - The dictionary containing the software project data.
     * @throws {Error} - Throws an error if the superClassOrInterface could not be found.
     * @returns {boolean} - Returns true if the method is inherited, otherwise false.
     */
    public isInheritedFromParentClassOrInterface(softwareProjectDicts: SoftwareProjectDicts){
        // In Java we can't rely on @Override annotation because it is not mandatory: https://stackoverflow.com/questions/4822954/do-we-really-need-override-and-so-on-when-code-java
        if(this.overrideAnnotation){
            return true;
        }
        // Since the @Override is not mandatory, we need to dig down deeper by ourself

        let isInherited = false;
        let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[this.classOrInterfaceKey];
        if(currentClassOrInterface){
            // DONE: we should check if all superClassesAndInterfaces are found
            // We will check this in DetectorDataClumpsMethods.ts with method: isWholeHierarchyNotKnown(

            let superClassesOrInterfacesKeys = currentClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
            for(let superClassOrInterfaceKey of superClassesOrInterfacesKeys){
                //console.log("superClassOrInterfaceKey: "+superClassOrInterfaceKey)
                let superClassOrInterface = softwareProjectDicts.dictClassOrInterface[superClassOrInterfaceKey];
                if(!!superClassOrInterface){
                    let superClassOrInterfaceMethodsDict = superClassOrInterface.methods;
                    let superClassOrInterfaceMethodsKeys = Object.keys(superClassOrInterfaceMethodsDict);
                    for(let superClassOrInterfaceMethodsKey of superClassOrInterfaceMethodsKeys){
                        //console.log("-- superClassOrInterfaceMethodsKey: "+superClassOrInterfaceMethodsKey)
                        let superClassOrInterfaceMethod = superClassOrInterfaceMethodsDict[superClassOrInterfaceMethodsKey];
                        if(this.hasSameSignatureAs(superClassOrInterfaceMethod)){
                            isInherited = true;
                            return isInherited;
                        }
                    }
                } else {
                    //console.log("A superClassOrInterface could not be found: "+superClassOrInterfaceKey)
                    //console.log("It might be, that this is a library import")
                }
            }
        }
        //console.log("++++++++++++++")
        return isInherited;
    }

}
