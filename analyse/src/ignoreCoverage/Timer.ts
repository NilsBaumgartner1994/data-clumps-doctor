import { AnalyseHelper } from './AnalyseHelper';

export type ProgressObject = {
  progress: number;
  total: number;
  prefix?: string | null;
  suffix?: string | null;
};

export class Timer {
  public logOutputDisabled: boolean = false;
  public startTime: number = 0;
  public lastElapsedTime: number = 0;
  public elapsedTimes: number[] = [];

  public Timer() {
    this.resetTimer();
  }

  public resetTimer() {
    this.startTime = 0;
  }

  public start() {
    this.startTime = new Date().getTime();
  }

  public stop() {
    this.elapsedTimes.push(this.getCurrentElapsedTime());
  }

  public getLatestElapsedTime() {
    return this.elapsedTimes[this.elapsedTimes.length - 1] || 0;
  }

  public getTotalElapsedTime() {
    let total = 0;
    for (let i = 0; i < this.elapsedTimes.length; i++) {
      total += this.elapsedTimes[i];
    }
    return total;
  }

  public getCurrentElapsedTime() {
    return new Date().getTime() - this.startTime;
  }

  public printTotalElapsedTime(prefix?: string | null, suffix?: string | null) {
    prefix = prefix ? `${prefix}: ` : '';
    suffix = suffix ? `: ${suffix}` : '';
    let elapsed = this.getTotalElapsedTime();
    if (this.logOutputDisabled) {
      return;
    }
    console.log(prefix + `Total elapsed time: ${this.formatTimeToString(elapsed)}` + suffix);
  }

  public printElapsedTime(prefix?: string | null, suffix?: string | null) {
    prefix = prefix ? `${prefix}: ` : '';
    suffix = suffix ? `: ${suffix}` : '';
    let elapsed = this.getCurrentElapsedTime();
    if (this.logOutputDisabled) {
      return;
    }
    console.log(prefix + `Elapsed time: ${this.formatTimeToString(elapsed)}` + suffix);
  }

  public printEstimatedTimeRemainingAfter1Second(progressObject: ProgressObject) {
    let elaspedTime = this.getCurrentElapsedTime();
    if (elaspedTime > this.lastElapsedTime + 1000) {
      this.printEstimatedTimeRemaining(progressObject);
      this.lastElapsedTime = elaspedTime;
    }
  }

  public printEstimatedTimeRemaining(progressObject: ProgressObject) {
    let elaspedTime = this.getCurrentElapsedTime();
    this.lastElapsedTime = elaspedTime;

    let progress = progressObject.progress;
    let total = progressObject.total;
    let prefix = progressObject.prefix;
    let suffix = progressObject.suffix;

    let remaining = total - progress;
    let estimatedTotalTime = (elaspedTime / progress) * total;
    let estimatedTimeStr = `[total: ${this.formatTimeToString(estimatedTotalTime)}]`;
    let remainingTime = (elaspedTime / progress) * remaining;
    let remainingTimeStr = `[remaining: ${this.formatTimeToString(remainingTime)}]`;
    prefix = prefix ? `${prefix}: ` : '';
    suffix = suffix ? `: ${suffix}` : '';
    let progressString = `(${progress}/${total})`;
    if (this.logOutputDisabled) {
      return;
    }
    console.log(prefix + `${remainingTimeStr} ${progressString}` + suffix);
  }

  public formatTimeToString(duration: number) {
    // print in format: HH:MM:SS.mmm
    let milliseconds = Math.floor(duration % 1000);
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    let days = Math.floor(duration / (1000 * 60 * 60 * 24));

    // pad with zeros
    let daysStr = days.toString().padStart(2, '0');
    let hoursStr = hours.toString().padStart(2, '0');
    let minutesStr = minutes.toString().padStart(2, '0');
    let secondsStr = seconds.toString().padStart(2, '0');
    let millisecondsStr = milliseconds.toString().padStart(3, '0');

    // print in format: HH:MM:SS.mmm
    return `${daysStr}d :${hoursStr}h :${minutesStr}m :${secondsStr}s.${millisecondsStr}`;
  }
}
