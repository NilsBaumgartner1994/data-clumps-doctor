export class BillingProcessor {
  createInvoice(patientId: number, doctorId: number, requiresFollowUp: boolean): void {
    console.log(`Creating invoice for patient ${patientId} and doctor ${doctorId} (requires follow-up: ${requiresFollowUp})`);
  }
}
