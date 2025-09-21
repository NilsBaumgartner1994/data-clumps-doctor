export class PatientService {
  registerPatient(recordId: number, isActive: boolean): void {
    console.log(`Registering patient ${recordId} with active status ${isActive}`);
  }
}
