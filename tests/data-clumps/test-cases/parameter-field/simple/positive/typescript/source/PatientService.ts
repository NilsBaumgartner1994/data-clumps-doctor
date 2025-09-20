export class PatientService {
  registerPatient(recordId: number, isActive: boolean, visitCount: number): void {
    console.log(
      `Registering patient ${recordId} with active status ${isActive} and ${visitCount} recorded visits`
    );
  }
}
