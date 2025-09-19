// noinspection dataclump.DataClumpDetection

import { Dictionary } from './UtilTypes';
import { SoftwareProjectDicts } from './SoftwareProject';
import { SimilarityHelper } from './detector/SimilarityHelper';

// noinspection dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection
export class AstPosition {
  public startLine: any;
  public startColumn: any;
  public endLine: any;
  public endColumn: any;
}

// noinspection dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection
export class AstElementTypeContext {
  public name: string;
  public key: string;
  public type: string | undefined | null;
  public hasTypeVariable: boolean;
  public position: AstPosition | undefined;

  public constructor(key, name, type) {
    this.key = key;
    this.name = name;
    this.type = type;
    this.hasTypeVariable = false;
  }
}

// noinspection dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection
export class VariableTypeContext extends AstElementTypeContext {
  public modifiers: string[] | undefined;
  public ignore: boolean;

  public constructor(key, name, type, modifiers, ignore) {
    super(key, name, type);
    this.modifiers = modifiers;
    this.ignore = ignore;
  }

  /**
   * TODO: we should refactor it that VariableTypeContext has a field like: data field-> true; or parameter-> true, so we dont have to put ignoreParameterModifiers by ourself
   * Returns a number between 0 and 1. 1 means the parameters are equal, 0 means they are not equal at all.
   * @param otherParameter
   * @param similarityModifierOfVariablesWithUnknownType
   * @param ignoreParameterModifiers if true, the modifiers are ignored like "public" or "private". This is required for method parameters because they can't have "public" or "private" modifiers and therefore a comparison with data fields would be wrong and always return 0. But for data fields compared to other data fields, the modifiers should be considered and therefore this option shall be true.
   */
  public isSimilarTo(otherParameter: VariableTypeContext, similarityModifierOfVariablesWithUnknownType: number, ignoreParameterModifiers: boolean): number {
    //TODO: we need to check the similarity of the name
    // https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=5328371 page 164
    // not only the data fields with same
    // signatures (same name, same data type, same access
    // modifier), but also data fields with similar signatures (similar
    // name, same data type, same access modifier)
    similarityModifierOfVariablesWithUnknownType = similarityModifierOfVariablesWithUnknownType > 0 ? similarityModifierOfVariablesWithUnknownType : 0;

    let baseSimilarity = 1;
    baseSimilarity *= this.getSimilarityModifierOfSameVariableModifiers(otherParameter, ignoreParameterModifiers);
    baseSimilarity *= baseSimilarity *= this.getSimilarityModifierOfTypeComparison(this.type, otherParameter.type, similarityModifierOfVariablesWithUnknownType);
    baseSimilarity *= SimilarityHelper.isSimilarName(this.name, otherParameter.name);
    return baseSimilarity;
  }

  /**
   * Calculates a similarity modifier based on the comparison of two types.
   *
   * This method evaluates the types of two variables and determines a similarity modifier
   * based on whether both types are defined, both types are undefined, or if they are equal.
   * If the types are not similar, it returns the provided similarity modifier for variables
   * with unknown types, ensuring that this value is non-negative.
   *
   * @param {any} typeA - The first type to compare. Can be any value.
   * @param {any} typeB - The second type to compare. Can be any value.
   * @param {number} similarityModifierOfVariablesWithUnknownType - A numeric value representing
   *        the similarity modifier for variables whose types are unknown. This value will be
   *        adjusted to be non-negative if it is less than zero.
   * @returns {number} Returns 1 if both types are the same or both are undefined; otherwise,
   *          returns the adjusted similarity modifier for unknown types.
   *
   * @throws {TypeError} Throws an error if the provided parameters are not of expected types.
   */
  public getSimilarityModifierOfTypeComparison(typeA: any, typeB: any, similarityModifierOfVariablesWithUnknownType: number) {
    similarityModifierOfVariablesWithUnknownType = similarityModifierOfVariablesWithUnknownType > 0 ? similarityModifierOfVariablesWithUnknownType : 0;
    let bothHaveType = !!typeA && !!typeB;
    let bothHaveNoType = !typeA && !typeB;
    let bothHaveHaveTypeAndAreEqual = bothHaveType && typeA === typeB;

    let sameType = bothHaveHaveTypeAndAreEqual || bothHaveNoType;
    if (!sameType) {
      return similarityModifierOfVariablesWithUnknownType;
    } else {
      return 1;
    }
  }

