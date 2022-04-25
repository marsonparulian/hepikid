import { Browser, Page } from "puppeteer";
import 'dotenv/config';
import login from "./web-login";
import { exit } from "process";

// This file contain `ProductBooster`, a sub application to boost product by web automation

/**
 *  Do screenshot
 * @param {Page} page 
 * @param fName  - File name
 * @returns  {Promise<void>}
 */
function screenshot(page: Page, fName: string): Promise<any> {
    return page.screenshot({ path: `logs/screenshots/${fName}` });
}
function log(msg: string) {
    console.log(`[Boost] ${msg} `);
}
/**
 * Display value of seconds to a formatted string (h:m:s)
 * @param {number} seconds - Seconds value to convert
  */
function printSeconds(seconds: number) {
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
function printHourAndMinuteFromNow(offsetInSeconds = 0): string {
    const t = new Date(Date.now() + offsetInSeconds * 1000);
    return `${t.getHours()}:${t.getMinutes()}`;
}
class ProductBooster {
    #browser: Browser;
    // Next product index to boost from list on web page
    #nextIndexToBoost: number = 0;
    // Total products to boost
    static totalProductsToBoost: number = 7;
    // Maximum number of concurrently boosted products .
    static maxBoostSlot: number = 5;
    // How long the boostedproduct will last until can be boosted again (in seconds)
    static boostedDuration = 4 * 60 * 60; // 4 hours
    // Boost interval, elapsed boost time between products, in seconds
    static boostInterval: number = Math.ceil(ProductBooster.boostedDuration / ProductBooster.maxBoostSlot);
    // Value of countdown timers, in seconds.
    #countdownDimersInSeconds: number[] = [];
    // Selector for `boosterButton` elements.
    static generalBoosterButtonSelector: string = '.boost-button-text';
    // Selector for `countdownTimer` elements
    static generalCountdownTimerSelector: string = '.count-cool';
    // Selector for index row /card
    private createProductSelector(): string {
        return `.product-list-card:nth-of-type(${this.#nextIndexToBoost + 1})`;
    }

    constructor(browser: Browser) {
        this.#browser = browser;
    }
    /**
 * main function to 'execute' product booster functionality.
 * 
 * @return {Promise<void>}
 */
    async execute() {
        // Open new page & login
        const page = await this.#browser.newPage();
        await login(page);
        log('New page is opned and logged in');

        // Start the first `boostAProduct`
        // this.boostAProduct(page);
        this.AttempToBoostThisProduct(page);
        console.log('\n');
    }
    /**
    * Boost a product. Will schedule the next `boostAProduct`.
    * 
    */
    async boostAProduct(page: Page) {
        try {
            // Background : After we click a boost button, a countdown timer shows up. If there are 5 timer (5 products currently boosted) other products will not have the button to boost the corresponding product.
            // Problem : If we keep the browser opened, those timers eventually will be slower than the actual time (maybe caused by the used of `setTimeout`). So in 4 hours, we will not be able to boost the next product because there are still some minutes in the supposed-to-be-finish timer.
            // Solution : In each iteration, open other random page, go back to the product page then do the boost process. This will refresh the timers so the timers will have the actual remaining time.
            await this.refreshPage(page);

            // Create the CSS selector for the product. Will serve as context.
            const productSelector = `.product-list-card:nth-of-type(${this.#nextIndexToBoost + 1})`

            // Parse the product name
            const productName = await page.$eval(`${productSelector} a.product-name-wrap`, el => el.textContent);
            log(`Checking product #${this.#nextIndexToBoost + 1}: ${productName} `)

            // Define & wait for `boosButtonSelector`
            const generalBoostButtonSelector = '.boost-button-text';
            const countdownTimerSelector = '.count-cool';

            // Timeout for the next boost. Default value is the `boostInterval`
            let nextBoostTimeout = await this.#calculateNextBoostFromNowToMatchInterval(page);


            // If this product is still boosted, Immediately check the next product until the end of product (`#totalProductToBoost).
            // If the number of boosted products has reached the limit (`ProductBooster.MaxBoostedConcurrently``), retry to boost the same product in 5 minutes.

            // IMPORTANT! It is assumed that `ProductBooster.totalProductsToBoost` > `ProductBooster.MaxBoostedConcurrently`
            if (await this.isThisProductCurrentlyBoosted(page)) {
                console.log('This product is still boosted. Immediately check the next product');
                this.#toNextProductIndex();
                nextBoostTimeout = 1; // Immediately.
            } else {
                // If there are no active `boostButton` found in whole page, that means `ProductBooster.MaxBoostedConcurrently` has been reached. Active`boostButton` is `boostButton` without the 'timer' selector.boost button
                const numberOfReadyBoostButtonsOnThePage = await page.$$eval(`${generalBoostButtonSelector}:not(${countdownTimerSelector})`, elements => elements.length);

                if (numberOfReadyBoostButtonsOnThePage == 0) {
                    log('Number of boosted roducts currently at maximum capacity. ');
                } else {

                    await this.clickTheBoostButton(page);
                }

            }

            // Schedule next `boostAProduct`
            setTimeout(() => {
                this.boostAProduct(page);
            }, nextBoostTimeout * 1000);
            console.log(`Next boost will start in ${nextBoostTimeout} seconds`);
            console.log('\n');

        } catch (e) {
            console.error(e);
        }
    }
    private isNoProductsCurrentlyBoosted(): boolean {
        const result = this.#countdownDimersInSeconds.length == 0;

        if (result) console.log('No products is currently boosted');
        else log('There are some products currently boosted');

        return result;
    }
    private async isThisProductCurrentlyBoosted(page: Page) {
        const result = await page.$(`${this.createProductSelector()}  ${ProductBooster.generalCountdownTimerSelector}`) === null ? false : true;

        if (result) console.log('This product is currently boosted');
        else console.log('This product is not boosted');

        return result;
    }
    private areCurrentBoostedProductsAtMaximumCapacity(): boolean {
        const result = this.#countdownDimersInSeconds.length >= ProductBooster.maxBoostSlot;

        if (result) console.log('Current boosted products are at maximum capacity');
        else console.log('Some spaces available to boost a product');

        return result;
    }
    private async refreshPage(page: Page) {
        await page.goto('https://seller.shopee.co.id/portal/crm/overview');
        await page.waitForTimeout(200);

        // Go to the product page 
        await page.goto('https://seller.shopee.co.id/portal/product/list/all');
        await page.waitForSelector('.product-list-wrap');
        log('Product page is loaded');
    }

    private async clickTheBoostButton(page: Page): Promise<number> {
        // Click `Lainnya` link (will triggerdropdown))
        const dropdownClickableSelector = `${this.createProductSelector()}  .product-action .shopee-dropdown button`;
        log(`'lainnya' button selector: ${dropdownClickableSelector} `);
        await page.click(dropdownClickableSelector);
        await page.waitForTimeout(700); // Wait until dropdown animation completely finished.

        // Verify the `Naikan produk` (boost button) exist.
        const boostButtonSelector = `${this.createProductSelector()}  ${ProductBooster.generalBoosterButtonSelector}`;
        console.log(`boost button selector : ${boostButtonSelector}`);
        await page.waitForSelector(boostButtonSelector);
        console.log(`boostButton is loaded / visible : ${boostButtonSelector}`);

        // Click the `Naikkan produk` link
        await page.click(boostButtonSelector);
        log('"naikkan produk" button is clicked');

        // Click again to close the drop down
        await page.click(dropdownClickableSelector);
        // Wait so the dropdown's fade out animation completely finished
        await page.waitForTimeout(600);

        // After effect
        this.#toNextProductIndex();
        // Return the timeout for the next 'boost'
        return ProductBooster.boostInterval;
    }

    #toNextProductIndex() {
        this.#nextIndexToBoost = (this.#nextIndexToBoost + 1) % ProductBooster.totalProductsToBoost;
    }
    /**
     * Get the greatest countdown timer, the last timer will reach 00:00, of the currently boosted products.
     * @return {number} Number of seconds until the last countdown timer is completed.
     */
    async #getTheGreatestCountdownTimerValueInSeconds(page: Page): Promise<number> {
        let timersValueString: string[][] = await page.$$eval(`${ProductBooster.generalBoosterButtonSelector}${ProductBooster.generalCountdownTimerSelector}`, elements => {
            return elements.map(el => {
                const text: string[] = el.textContent?.match(/\d{2}/g) || [];
                return text;
            });
        });
        if (!timersValueString) timersValueString = [];
        console.log(`timer value string: ${timersValueString}`);

        // Convert to number, in seconds, and get the greatest value (countdown timer)
        const greatest: number = timersValueString.reduce((acc, arr) => {
            // const seconds: number = arr ? parseInt(arr[0]) : 0 * 60 * 60;
            const seconds: number = parseInt(arr ? arr[0] : '0') * 60 * 60
                + parseInt(arr ? arr[1] : '0') * 60
                + parseInt(arr ? arr[2] : '0');

            // Get the greatst / (latest timer)
            if (seconds > acc) return seconds;
            return acc;
        }, 0);
        return greatest;
    }
    /**
     * Calculate how many seconds the next boost should be done from now.
     * The objective of this method is to maintain the interval (48+ minutes) between boost.
     */
    async #calculateNextBoostFromNowToMatchInterval(page: Page): Promise<number> {
        // Get when the last timer will be off, then substract the time elapsed from `boostInterval`, so the distance between boost time little greater than `boostInterval`
        const greatestTimer = await this.#getTheGreatestCountdownTimerValueInSeconds(page);
        // retgfc nnnurn greatestTimer + ProductBooster.boostInterval;
        const nextBoost = ProductBooster.boostInterval - (ProductBooster.boostedDuration - greatestTimer);
        if (nextBoost < 0) {
            log(`Next boost is negative : ${nextBoost}`);
            return 0;
        }
        return nextBoost || 0;
    }
    /**
     * Calculate the timeout to do next boost.
     * If there is a lot to boost a product, return 0.
     * If boosted products at maximum capacity, wait until 1 slot available.
     * 
     * @return {number} Calculated timeout in seconds
     */
    private calculateWhenAllowedToBoost(): number {
        // If boost slot is available, return minimum timeout
        if (this.#countdownDimersInSeconds.length < ProductBooster.maxBoostSlot) return 0;

        // Find the minimum countdown timers
        return this.#countdownDimersInSeconds.reduce((acc, seconds) => {
            return Math.min(acc, seconds);
        }, ProductBooster.boostedDuration);
    }
    private async AttempToBoostThisProduct(page: Page) {
        try {
            // Refresh page to refresh the countdown timers to the real remaining time.
            await this.refreshPage(page);

            // Parse countdown timers & convert to seconds. The values will be used in this code block.
            await this.parseCountdownTimers(page);

            /*
            * This method basically try to answer below questions based on conditions :
            * 1. Should click the`boostButton` in this attempt ?
            * 2. Should move the product index to the next one ?
            * 3. When is the next attemp should be schedules (timeout in seconds0 ?)
            */

            let nextAttemptTimeout: number;
            if (this.isNoProductsCurrentlyBoosted()) {
                // Boost this product, increment index, set timeout with the `boostInterval`
                await this.clickTheBoostButton(page);
                nextAttemptTimeout = ProductBooster.boostInterval;
            } else if (await this.isThisProductCurrentlyBoosted(page)) {
                // increment product index, schedule for immediate attemp
                this.#nextIndexToBoost++;
                nextAttemptTimeout = 0;
            } else {
                // Seconds from now, to fulfill the required `boostInterval`, relative from the last boot )greated countdown timer)
                const secondsToFulfillInterval: number = await this.#calculateNextBoostFromNowToMatchInterval(page);
                // Has current time fulfill the required interval to do the next boost ?
                const hasNowReachTheRequiredInterval = secondsToFulfillInterval <= 0;
                const areCurrentBoostedProductsAtMaximumCapacity = this.#countdownDimersInSeconds.length >= ProductBooster.maxBoostSlot;

                if (areCurrentBoostedProductsAtMaximumCapacity) {
                    console.log('Boosted products at maximum capacity');
                    // Schedule for the next attempt when the first / oldest countdown timer expires. & after `boostInterval` from the last countdownTimer.
                    nextAttemptTimeout = Math.max(this.calculateWhenAllowedToBoost(), secondsToFulfillInterval);
                } else if (!hasNowReachTheRequiredInterval) {
                    console.log('Not yet reach the required interval');
                    // Schedule the next attempt : after `boostInterval` on the last countdownTimer 
                    nextAttemptTimeout = secondsToFulfillInterval;
                } else {
                    console.log('Boost the product : Catched by the default case');

                    // Boost this product 
                    await this.clickTheBoostButton(page);
                    nextAttemptTimeout = ProductBooster.boostInterval;
                }

            }

            // Schedule the next attemp
            setTimeout(() => {
                this.AttempToBoostThisProduct(page);
            }, nextAttemptTimeout * 1000);

            console.log(`Next boost attempt will be in ${printSeconds(nextAttemptTimeout)} (at ${printHourAndMinuteFromNow(nextAttemptTimeout)})`);
            console.log('\n');
        } catch (e) {
            await screenshot(page, 'error_attempt-to-boost');
            console.error(e);
            console.error('Oops, something is wrong. Will redo the attempt in 4 seconds');
            console.log('\n');

            // Try again
            setTimeout(() => {
                this.AttempToBoostThisProduct(page);
            }, 4e3);
        }
    }
    private async parseCountdownTimers(page: Page) {
        let timersValueString: string[][] = await page.$$eval(`${ProductBooster.generalBoosterButtonSelector}${ProductBooster.generalCountdownTimerSelector}`, elements => {
            return elements.map(el => {
                const text: string[] = el.textContent?.match(/\d{2}/g) || [];
                return text;
            });
        });
        // if (!timersValueString) timersValueString = [];
        console.log(`Parsed countdown timers : ${timersValueString}`);

        // Convert to number in seconds
        this.#countdownDimersInSeconds = timersValueString.map((arr) => {
            const seconds = parseInt(arr ? arr[0] : '0') * 60 * 60
                + parseInt(arr ? arr[1] : '0') * 60
                + parseInt(arr ? arr[2] : '0');
            return seconds;
        });
        console.log(`parsed seconds :`);
        this.#countdownDimersInSeconds.forEach(sec => {
            console.log(printSeconds(sec));
        });
    }

}



export default ProductBooster;
