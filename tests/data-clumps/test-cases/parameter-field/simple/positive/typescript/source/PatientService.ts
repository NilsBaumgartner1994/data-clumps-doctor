export class PatientService {
  registerPatient(firstName: string, lastName: string, insuranceNumber: string): void {
    console.log(`Registering patient ${firstName} ${lastName} with insurance ${insuranceNumber}`);
  }
}
