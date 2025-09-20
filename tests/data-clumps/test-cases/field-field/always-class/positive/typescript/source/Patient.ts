import { Address } from './Address';
import { ContactInfo } from './ContactInfo';
import { Insurance } from './Insurance';

export class Patient {
  public address: Address;
  public contactInfo: ContactInfo;
  public insurance: Insurance;
  public patientId: string;

  constructor(
    address: Address,
    contactInfo: ContactInfo,
    insurance: Insurance,
    patientId: string
  ) {
    this.address = address;
    this.contactInfo = contactInfo;
    this.insurance = insurance;
    this.patientId = patientId;
  }
}
