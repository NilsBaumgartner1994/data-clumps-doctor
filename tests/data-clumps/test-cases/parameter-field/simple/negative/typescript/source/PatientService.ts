export class PatientService {
  updateContact(patientId: number, isActive: boolean, contactCode: number): void {
    console.log(
      `Updating contact details for patient ${patientId} (active: ${isActive}) with contact code ${contactCode}`
    );
  }
}
