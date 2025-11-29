import {
  MyCardReaderInterface
} from "./MyCardReaderInterface";

export class MyUnsupportedCardReader implements MyCardReaderInterface {

  readCard(callBack: (answer: (string | undefined)) => Promise<void>, showInstruction: () => void, hideInstruction: () => void, nfcInstruction: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  readCardDublicate(a: string, b: string, c: string): void {
    return;
  }
}
