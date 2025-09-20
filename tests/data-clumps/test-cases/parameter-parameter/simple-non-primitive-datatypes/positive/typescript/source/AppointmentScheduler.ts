import { Adress } from './Adress';

export class AppointmentScheduler {
  schedule(firstname: String, kastanie: String, address: Adress): void {
    console.log(
      `Scheduling appointment for ${firstname} with kastanie ${kastanie} (address: ${address instanceof Adress})`
    );
  }
}
