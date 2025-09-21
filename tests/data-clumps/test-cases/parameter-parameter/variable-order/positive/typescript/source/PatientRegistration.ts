export class PatientRegistration {
  registerPatient(firstname: string, age: number, lastname: string): void {
    console.log(`Registering patient ${firstname} ${lastname} (${age})`);
  }
}
