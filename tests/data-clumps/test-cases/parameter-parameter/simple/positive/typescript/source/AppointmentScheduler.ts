export class AppointmentScheduler {
  schedule(patientId: number, doctorId: number, requiresFollowUp: boolean): void {
    console.log(`Scheduling appointment for patient ${patientId} with doctor ${doctorId} (requires follow-up: ${requiresFollowUp})`);
  }
}