  public getSimilarityModifierOfSameVariableModifiers(otherParameter: VariableTypeContext, ignoreParameterModifiers: boolean) {
    if (ignoreParameterModifiers) {
      return 1;
    }

    let sameModifiers = this.haveSameModifiers(otherParameter);
    if (!sameModifiers) {
      return 0;
    } else {
      return 1;
    }
  }

  /**
   * Compares two names to determine if they are similar.
   *
   * This method evaluates the similarity between two provided names,
   * which can be useful in scenarios such as user input validation,
   * name matching, or deduplication processes.
   *
   * @param {string} nameA - The first name to compare.
   * @param {string} nameB - The second name to compare.
   * @returns {boolean} Returns true if the names are considered similar,
   *                    otherwise returns false.
   *
   * @throws {Error} Throws an error if either name is not a string.
   */
  public isSimilarName(nameA: string, nameB: string) {}

  public haveSameModifiers(otherParameter: VariableTypeContext) {
    let sameModifiers = true;
    let bothHaveModifiers = this.modifiers !== undefined && otherParameter.modifiers !== undefined;
    if (bothHaveModifiers) {
      // check if both have all modifiers but the order can be different
      // @ts-ignore
      let weHaveAllModifiersOtherHas = this.allKeysInArray(this.modifiers, otherParameter.modifiers);
      // @ts-ignore
      let otherHasAllModifiersWeHave = this.allKeysInArray(otherParameter.modifiers, this.modifiers);
      sameModifiers = weHaveAllModifiersOtherHas && otherHasAllModifiersWeHave;
    } else {
      let bothHaveNoModifiers = this.modifiers === undefined && otherParameter.modifiers === undefined;
      if (bothHaveNoModifiers) {
        sameModifiers = true;
      } else {
        sameModifiers = false;
      }
    }
    return sameModifiers;
  }

  private allKeysInArray(array1: string[], array2: string[]) {
    for (let i = 0; i < array1.length; i++) {
      let key = array1[i];
      if (array2.indexOf(key) === -1) {
        return false;
      }
    }
    return true;
  }
}

export class ParameterTypeContextUtils {
  public static parameterToString(parameterTypeContext: VariableTypeContext) {
    return `{${parameterTypeContext.type} ${parameterTypeContext.name}}`;
  }

  public static parametersToString(parameters: VariableTypeContext[]) {
    let orderedParameters = parameters.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    let parametersString = '[';
    for (let i = 0; i < orderedParameters.length; i++) {
      parametersString += ParameterTypeContextUtils.parameterToString(orderedParameters[i]);
      if (i < orderedParameters.length - 1) {
        parametersString += ', ';
      }
    }
    parametersString += ']';
    return parametersString;
  }
}

// noinspection dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection
export class ClassOrInterfaceTypeContext extends AstElementTypeContext {
  public modifiers: string[] | undefined;
  public fields: Dictionary<MemberFieldParameterTypeContext>;
  public methods: Dictionary<MethodTypeContext>;
  public constructors: Dictionary<MethodTypeContext>;
  public file_path: string;
  public anonymous: boolean;
  public auxclass: boolean; // true: wont be analysed. the class is only an aux class in order to support the hierarchy.

  public implements_: string[];
  public extends_: string[]; // Languages that support multiple inheritance include: C++, Common Lisp

  public definedInClassOrInterfaceTypeKey: string | undefined; // key of the class or interface where this class or interface is defined

  //dict of classes with name as key
  public innerDefinedClasses: Dictionary<ClassOrInterfaceTypeContext>;
  public innerDefinedInterfaces: Dictionary<ClassOrInterfaceTypeContext>;

