import { DetectorUtils } from './DetectorUtils';
import { DataClumpTypeContext, Dictionary } from 'data-clumps-type-context';
import { ClassOrInterfaceTypeContext, MethodTypeContext } from './../ParsedAstTypes';
import { SoftwareProjectDicts } from './../SoftwareProject';
import { DetectorOptions, DetectorOptionsInformation, InvertedIndexSoftwareProject } from './Detector';
import { DetectorDataClumpsMethodsToOtherMethods } from './DetectorDataClumpsMethodsToOtherMethods';
import { DetectorDataClumpsMethodsToOtherFields } from './DetectorDataClumpsMethodsToOtherFields';

// TODO refactor this method to Detector since there is already the creation, so why not the refactoring
function getParsedValuesFromPartialOptions(rawOptions: DetectorOptions): DetectorOptions {
  function parseBoolean(value: any) {
    return '' + value === 'true';
  }

  rawOptions.sharedParametersToParametersAmountMinimum = parseInt(rawOptions.sharedParametersToParametersAmountMinimum);
  //rawOptions.sharedMethodParametersHierarchyConsidered = parseBoolean(rawOptions.sharedMethodParametersHierarchyConsidered)
  //rawOptions.sharedFieldParametersCheckIfAreSubtypes = parseBoolean(rawOptions.sharedFieldParametersCheckIfAreSubtypes);
  rawOptions.similarityModifierOfVariablesWithUnknownType = parseFloat(rawOptions.similarityModifierOfVariablesWithUnknownType);
  rawOptions.minimumSimilarityForDataClumps = parseFloat(rawOptions.minimumSimilarityForDataClumps);

  return rawOptions;
}

export type ContextAnalyseDataClumpParameter = {
  currentMethod: MethodTypeContext;
  detectedDataClumpsDict: Dictionary<DataClumpTypeContext>;
  softwareProjectDicts: SoftwareProjectDicts;
  invertedIndexSoftwareProject: InvertedIndexSoftwareProject;
};

export class DetectorDataClumpsMethods {
  public options: DetectorOptions;
  public progressCallback: any;
  public toOtherMethodsDetector: DetectorDataClumpsMethodsToOtherMethods;
  public toOtherFieldsDetector: DetectorDataClumpsMethodsToOtherFields;

  public constructor(options: DetectorOptions, progressCallback?: any) {
    this.options = getParsedValuesFromPartialOptions(JSON.parse(JSON.stringify(options)));
    this.progressCallback = progressCallback;
    this.toOtherMethodsDetector = new DetectorDataClumpsMethodsToOtherMethods(options, progressCallback);
    this.toOtherFieldsDetector = new DetectorDataClumpsMethodsToOtherFields(options, progressCallback);
  }

  public async detect(softwareProjectDicts: SoftwareProjectDicts, invertedIndexSoftwareProject: InvertedIndexSoftwareProject): Promise<Dictionary<DataClumpTypeContext> | null> {
    //console.log("Detecting software project for data clumps in methods");
    let methodsDict = softwareProjectDicts.dictMethod;
    let methodKeys = Object.keys(methodsDict);
    let detectedDataClumpsDict: Dictionary<DataClumpTypeContext> = {};

    let amountMethods = methodKeys.length;
    let index = 0;
    for (let methodKey of methodKeys) {
      if (this.progressCallback) {
        await this.progressCallback('Parameter Detector: ' + methodKey, index, amountMethods);
      }
      let method = methodsDict[methodKey];

      let detectContext: ContextAnalyseDataClumpParameter = {
        currentMethod: method,
        detectedDataClumpsDict: detectedDataClumpsDict,
        softwareProjectDicts: softwareProjectDicts,
        invertedIndexSoftwareProject: invertedIndexSoftwareProject,
      };

      this.analyzeMethod(detectContext);
      index++;
    }
    return detectedDataClumpsDict;
  }

  /**
   * DataclumpsInspection.java line 370
   * @private
   * @param detectContext
   */
  private analyzeMethod(detectContext: ContextAnalyseDataClumpParameter) {
    let { currentMethod, detectedDataClumpsDict, softwareProjectDicts, invertedIndexSoftwareProject } = detectContext;

    let currentClassOrInterface = MethodTypeContext.getClassOrInterface(currentMethod, softwareProjectDicts);
    if (currentClassOrInterface.auxclass) {
      // ignore auxclasses as are not important for our project
      return;
    }

    let wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod = MethodTypeContext.isWholeHierarchyKnown(currentMethod, softwareProjectDicts);
    if (!this.options.methodsOfClassesOrInterfacesWithUnknownHierarchyProbabilityModifier) {
      //console.log("- check if methods hierarchy is complete")
      //            let wholeHierarchyKnown = method.isWholeHierarchyKnown(softwareProjectDicts)
      if (!wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod) {
        // since we dont the complete hierarchy, we can't detect if a method is inherited or not
        //console.log("-- check if methods hierarchy is complete")
        return; // therefore we stop here
      }
    }

    let methodIsInherited = currentMethod.isInheritedFromParentClassOrInterface(softwareProjectDicts);
    if (methodIsInherited) {
      // if the method is inherited
      // then skip this method
      return;
    }

    let methodParameters = currentMethod.parameters;
    let methodParametersKeys = Object.keys(methodParameters);
    let methodParametersAmount = methodParametersKeys.length;
    if (methodParametersAmount < this.options.sharedParametersToFieldsAmountMinimum) {
      // avoid checking methods with less than 3 parameters
      //console.log("Method " + otherMethod.key + " has less than " + this.options.sharedParametersToParametersAmountMinimum + " parameters. Skipping this method.")
      return;
    }

    // we assume that all methods are not constructors
    this.toOtherMethodsDetector.checkParameterDataClumps(detectContext, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod);
    this.toOtherFieldsDetector.checkFieldDataClumps(detectContext, wholeHierarchyKnownOfClassOrInterfaceOfCurrentMethod);
  }
}
