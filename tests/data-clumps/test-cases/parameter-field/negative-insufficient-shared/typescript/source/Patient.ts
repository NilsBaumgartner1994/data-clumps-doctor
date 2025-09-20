export class Patient {
  public firstName: string;
  public lastName: string;
  public insuranceNumber: string;

  constructor(firstName: string, lastName: string, insuranceNumber: string) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.insuranceNumber = insuranceNumber;
  }
}
