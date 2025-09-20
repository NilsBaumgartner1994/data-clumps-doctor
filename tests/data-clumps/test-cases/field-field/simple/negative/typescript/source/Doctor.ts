export class Doctor {
  public doctorId: number;
  public isOnCall: boolean;
  public appointmentSlots: number;

  constructor(doctorId: number, isOnCall: boolean, appointmentSlots: number) {
    this.doctorId = doctorId;
    this.isOnCall = isOnCall;
    this.appointmentSlots = appointmentSlots;
  }
}
