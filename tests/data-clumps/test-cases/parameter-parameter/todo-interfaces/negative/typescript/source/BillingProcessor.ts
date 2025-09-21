export interface BillingProcessor {
  createInvoice(
    patientId: number,
    doctorId: number,
    invoiceAmount: number
  ): void;
}
