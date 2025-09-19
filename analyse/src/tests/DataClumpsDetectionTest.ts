import {
  ClassOrInterfaceTypeContext,
  MemberFieldParameterTypeContext,
  MethodParameterTypeContext,
  MethodTypeContext,
} from '../ignoreCoverage/ParsedAstTypes';
import { SoftwareProjectDicts } from '../ignoreCoverage/SoftwareProject';
import { Detector, DetectorOptions, InvertedIndexSoftwareProject } from '../ignoreCoverage/detector/Detector';
import { DetectorDataClumpsFields } from '../ignoreCoverage/detector/DetectorDataClumpsFields';
import { DetectorDataClumpsMethods } from '../ignoreCoverage/detector/DetectorDataClumpsMethods';
import { DataClumpTypeContext } from 'data-clumps-type-context';

type ParameterSpec = {
  name: string;
  type: string;
};

function createClass(name: string, filePath = `${name}.ts`): ClassOrInterfaceTypeContext {
  const key = `${filePath}/class/${name}`;
  return new ClassOrInterfaceTypeContext(key, name, 'class', filePath);
}

function addField(
  targetClass: ClassOrInterfaceTypeContext,
  name: string,
  type: string,
  modifiers: string[] = ['private']
): MemberFieldParameterTypeContext {
  const field = new MemberFieldParameterTypeContext(`field_${name}`, name, type, modifiers, false, targetClass);
  targetClass.fields[field.key] = field;
  return field;
}

function addMethod(
  targetClass: ClassOrInterfaceTypeContext,
  methodName: string,
  parameters: ParameterSpec[]
): MethodTypeContext {
  const method = new MethodTypeContext(`method_${methodName}`, methodName, 'void', false, targetClass);
  method.parameters = [];
  parameters.forEach((parameterSpec, index) => {
    const parameter = new MethodParameterTypeContext(
      `param_${index}_${parameterSpec.name}`,
      parameterSpec.name,
      parameterSpec.type,
      undefined,
      false,
      method
    );
    method.parameters.push(parameter);
  });
  targetClass.methods[method.key] = method;
  return method;
}

function createOptions(overrides: Partial<DetectorOptions> = {}): DetectorOptions {
  return Detector.getDefaultOptions({
    fastDetection: false,
    sharedFieldsToFieldsAmountMinimum: 2,
    sharedParametersToParametersAmountMinimum: 2,
    sharedParametersToFieldsAmountMinimum: 2,
    ...overrides,
  });
}

function createProject(classes: ClassOrInterfaceTypeContext[], options: DetectorOptions) {
  const project = new SoftwareProjectDicts();
  classes.forEach(cls => project.loadClassOrInterface(cls));
  const invertedIndex = new InvertedIndexSoftwareProject(project, options);
  return { project, invertedIndex };
}

function getClumpsByType(
  detected: Record<string, DataClumpTypeContext> | null | undefined,
  type: string
): DataClumpTypeContext[] {
  if (!detected) {
    return [];
  }
  return Object.values(detected).filter(clump => clump.data_clump_type === type);
}

