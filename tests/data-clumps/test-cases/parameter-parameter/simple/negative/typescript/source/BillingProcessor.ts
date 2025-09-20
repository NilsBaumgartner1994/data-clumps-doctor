export class BillingProcessor {
  createInvoice(patientId: string, doctorId: string, amount: number): void {
    console.log(`Creating invoice of ${amount} for ${patientId}`);
  }
}
