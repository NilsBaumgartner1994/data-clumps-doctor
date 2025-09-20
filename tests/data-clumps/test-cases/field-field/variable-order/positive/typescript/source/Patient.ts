export class Patient {
  public firstname: string;
  public age: number;
  public lastname: string;

  constructor(firstname: string, lastname: string, age: number) {
    this.firstname = firstname;
    this.lastname = lastname;
    this.age = age;
  }
}
