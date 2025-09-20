import { Address } from './Address';
import { ContactInfo } from './ContactInfo';
import { EmergencyContact } from './EmergencyContact';

export class Patient {
  public address: Address;
  public contactInfo: ContactInfo;
  public emergencyContact: EmergencyContact;
  public patientId: string;

  constructor(
    address: Address,
    contactInfo: ContactInfo,
    emergencyContact: EmergencyContact,
    patientId: string
  ) {
    this.address = address;
    this.contactInfo = contactInfo;
    this.emergencyContact = emergencyContact;
    this.patientId = patientId;
  }
}
