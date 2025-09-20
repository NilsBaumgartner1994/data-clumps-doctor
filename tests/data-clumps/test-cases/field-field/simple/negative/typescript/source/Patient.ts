export class Patient {
  public patientId: number;
  public isActive: boolean;
  public visitCount: number;

  constructor(patientId: number, isActive: boolean, visitCount: number) {
    this.patientId = patientId;
    this.isActive = isActive;
    this.visitCount = visitCount;
  }
}
