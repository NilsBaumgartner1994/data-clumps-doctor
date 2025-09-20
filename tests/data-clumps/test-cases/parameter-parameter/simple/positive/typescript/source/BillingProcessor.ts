export class BillingProcessor {
  createInvoice(patientId: string, doctorId: string, roomNumber: string): void {
    console.log(`Creating invoice for ${patientId} and doctor ${doctorId} in room ${roomNumber}`);
  }
}
