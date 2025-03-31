import {
  ClassOrInterfaceTypeContext,
  MemberFieldParameterTypeContext,
  MethodParameterTypeContext,
  MethodTypeContext,
} from "./ParsedAstTypes";
import {Dictionary} from "./UtilTypes";

// noinspection dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection,dataclump.DataClumpDetection
export class SoftwareProjectDicts {
  public dictClassOrInterface: Dictionary<ClassOrInterfaceTypeContext> = {};
  public dictMemberFieldParameters: Dictionary<MemberFieldParameterTypeContext> = {};
  public dictMethod: Dictionary<MethodTypeContext> = {};
  public dictMethodParameters: Dictionary<MethodParameterTypeContext> = {};

  public constructor() {
    this.dictClassOrInterface = {};
    this.dictMemberFieldParameters = {};
    this.dictMethod = {};
    this.dictMethodParameters = {};

    /**
    let classOrInterfacesDictForFile = dictClassOrInterface;
    let classOrInterfaceKeys = Object.keys(classOrInterfacesDictForFile);
    for (let classOrInterfaceKey of classOrInterfaceKeys) {
      let classOrInterface = classOrInterfacesDictForFile[classOrInterfaceKey];
      // we need to make sure, that we make a correct deserialization here
      classOrInterface = ClassOrInterfaceTypeContext.fromObject(classOrInterface);

      this.handleClassOrInterface(classOrInterface);
    }
     */
   }

   public loadClassOrInterface(classOrInterface: ClassOrInterfaceTypeContext) {
    this.handleClassOrInterface(classOrInterface);
   }

  private fillMethodsForClassOrInterface(classOrInterface: ClassOrInterfaceTypeContext) {
    // Fill methods
    let methodsDictForClassOrInterface = classOrInterface.methods;
    let methodKeys = Object.keys(methodsDictForClassOrInterface);
    for (let methodKey of methodKeys) {
      let method = methodsDictForClassOrInterface[methodKey];

      // Fill dictMethod
      this.dictMethod[method.key] = method;

      // Fill methodParameters
      let methodParametersDictForMethod = method.parameters;
      let methodParameterKeys = Object.keys(methodParametersDictForMethod);
      for (let methodParameterKey of methodParameterKeys) {
        let methodParameter = methodParametersDictForMethod[methodParameterKey];
        this.dictMethodParameters[methodParameter.key] = methodParameter;
      }
    }
  }

  private fillMemberFieldsForClassOrInterface(classOrInterface: ClassOrInterfaceTypeContext) {
    // Fill memberFieldParameters
    let memberFieldParametersDictForClassOrInterface = classOrInterface.fields;

    let memberFieldParameterKeys = Object.keys(memberFieldParametersDictForClassOrInterface);
    for (let memberFieldParameterKey of memberFieldParameterKeys) {
      let memberFieldParameter = memberFieldParametersDictForClassOrInterface[memberFieldParameterKey];
      this.dictMemberFieldParameters[memberFieldParameter.key] = memberFieldParameter;
    }
  }

  private handleClassOrInterface(classOrInterface: ClassOrInterfaceTypeContext) {
    this.fillClassOrInterfaceDicts(classOrInterface);
    this.fillMemberFieldsForClassOrInterface(classOrInterface);
    this.fillMethodsForClassOrInterface(classOrInterface);
  }

  private fillClassOrInterfaceDicts(classOrInterface: ClassOrInterfaceTypeContext) {
    // Fill dictClassOrInterface
    this.dictClassOrInterface[classOrInterface.key] = classOrInterface;

    // Fill inner defined classes
    let innerDefinedClassesDict = classOrInterface.innerDefinedClasses;
    let innerDefinedClassKeys = Object.keys(innerDefinedClassesDict);
    for (let innerDefinedClassKey of innerDefinedClassKeys) {
        let innerDefinedClass = innerDefinedClassesDict[innerDefinedClassKey];
        this.handleClassOrInterface(innerDefinedClass);
    }

    // Fill inner defined interfaces
    let innerDefinedInterfacesDict = classOrInterface.innerDefinedInterfaces;
    let innerDefinedInterfaceKeys = Object.keys(innerDefinedInterfacesDict);
    for (let innerDefinedInterfaceKey of innerDefinedInterfaceKeys) {
      let innerDefinedInterface = innerDefinedInterfacesDict[innerDefinedInterfaceKey];
      this.handleClassOrInterface(innerDefinedInterface);
    }
  }

  public printInfo() {
    console.log("amount: dictClassOrInterface: " + Object.keys(this.dictClassOrInterface).length);
    console.log("amount: dictMemberFieldParameters: " + Object.keys(this.dictMemberFieldParameters).length);
    console.log("amount: dictMethod: " + Object.keys(this.dictMethod).length);
    console.log("amount: dictMethodParameters: " + Object.keys(this.dictMethodParameters).length);
  }

}
