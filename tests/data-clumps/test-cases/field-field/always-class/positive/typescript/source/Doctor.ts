import { Address } from './Address';
import { ContactInfo } from './ContactInfo';
import { Insurance } from './Insurance';

export class Doctor {
  public address: Address;
  public contactInfo: ContactInfo;
  public insurance: Insurance;
  public licenseNumber: string;

  constructor(
    address: Address,
    contactInfo: ContactInfo,
    insurance: Insurance,
    licenseNumber: string
  ) {
    this.address = address;
    this.contactInfo = contactInfo;
    this.insurance = insurance;
    this.licenseNumber = licenseNumber;
  }
}
