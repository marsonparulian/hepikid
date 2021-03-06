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
    console.log(`~ ${msg} `);
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
    // Variables below represents a periode of time in milliseconds, Will be used such as for timeout to wait for animation or before `click`.
    static SHORT_TIME: number = 2e3; // e.g.: wait little animation
    static TINY_TIME: number = 7e2; //  e.g.: wait for element focus
    // Next product index to boost from list on web page. The value is set to `-1` to trigger function to find the starter index. The default value will be `0`;
    #nextIndexToBoost: number = -1;
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
    // Selector for HTML element that holds 1 product by index (row / card).
    private createProductSelector(): string {
        // Selector seems have changed
        // return `.product-list-card:nth-of-type(${this.#nextIndexToBoost + 1})`;
        return `.shopee-table__row:nth-of-type(${this.#nextIndexToBoost + 1})`;
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

        // Increase timeout to handle slow internet connection.
        await page.setDefaultNavigationTimeout(50e3);
        await page.setDefaultTimeout(50e3)

        await login(page);
        log('New page is opned and logged in');
        log('---------------------------------')

        // Start the first boost iteration
        this.AttempToBoostThisProduct(page);
        console.log('\n');
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

        // Class name of the product list page seems have changed
        // await page.waitForSelector('.product-list-wrap');
        await page.waitForSelector('.product-list-main');
        log('Product page is loaded');
    }


    private async clickTheBoostButton(page: Page): Promise<number> {
        // The objective is to click the 'boost button', which contain inside a dropdown element of a specific product element.
        // However after the dropdown element become visible, triggerred by clicking 'Lainnya' button, the dropdown element is no longer a child of the product element. 
        // The dropdown element, including the booster button element, are moved to the buttom of the HTML DOM.
        // Since moved, it is now harder to select the booster button element for the specific product.
        // `page.waitForSelector(boosterSelector, {visible: true})` will wait for the first booster button (different product), on top of DOM, which is hidden. This will result in timeout error.
        // The solution is to get reference to the booster button element while still inside the product element.
        // Even after the dropdown element is moved, we will still be able to 'click' the booster button.

        // Get reference to the booster button of the target product.
        const boostButton = await page.$(`${this.createProductSelector()} ${ProductBooster.generalBoosterButtonSelector}`).catch((e: any) => {
            console.error('Error finding boost button element');
        });
        if (!boostButton) throw new Error('Boost button is falsy');

        // Click `Lainnya` button / link. This will show and move the dropdown element.
        const dropdownClickableSelector = `${this.createProductSelector()} .product-action .shopee-dropdown button`;
        log(`'lainnya' button selector: ${dropdownClickableSelector} `);
        await page.click(dropdownClickableSelector);
        await page.waitForTimeout(ProductBooster.SHORT_TIME); // Wait until dropdown animation completely finished.

        // Click the `Naikkan produk` (booster button). 
        await boostButton.click();
        await page.waitForTimeout(ProductBooster.TINY_TIME);
        log('"naikkan produk" button is clicked');

        // Click again to close the drop down
        await page.click(dropdownClickableSelector);
        // Wait so the dropdown's fade out animation completely finished
        await page.waitForTimeout(ProductBooster.SHORT_TIME);

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
    private calculateSecondsToHaveAvailableSlot(): number {
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

            // On first run, set the starter product index
            // This is not done in the `execute` method because the page load / refresh is done in this method.
            if (this.#nextIndexToBoost < 0) await this.setStarterProductIndex(page);

            // Log info about this boot iteration
            let now = new Date();
            log(`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()} - Product #${this.#nextIndexToBoost + 1}, initiating boost sequence..`);

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
                    nextAttemptTimeout = Math.max(this.calculateSecondsToHaveAvailableSlot(), secondsToFulfillInterval);
                } else if (!hasNowReachTheRequiredInterval) {
                    console.log('Not yet reach the required interval');
                    // Schedule the next attempt : after `boostInterval` on the last countdownTimer 
                    nextAttemptTimeout = secondsToFulfillInterval;
                } else {
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
            await screenshot(page, 'error_attempt-to-boost.png');
            console.error(e);
            console.error('Oops, something is wrong. Will redo the attempt in 5 minutes');
            console.log('\n');
            // Try again
            setTimeout(() => {
                this.AttempToBoostThisProduct(page);
            }, 50 * 60e3);
        }
    }
    private async parseCountdownTimers(page: Page) {
        let timersValueString: string[][] = await page.$$eval(`${ProductBooster.generalBoosterButtonSelector}${ProductBooster.generalCountdownTimerSelector}`, elements => {
            return elements.map(el => {
                const text: string[] = el.textContent?.match(/\d{2}/g) || [];
                return text;
            });
        });

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
    /**
     * Set the product index to start the whole boosting iteration.
     * The starter index is n where Product[n] is not boosted & Product[n-1] is boosted. Default is 0.
     * @param page 
     */
    private async setStarterProductIndex(page: Page) {
        // Remove the `.` (dot) from the selector
        const timerClass = ProductBooster.generalCountdownTimerSelector.substring(1);
        // Iterate through all `boostButton`
        this.#nextIndexToBoost = await page.$$eval(ProductBooster.generalBoosterButtonSelector, (elements, arg1: unknown, arg2: unknown) => {
            const limit = typeof (arg1) === 'number' ? arg1 : 33;
            const timerClass = typeof (arg2) === 'string' ? arg2 : 'count-cool';
            let starterIndex = 0;
            for (let i = 1; i < limit; i++) {
                if (!elements[i].classList.contains(timerClass)
                    && elements[i - 1].classList.contains(timerClass)) {
                    starterIndex = i;
                    break;
                }
            }
            return starterIndex;
        }, ProductBooster.totalProductsToBoost, timerClass);
        log(`Product boost will start from product #${this.#nextIndexToBoost + 1}`);
    }
}



export default ProductBooster;