  public static fromObject(obj: ClassOrInterfaceTypeContext) {
    //console.log("Copy ClassOrInterfaceTypeContext");

    // @ts-ignore
    let instance = new ClassOrInterfaceTypeContext();
    Object.assign(instance, obj);
    instance.fields = instance.fields || {};
    instance.methods = instance.methods || {};
    instance.constructors = instance.constructors || {};
    for (let fieldKey of Object.keys(instance.fields)) {
      instance.fields[fieldKey] = MemberFieldParameterTypeContext.fromObject(instance.fields[fieldKey]);
    }
    for (let methodKey of Object.keys(instance.methods)) {
      instance.methods[methodKey] = MethodTypeContext.fromObject(instance.methods[methodKey]);
    }
    for (let constructorKey of Object.keys(instance.constructors)) {
      instance.constructors[constructorKey] = MethodTypeContext.fromObject(instance.constructors[constructorKey]);
    }
    for (let innerDefinedClassKey of Object.keys(instance.innerDefinedClasses)) {
      instance.innerDefinedClasses[innerDefinedClassKey] = ClassOrInterfaceTypeContext.fromObject(instance.innerDefinedClasses[innerDefinedClassKey]);
    }
    for (let innerDefinedInterfaceKey of Object.keys(instance.innerDefinedInterfaces)) {
      instance.innerDefinedInterfaces[innerDefinedInterfaceKey] = ClassOrInterfaceTypeContext.fromObject(instance.innerDefinedInterfaces[innerDefinedInterfaceKey]);
    }

    //console.log("Copy ClassOrInterfaceTypeContext finished");
    return instance;
  }

  public constructor(key, name, type, file_path) {
    super(key, name, type);
    this.file_path = file_path;
    this.name = name;
    this.modifiers = [];
    this.fields = {};
    this.methods = {};
    this.constructors = {};
    this.innerDefinedClasses = {};
    this.innerDefinedInterfaces = {};
    this.implements_ = [];
    this.extends_ = [];
    this.anonymous = false;
    this.auxclass = false;
  }

  public isSubClassOrInterfaceOrParentOfOtherClassOrInterface(possibleSubOrSuperClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts) {
    let isSubClassOf = this.isSubClassOrInterfaceOfOtherClassOrInterface(possibleSubOrSuperClassOrInterface, softwareProjectDicts);
    if (isSubClassOf) {
      return true;
    }
    let isParentClassOf = possibleSubOrSuperClassOrInterface.isSubClassOrInterfaceOfOtherClassOrInterface(this, softwareProjectDicts);
    if (isParentClassOf) {
      return true;
    }
    return false;
  }

  public isSubClassOrInterfaceOfOtherClassOrInterface(possibleSuperClassOrInterface: ClassOrInterfaceTypeContext, softwareProjectDicts: SoftwareProjectDicts) {
    let superClassesAndInterfacesKeys = this.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
    let possibleSuperClassOrInterfaceKey = possibleSuperClassOrInterface.key;
    return !!superClassesAndInterfacesKeys[possibleSuperClassOrInterfaceKey];
  }

  public isWholeHierarchyKnown(softwareProjectDicts: SoftwareProjectDicts) {
    let currentClassOrInterface = this;
    //console.log("-- currentClassOrInterface.key: "+currentClassOrInterface?.key)
    let superClassesOrInterfacesKeys = currentClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
    //console.log("-- superClassesOrInterfacesKeys");
    //console.log(superClassesOrInterfacesKeys);
    for (let superClassesOrInterfaceKey of superClassesOrInterfacesKeys) {
      let superClassesOrInterface = softwareProjectDicts.dictClassOrInterface[superClassesOrInterfaceKey];
      if (!superClassesOrInterface) {
        //console.log("Found no superClassesOrInterface for: "+superClassesOrInterfaceKey);
        //console.log("The hierarchy is therefore not complete");
        return false;
      }
    }

    return true;
  }

  /**
   * Determines whether the entire hierarchy of classes or interfaces is known
   * within the provided software project dictionaries. This method checks
   * each superclass or interface to ensure that it exists in the given
   * dictionary.
   *
   * @param {SoftwareProjectDicts} softwareProjectDicts - The dictionary containing
   *        the definitions of classes and interfaces in the software project.
   *
   * @returns {boolean} Returns true if all superclasses and interfaces are known,
   *          otherwise returns false.
   *
   * @throws {Error} Throws an error if the softwareProjectDicts parameter is
   *         invalid or not provided.
   */
  public isWholeHierarchyKnownPrintUnknown(softwareProjectDicts: SoftwareProjectDicts) {
    let currentClassOrInterface = this;
    //console.log("-- currentClassOrInterface.key: "+currentClassOrInterface?.key)
    let superClassesOrInterfacesKeys = currentClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
    //console.log("-- superClassesOrInterfacesKeys");
    //console.log(superClassesOrInterfacesKeys);
    for (let superClassesOrInterfaceKey of superClassesOrInterfacesKeys) {
      // remove generics from key --> no we dont do that --> fix the AST parser instead
      //let superClassesOrInterfaceKeyWithoutGenerics = superClassesOrInterfaceKey.split("<")[0];
      //superClassesOrInterfaceKey = superClassesOrInterfaceKeyWithoutGenerics;
      let superClassesOrInterface = softwareProjectDicts.dictClassOrInterface[superClassesOrInterfaceKey];
      if (!superClassesOrInterface) {
        //console.log("Found no superClassesOrInterface for: "+superClassesOrInterfaceKey);
        //console.log("The hierarchy is therefore not complete");
        return false;
      }
    }

    return true;
  }

