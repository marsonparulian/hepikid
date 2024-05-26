/**
 * A simple logger to print with 2 level : `INFO` and `DEBUG`
*/
class Logger {
    public static INFO = 1;
    public static DEBUG = 5;
    // Will be used to decide wheter goona print the log or not.
    private level: number = 1;
    constructor(level: number) {
        this.level = level;
    }
    public getLevel(): number {
        return this.level;
    }
    public setLevel(level: number) {
        this.level = level;
    }
    public info(msg: string) {
        if (this.level <= Logger.INFO) console.log(msg);
    }
    public debug(msg: string) {
        if (this.level <= Logger.DEBUG) console.log(msg);
    }
}

export default Logger;