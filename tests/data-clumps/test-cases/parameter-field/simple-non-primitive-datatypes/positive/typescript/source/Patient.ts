import { Adress } from './Adress';

export class Patient {
  public firstname: String;
  public kastanie: String;
  public address: Adress;

  constructor(firstname: String, kastanie: String, address: Adress) {
    this.firstname = firstname;
    this.kastanie = kastanie;
    this.address = address;
  }
}