  public getSuperClassesAndInterfacesKeys(softwareProjectDicts: SoftwareProjectDicts, recursive: boolean, checkedKeys: Dictionary<string | null> = {}, level = 0): any[] {
    //console.log(level+" - getSuperClassesAndInterfacesKeys for: "+this.key);
    //console.log(this);
    let foundKeys: Dictionary<string | null> = {};

    if (!checkedKeys) {
      checkedKeys = {};
    }
    checkedKeys[this.key] = this.key;

    let extendingClassesOrInterfacesKeys: string[] = [];
    let extendingKeys = this.extends_;
    for (let extendingKey of extendingKeys) {
      extendingClassesOrInterfacesKeys.push(extendingKey);
    }
    let implementsKeys = this.implements_;
    for (let implementsKey of implementsKeys) {
      extendingClassesOrInterfacesKeys.push(implementsKey);
    }

    //console.log("implements and extends");
    //console.log(JSON.parse(JSON.stringify(extendingClassesOrInterfacesKeys)))

    for (let extendingClassesOrInterfacesKey of extendingClassesOrInterfacesKeys) {
      if (!checkedKeys[extendingClassesOrInterfacesKey]) {
        let newFinding = !foundKeys[extendingClassesOrInterfacesKey];
        if (newFinding) {
          foundKeys[extendingClassesOrInterfacesKey] = extendingClassesOrInterfacesKey;
          if (recursive) {
            let foundClassOrInterface = softwareProjectDicts.dictClassOrInterface[extendingClassesOrInterfacesKey];
            if (!!foundClassOrInterface) {
              //console.log("--> Recursive call for: "+foundClassOrInterface.key)
              let recursiveFindings = foundClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, recursive, checkedKeys, level + 1);
              //console.log("<-- Recursive call endet");
              for (let recursiveFindingKey of recursiveFindings) {
                let newRecursiveFinding = !foundKeys[recursiveFindingKey];
                if (newRecursiveFinding) {
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

export class MemberFieldParameterTypeContext extends VariableTypeContext {
  public classOrInterfaceKey: string;

  public constructor(key, name, type, modifiers, ignore, classOrInterface: ClassOrInterfaceTypeContext) {
    super(classOrInterface?.key + '/' + 'memberField' + '/' + key, name, type, modifiers, ignore);
    this.classOrInterfaceKey = classOrInterface?.key;
  }

  public static fromObject(obj: MemberFieldParameterTypeContext) {
    //console.log("MemberFieldParameterTypeContext fromObject")
    // @ts-ignore
    let instance = new MemberFieldParameterTypeContext();
    Object.assign(instance, obj);
    return instance;
  }
}

export class MethodParameterTypeContext extends VariableTypeContext {
  public methodKey: string;

  public static fromObject(obj: MethodParameterTypeContext) {
    // @ts-ignore
    let instance = new MethodParameterTypeContext();
    Object.assign(instance, obj);
    return instance;
  }

  public constructor(key, name, type, modifiers, ignore, method: MethodTypeContext) {
    super(method?.key + '/parameter/' + key, name, type, modifiers, ignore);
    this.methodKey = method?.key;
  }
}

// noinspection dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection
export class MethodTypeContext extends AstElementTypeContext {
  public modifiers: string[];
  public overrideAnnotation: boolean;
  public returnType: string | undefined;
  public parameters: MethodParameterTypeContext[];
  public classOrInterfaceKey: string;

  public static fromObject(obj: MethodTypeContext) {
    // @ts-ignore
    let instance = new MethodTypeContext();
    Object.assign(instance, obj);
    for (let i = 0; i < instance.parameters.length; i++) {
      instance.parameters[i] = MethodParameterTypeContext.fromObject(instance.parameters[i]);
    }
    return instance;
  }

  public constructor(
    key?: string,
    name?: string,
    type?: string,
    overrideAnnotation: boolean = false,
    classOrInterface?: ClassOrInterfaceTypeContext,
    contextType: 'method' | 'constructor' = 'method',
  ) {
    const prefix = classOrInterface?.key ? classOrInterface.key + '/' + contextType + '/' : '';
    const computedKey = classOrInterface?.key && key !== undefined ? prefix + key : key;
    super(computedKey, name, type);
    this.modifiers = [];
    this.parameters = [];
    this.classOrInterfaceKey = classOrInterface?.key;
    this.overrideAnnotation = overrideAnnotation;
    this.returnType = type;
  }

  public getMethodSignature() {
    let methodSignature = this.name + '(';
    for (let i = 0; i < this.parameters.length; i++) {
      let parameter = this.parameters[i];
      methodSignature += parameter.type;
      if (i < this.parameters.length - 1) {
        methodSignature += ', ';
      }
    }
    methodSignature += ')';
    return methodSignature;
  }

  public hasSameSignatureAs(otherMethod: MethodTypeContext) {
    let hasSameSignature = true;

    if (this.parameters.length !== otherMethod.parameters.length) {
      hasSameSignature = false;
    } else {
      let thisMethodSignature = this.getMethodSignature();
      let otherMethodSignature = otherMethod.getMethodSignature();
      if (thisMethodSignature !== otherMethodSignature) {
        hasSameSignature = false;
      }
    }
    return hasSameSignature;
  }

  public static getClassOrInterface(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts) {
    let currentClassOrInterfaceKey = method.classOrInterfaceKey;
    let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[currentClassOrInterfaceKey];
    return currentClassOrInterface;
  }

  public static isWholeHierarchyKnown(method: MethodTypeContext, softwareProjectDicts: SoftwareProjectDicts) {
    //console.log("isWholeHierarchyKnown?: method.key: "+method?.key);
    //console.log("softwareProjectDicts.dictClassOrInterface")
    //console.log(softwareProjectDicts.dictClassOrInterface);

    let currentClassOrInterface = MethodTypeContext.getClassOrInterface(method, softwareProjectDicts);
    return currentClassOrInterface.isWholeHierarchyKnown(softwareProjectDicts);
  }

  public isInheritedFromParentClassOrInterface(softwareProjectDicts: SoftwareProjectDicts) {
    // In Java we can't rely on @Override annotation because it is not mandatory: https://stackoverflow.com/questions/4822954/do-we-really-need-override-and-so-on-when-code-java
    if (this.overrideAnnotation) {
      return true;
    }
    // Since the @Override is not mandatory, we need to dig down deeper by ourself

    let isInherited = false;
    let currentClassOrInterface = softwareProjectDicts.dictClassOrInterface[this.classOrInterfaceKey];
    if (currentClassOrInterface) {
      // DONE: we should check if all superClassesAndInterfaces are found
      // We will check this in DetectorDataClumpsMethods.ts with method: isWholeHierarchyNotKnown(

      let superClassesOrInterfacesKeys = currentClassOrInterface.getSuperClassesAndInterfacesKeys(softwareProjectDicts, true);
      for (let superClassOrInterfaceKey of superClassesOrInterfacesKeys) {
        //console.log("superClassOrInterfaceKey: "+superClassOrInterfaceKey)
        let superClassOrInterface = softwareProjectDicts.dictClassOrInterface[superClassOrInterfaceKey];
        if (!!superClassOrInterface) {
          let superClassOrInterfaceMethodsDict = superClassOrInterface.methods;
          let superClassOrInterfaceMethodsKeys = Object.keys(superClassOrInterfaceMethodsDict);
          for (let superClassOrInterfaceMethodsKey of superClassOrInterfaceMethodsKeys) {
            //console.log("-- superClassOrInterfaceMethodsKey: "+superClassOrInterfaceMethodsKey)
            let superClassOrInterfaceMethod = superClassOrInterfaceMethodsDict[superClassOrInterfaceMethodsKey];
            if (this.hasSameSignatureAs(superClassOrInterfaceMethod)) {
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
