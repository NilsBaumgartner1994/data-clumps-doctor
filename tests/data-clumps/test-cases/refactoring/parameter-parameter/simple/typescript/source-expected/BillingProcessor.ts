import { PatientIdDoctorIdRequiresFollowUpParams } from "./PatientIdDoctorIdRequiresFollowUpParams";

export class BillingProcessor {
  createInvoice(params: PatientIdDoctorIdRequiresFollowUpParams): void {
      const { patientId, doctorId, requiresFollowUp } = params;
    console.log(`Creating invoice for patient ${patientId} and doctor ${doctorId} (requires follow-up: ${requiresFollowUp})`);
  }
}
