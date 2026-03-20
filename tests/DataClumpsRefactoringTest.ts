import fs from 'fs';
import os from 'os';
import path from 'path';

import { Detector } from '../src/ignoreCoverage/detector/Detector';
import { ParserHelper } from '../src/ignoreCoverage/ParserHelper';
import { ParserHelperTypeScript } from '../src/ignoreCoverage/parsers/ParserHelperTypeScript';
import { TsMorphDataClumpRefactorer } from '../src/ignoreCoverage/TsMorphDataClumpRefactorer';
import { DataClumpsTypeContext, DataClumpTypeContext } from 'data-clumps-type-context';

jest.setTimeout(60000);

/**
 * Sets up a temporary directory containing two TypeScript files that form a
 * parameter-parameter data clump: both methods share the parameters
 * `patientId: number`, `doctorId: number`, and `requiresFollowUp: boolean`.
 */
function createDataClumpSourceFiles(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'AppointmentScheduler.ts'),
    `export class AppointmentScheduler {
  schedule(patientId: number, doctorId: number, requiresFollowUp: boolean): void {
    console.log(\`Scheduling for patient \${patientId} with doctor \${doctorId} (follow-up: \${requiresFollowUp})\`);
  }
}
`
  );

  fs.writeFileSync(
    path.join(dir, 'BillingProcessor.ts'),
    `export class BillingProcessor {
  createInvoice(patientId: number, doctorId: number, requiresFollowUp: boolean): void {
    console.log(\`Invoice for patient \${patientId} and doctor \${doctorId} (follow-up: \${requiresFollowUp})\`);
  }
}
`
  );
}

/**
 * Runs the data clump detector on the given source directory.
 */
async function detectDataClumps(sourceDir: string): Promise<DataClumpsTypeContext> {
  const parser = new ParserHelperTypeScript();
  const tempAstDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-ast-'));
  try {
    await parser.parseSourceToAst(sourceDir, tempAstDir);
    const softwareProjectDicts = await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(tempAstDir, {});
    const detector = new Detector(softwareProjectDicts, null, null, null, 'refactoring-test', null, null, null, null, null, 'typescript');
    return detector.detect();
  } finally {
    try {
      await ParserHelper.removeGeneratedAst(tempAstDir, 'cleanup');
    } catch {
      // ignore cleanup errors
    }
  }
}

describe('Data Clump Detection and TsMorph Refactoring', () => {
  let sourceDir: string;

  beforeEach(() => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-refactor-'));
    createDataClumpSourceFiles(sourceDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('detects a parameter-parameter data clump in the source files', async () => {
    const report = await detectDataClumps(sourceDir);

    expect(report.report_summary.amount_data_clumps).toBeGreaterThan(0);
    expect(report.report_summary.parameters_to_parameters_data_clump).toBeGreaterThan(0);

    const dataClumps = Object.values(report.data_clumps);
    const paramClump = dataClumps.find(dc => dc.data_clump_type === 'parameters_to_parameters_data_clump');
    expect(paramClump).toBeDefined();

    const variableNames = Object.values(paramClump!.data_clump_data).map(v => v.name);
    expect(variableNames).toContain('patientId');
    expect(variableNames).toContain('doctorId');
    expect(variableNames).toContain('requiresFollowUp');
  });

  it('refactors a parameter-parameter data clump using TsMorphDataClumpRefactorer', async () => {
    const reportBefore = await detectDataClumps(sourceDir);
    const dataClumps = Object.values(reportBefore.data_clumps) as DataClumpTypeContext[];

    const clump = dataClumps.find(dc => dc.data_clump_type === 'parameters_to_parameters_data_clump');
    expect(clump).toBeDefined();

    const refactorer = new TsMorphDataClumpRefactorer(sourceDir);
    const result = await refactorer.refactorDataClump(clump!);

    expect(result.parameterObjectInterfaceName).toBe('PatientIdDoctorIdRequiresFollowUpParams');
    expect(result.parameterObjectFileName).toBe('PatientIdDoctorIdRequiresFollowUpParams.ts');
    expect(result.modifiedFiles.length).toBeGreaterThan(0);

    // The new parameter object interface file should exist
    const interfaceFilePath = path.join(sourceDir, result.parameterObjectFileName);
    expect(fs.existsSync(interfaceFilePath)).toBe(true);

    const interfaceContent = fs.readFileSync(interfaceFilePath, 'utf8');
    expect(interfaceContent).toContain('interface PatientIdDoctorIdRequiresFollowUpParams');
    expect(interfaceContent).toContain('patientId');
    expect(interfaceContent).toContain('doctorId');
    expect(interfaceContent).toContain('requiresFollowUp');

    // The refactored source files should use the new parameter object
    const schedulerContent = fs.readFileSync(path.join(sourceDir, 'AppointmentScheduler.ts'), 'utf8');
    expect(schedulerContent).toContain('PatientIdDoctorIdRequiresFollowUpParams');
    expect(schedulerContent).toContain('params: PatientIdDoctorIdRequiresFollowUpParams');

    const billingContent = fs.readFileSync(path.join(sourceDir, 'BillingProcessor.ts'), 'utf8');
    expect(billingContent).toContain('PatientIdDoctorIdRequiresFollowUpParams');
    expect(billingContent).toContain('params: PatientIdDoctorIdRequiresFollowUpParams');
  });

  it('no longer detects the original data clump after refactoring', async () => {
    const reportBefore = await detectDataClumps(sourceDir);
    const dataClumps = Object.values(reportBefore.data_clumps) as DataClumpTypeContext[];

    const clump = dataClumps.find(dc => dc.data_clump_type === 'parameters_to_parameters_data_clump');
    expect(clump).toBeDefined();

    const refactorer = new TsMorphDataClumpRefactorer(sourceDir);
    await refactorer.refactorDataClump(clump!);

    // Re-detect after refactoring
    const reportAfter = await detectDataClumps(sourceDir);
    expect(reportAfter.report_summary.amount_data_clumps).toBe(0);
  });
});

export {};
