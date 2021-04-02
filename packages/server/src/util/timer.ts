/**
 * AdjustingTimer which attempts to self-correct deviations from interval
 * @source https://stackoverflow.com/a/44337628
 */
export class AdjustingTimer {
    workerFunc: () => void;
    interval: number;
    errorFunc: () => void;
    expected: number;
    timeout: NodeJS.Timeout;

    constructor(workerFunc: () => void, interval: number, errorFunc: () => void) {
        this.workerFunc = workerFunc;
        this.interval = interval;
        this.errorFunc = errorFunc;
    }

    start = (): void => {
        this.expected = Date.now() + this.interval;
        this.timeout = setTimeout(this.step, this.interval);
    }

    stop = (): void => {
        clearTimeout(this.timeout);
    }

    step = (): void => {
        const drift = Date.now() - this.expected;
        if (drift > this.interval) {
            // the drift is more than the looping interval
            if (this.errorFunc) this.errorFunc();
        }
        this.workerFunc();
        this.expected += this.interval;
        this.timeout = setTimeout(this.step, Math.max(0, this.interval- drift));
    }
}