export interface MyCardReaderInterface {
  readCard(callBack: (answer: string | undefined) => Promise<void>, showInstruction: () => void, hideInstruction: () => void, nfcInstruction: string): Promise<void>;
}
