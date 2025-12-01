// filepath: /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/tests/data-clumps/test-cases/parameter-field/import-different-filename/positive/typescript/source/PatientService.ts
import { Patient } from './PatientModel';

export class PatientService {
  registerPatient(recordId: number, isActive: boolean, visitCount: number): void {
    // Erzeugung eines Patient-Objekts um die Verbindung zwischen Parametern und Feldern zu verdeutlichen
    const patient = new Patient(recordId, isActive, visitCount);
    console.log(`Registering patient ${patient.recordId} with active status ${patient.isActive} and ${patient.visitCount} recorded visits`);
  }
}
