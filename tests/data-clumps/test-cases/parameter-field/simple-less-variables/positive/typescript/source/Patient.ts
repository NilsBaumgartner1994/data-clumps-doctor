export class Patient {
  public recordId: number;
  public isActive: boolean;

  constructor(recordId: number, isActive: boolean) {
    this.recordId = recordId;
    this.isActive = isActive;
  }
}
