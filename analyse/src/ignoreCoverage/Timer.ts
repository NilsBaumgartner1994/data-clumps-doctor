export class Timer {

    public startTime: number = 0;
    public endTime: number = 0;

    /**
     * Initializes a new Timer instance.
     * @throws {Error} Throws an error if the timer reset fails.
     */
    public Timer() {
        this.resetTimer()
    }

    /**
     * Resets the timer by setting the start time and end time to 0.
     */
    public resetTimer() {
        this.startTime = 0;
        this.endTime = 0;
    }

    /**
     * Start the process and set the start time.
     * @throws {Error} If unable to set the start time.
     */
    public start() {
        this.startTime = new Date().getTime()
    }

    /**
     * Stops the timer by setting the end time to the current time.
     * @throws {Error} If an error occurs while setting the end time.
     */
    public stop() {
        this.endTime = new Date().getTime()
    }

    /**
     * Calculates the elapsed time between the start time and end time.
     * @returns {number} The elapsed time in milliseconds.
     */
    public getElapsedTime() {
        if(this.endTime === 0){
            let now = new Date().getTime();
            return now - this.startTime;
        }

        return this.endTime - this.startTime;
    }

    /**
     * Print the elapsed time with optional prefix and suffix.
     * @param prefix Optional prefix to be added before the elapsed time.
     * @param suffix Optional suffix to be added after the elapsed time.
     * @throws - No exceptions are thrown by this method.
     */
    public printElapsedTime(prefix?: string | null, suffix?: string | null) {
        prefix = prefix ? `${prefix}: ` : "";
        suffix = suffix ? `: ${suffix}` : "";
        console.log(prefix+`Elapsed time: ${this.formatTimeToString()}`+suffix);
    }

    /**
     * Format the elapsed time to a string in the format HH:MM:SS.mmm
     * @throws {Error} If getElapsedTime function is not available
     */
    public formatTimeToString() {
        // print in format: HH:MM:SS.mmm
        let duration = this.getElapsedTime();
        let milliseconds = Math.floor(duration % 1000);
        let seconds = Math.floor((duration / 1000) % 60);
        let minutes = Math.floor((duration / (1000 * 60)) % 60);
        let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        // pad with zeros
        let hoursStr = hours.toString().padStart(2, "0");
        let minutesStr = minutes.toString().padStart(2, "0");
        let secondsStr = seconds.toString().padStart(2, "0");
        let millisecondsStr = milliseconds.toString().padStart(3, "0");

        // print in format: HH:MM:SS.mmm
        return `${hoursStr}:${minutesStr}:${secondsStr}.${millisecondsStr}`;
    }

}
