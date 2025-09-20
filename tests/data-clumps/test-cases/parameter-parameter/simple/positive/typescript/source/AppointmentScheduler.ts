export class AppointmentScheduler {
  schedule(patientId: string, doctorId: string, roomNumber: string): void {
    console.log(`Scheduling appointment for ${patientId} with ${doctorId} in room ${roomNumber}`);
  }
}
