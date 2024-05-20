/**
 * This file contains general helpers
 */
export default {}
export function log(msg: string) {
    console.log(`~ ${msg} `);
}
/**
 * Display value of seconds to a formatted string (h:m:s)
 * @param {number} seconds - Seconds value to convert
  */
export function printSeconds(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const remaining = seconds % 3600;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;

    return (h ? `${h} hours ` : '')
        + (m ? `${m} minutes ` : '')
        + (`${s} seconds`);
}
/**
 * Print time in the future with the format `hour:minute`
 * @param {number} offsetInSeconds  - Time offset, to the future, in seconds.
 * #return {string} - Representation in `hour:minute` format.
 */
export function printHourAndMinuteFromNow(offsetInSeconds = 0): string {
    const t = new Date(Date.now() + offsetInSeconds * 1000);
    return `${t.getHours()}:${t.getMinutes()}`;
}

