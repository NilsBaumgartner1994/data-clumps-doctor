export interface AppointmentScheduler {
  schedule(
    patientId: number,
    doctorId: number,
    requiresFollowUp: boolean
  ): void;
}
