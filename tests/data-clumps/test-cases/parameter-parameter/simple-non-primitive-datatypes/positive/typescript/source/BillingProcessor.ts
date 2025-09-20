import { Adress } from './Adress';

export class BillingProcessor {
  createInvoice(firstname: String, kastanie: String, address: Adress): void {
    console.log(`Creating invoice for ${firstname} with kastanie ${kastanie} (address: ${address instanceof Adress})`);
  }
}
