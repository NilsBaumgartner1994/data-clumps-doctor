export interface BillingProcessor {
  createInvoice(
    patientId: number,
    doctorId: number,
    requiresFollowUp: boolean
  ): void;
}
