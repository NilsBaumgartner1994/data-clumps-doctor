import { PatientIdDoctorIdRequiresFollowUpParams } from "./PatientIdDoctorIdRequiresFollowUpParams";

export class AppointmentScheduler {
  schedule(params: PatientIdDoctorIdRequiresFollowUpParams): void {
      const { patientId, doctorId, requiresFollowUp } = params;
    console.log(`Scheduling appointment for patient ${patientId} with doctor ${doctorId} (requires follow-up: ${requiresFollowUp})`);
  }
}
