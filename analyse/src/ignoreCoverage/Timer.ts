import {AnalyseHelper} from "./AnalyseHelper";

export class Timer {

    public startTime: number = 0;
    public endTime: number = 0;
    public lastElapsedTime: number = 0;

    public Timer() {
        this.resetTimer()
    }

    public resetTimer() {
        this.startTime = 0;
        this.endTime = 0;
    }

    public start() {
        this.startTime = new Date().getTime()
    }

    public stop() {
        this.endTime = new Date().getTime()
    }

    public getElapsedTime() {
        if(this.endTime === 0){
            let now = new Date().getTime();
            return now - this.startTime;
        }

        return this.endTime - this.startTime;
    }

    public printElapsedTime(prefix?: string | null, suffix?: string | null) {
        prefix = prefix ? `${prefix}: ` : "";
        suffix = suffix ? `: ${suffix}` : "";
        let elapsed = this.getElapsedTime();
        console.log(prefix+`Elapsed time: ${this.formatTimeToString(elapsed)}`+suffix);
    }

    public printEstimatedTimeRemainingAfter1Second(progress: number, total: number, prefix?: string | null, suffix?: string | null) {
        let elaspedTime = this.getElapsedTime();
        if(elaspedTime > this.lastElapsedTime + 1000){
            this.printEstimatedTimeRemaining(progress, total, prefix, suffix);
            this.lastElapsedTime = elaspedTime;
        }
    }

    public printEstimatedTimeRemaining(progress: number, total: number, prefix?: string | null, suffix?: string | null) {
        let elaspedTime = this.getElapsedTime();
        this.lastElapsedTime = elaspedTime;

        let remaining = total - progress;
        let estimatedTotalTime = (elaspedTime / (progress)) * total;
        let estimatedTimeStr = `[total: ${this.formatTimeToString(estimatedTotalTime)}]`;
        let remainingTime = (elaspedTime / (progress)) * remaining;
        let remainingTimeStr = `[remaining: ${this.formatTimeToString(remainingTime)}]`;
        prefix = prefix ? `${prefix}: ` : "";
        suffix = suffix ? `: ${suffix}` : "";
        let progressString = `(${progress}/${total})`;
        console.log(prefix+`${remainingTimeStr} ${progressString}`+suffix);
    }

    public formatTimeToString(duration: number) {
        // print in format: HH:MM:SS.mmm
        let milliseconds = Math.floor(duration % 1000);
        let seconds = Math.floor((duration / 1000) % 60);
        let minutes = Math.floor((duration / (1000 * 60)) % 60);
        let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
        let days = Math.floor((duration / (1000 * 60 * 60 * 24)));

        // pad with zeros
        let daysStr = days.toString().padStart(2, "0");
        let hoursStr = hours.toString().padStart(2, "0");
        let minutesStr = minutes.toString().padStart(2, "0");
        let secondsStr = seconds.toString().padStart(2, "0");
        let millisecondsStr = milliseconds.toString().padStart(3, "0");

        // print in format: HH:MM:SS.mmm
        return `${daysStr}d :${hoursStr}h :${minutesStr}m :${secondsStr}s.${millisecondsStr}`;
    }

}
