import { Adress } from './Adress';

export class PatientService {
  registerPatient(firstname: String, kastanie: String, address: Adress): void {
    console.log(`Registering patient ${firstname} with kastanie ${kastanie} (address provided: ${address instanceof Adress})`);
  }
}
