import { DetectorOptions } from './Detector';

export abstract class DetectorBase {
  public options: DetectorOptions;
  public progressCallback: any;

  protected constructor(options: DetectorOptions, parseOptions: (raw: DetectorOptions) => DetectorOptions, progressCallback?: any) {
    this.options = parseOptions(JSON.parse(JSON.stringify(options)));
    this.progressCallback = progressCallback;
  }
}