describe('Data clump detection', () => {
  describe('Field-to-field detection', () => {
    test('does not report a field data clump when shared fields are below threshold', async () => {
      const options = createOptions();

      const firstClass = createClass('Person');
      addField(firstClass, 'sharedId', 'string');
      addField(firstClass, 'firstName', 'string');

      const secondClass = createClass('Order');
      addField(secondClass, 'sharedId', 'string');
      addField(secondClass, 'orderNumber', 'string');

      const { project, invertedIndex } = createProject([firstClass, secondClass], options);
      const detector = new DetectorDataClumpsFields(options);
      const detected = await detector.detect(project, invertedIndex);

      expect(Object.keys(detected || {})).toHaveLength(0);
    });
  });

  describe('Parameter-to-parameter detection', () => {
    test('detects parameter clumps when methods share multiple parameters', async () => {
      const options = createOptions();

      const serviceA = createClass('ServiceA');
      addMethod(serviceA, 'processUser', [
        { name: 'userId', type: 'string' },
        { name: 'userName', type: 'string' },
      ]);

      const serviceB = createClass('ServiceB');
      addMethod(serviceB, 'handleUser', [
        { name: 'userId', type: 'string' },
        { name: 'userName', type: 'string' },
      ]);

      const { project, invertedIndex } = createProject([serviceA, serviceB], options);
      const detector = new DetectorDataClumpsMethods(options);
      const detected = await detector.detect(project, invertedIndex);
      const parameterClumps = getClumpsByType(detected, 'parameters_to_parameters_data_clump');

      expect(parameterClumps.length).toBeGreaterThan(0);
      const parameterNames = Object.values(parameterClumps[0].data_clump_data)
        .map(variable => variable.name)
        .sort();
      expect(parameterNames).toEqual(['userId', 'userName']);
    });

    test('does not report parameter clumps when shared parameters are below threshold', async () => {
      const options = createOptions();

      const serviceA = createClass('ServiceA');
      addMethod(serviceA, 'processUser', [
        { name: 'userId', type: 'string' },
        { name: 'userName', type: 'string' },
      ]);

      const serviceB = createClass('ServiceB');
      addMethod(serviceB, 'handleUser', [
        { name: 'userId', type: 'string' },
        { name: 'email', type: 'string' },
      ]);

      const { project, invertedIndex } = createProject([serviceA, serviceB], options);
      const detector = new DetectorDataClumpsMethods(options);
      const detected = await detector.detect(project, invertedIndex);
      const parameterClumps = getClumpsByType(detected, 'parameters_to_parameters_data_clump');

      expect(parameterClumps).toHaveLength(0);
    });
  });

  describe('Parameter-to-field detection', () => {
    test('detects parameter-field data clumps when parameters mirror fields', async () => {
      const options = createOptions();

      const controllerClass = createClass('Controller');
      addMethod(controllerClass, 'createAddress', [
        { name: 'street', type: 'string' },
        { name: 'zipCode', type: 'string' },
      ]);

      const modelClass = createClass('AddressModel');
      addField(modelClass, 'street', 'string');
      addField(modelClass, 'zipCode', 'string');

      const { project, invertedIndex } = createProject([controllerClass, modelClass], options);
      const detector = new DetectorDataClumpsMethods(options);
      const detected = await detector.detect(project, invertedIndex);
      const parameterFieldClumps = getClumpsByType(detected, 'parameters_to_fields_data_clump');

      expect(parameterFieldClumps.length).toBeGreaterThan(0);
      const firstClump = parameterFieldClumps[0];
      const fromNames = Object.values(firstClump.data_clump_data)
        .map(variable => variable.name)
        .sort();
      expect(fromNames).toEqual(['street', 'zipCode']);
      const toNames = Object.values(firstClump.data_clump_data)
        .map(variable => {
          expect(variable.to_variable).toBeDefined();
          return variable.to_variable!.name;
        })
        .sort();
      expect(toNames).toEqual(['street', 'zipCode']);
    });

    test('does not report parameter-field clumps when matches are insufficient', async () => {
      const options = createOptions();

      const controllerClass = createClass('Controller');
      addMethod(controllerClass, 'createAddress', [
        { name: 'street', type: 'string' },
        { name: 'zipCode', type: 'string' },
      ]);

      const modelClass = createClass('AddressModel');
      addField(modelClass, 'street', 'string');
      addField(modelClass, 'city', 'string');

      const { project, invertedIndex } = createProject([controllerClass, modelClass], options);
      const detector = new DetectorDataClumpsMethods(options);
      const detected = await detector.detect(project, invertedIndex);
      const parameterFieldClumps = getClumpsByType(detected, 'parameters_to_fields_data_clump');

      expect(parameterFieldClumps).toHaveLength(0);
    });
  });
});

export {}; // In order to allow our outer react app to compile, we need to add an empty export statement to this file.
