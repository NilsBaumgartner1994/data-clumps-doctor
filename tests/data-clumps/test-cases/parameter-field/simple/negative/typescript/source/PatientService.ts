export class PatientService {
  updateContact(firstName: string, lastName: string, email: string): void {
    console.log(`Updating contact details for ${firstName} ${lastName} with email ${email}`);
  }
}
