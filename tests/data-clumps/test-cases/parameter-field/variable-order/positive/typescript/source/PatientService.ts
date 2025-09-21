export class PatientService {
  registerPatient(firstname: string, age: number, lastname: string): void {
    console.log(`Registering patient ${firstname} ${lastname} (${age})`);
  }
}
