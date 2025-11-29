// filepath: /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/tests/data-clumps/test-cases/parameter-field/import-different-filename/positive/typescript/source/PatientModel.ts
export class Patient {
  public recordId: number;
  public isActive: boolean;
  public visitCount: number;

  constructor(recordId: number, isActive: boolean, visitCount: number) {
    this.recordId = recordId;
    this.isActive = isActive;
    this.visitCount = visitCount;
  }
}

