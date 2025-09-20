export class BillingProcessor {
  createInvoice(patientId: number, doctorId: number, invoiceAmount: number): void {
    console.log(`Creating invoice of ${invoiceAmount} for patient ${patientId} with doctor ${doctorId}`);
  }
}
