export class BillingProcessor {
  createInvoice(patientId: number, doctorId: number): void {
    console.log(`Creating invoice for patient ${patientId} and doctor ${doctorId}`);
  }
}
