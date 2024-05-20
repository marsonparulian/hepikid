import 'dotenv/config';
import { exit } from "process";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer";
import * as helper from "./helper";
import login from "./web-login";
import * as c from './product-booster-static';

// This file contain `ProductBooster`, a sub application to boost product by web automation
/**
 *  Do screenshot
 * @param {Page} page 
 * @param fName  - File name
 * @returns  {Promise<void>}
 */
function screenshot({ page, fName }: { page: Page; fName: string; }): Promise<any> {
    return page.screenshot({ path: `logs/screenshots/${fName}` });
}
class ProductBooster {
    // Variables below represents a periode of time in milliseconds, Will be used such as for timeout to wait for animation or before `click`.
    static MEDIUM_TIME: number = 4e3;  // e.g.: wait for browser operation to finish.
    static SHORT_TIME: number = 2e3; // e.g.: wait little animation
    static TINY_TIME: number = 7e2; //  e.g.: wait for element focus
    // 'boostable' product indexes. Contain which products can be boosted by their order number in the web page.
    #boostableProductIndexes: number[] = [];
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
    // Selector for HTML elements that contains each product
    static productContainerSelector = '.shopee-table__fix-body.shopee-table__fix-right .shopee-table__row';

    // CSS Selector for HTML element that holds 1 product by index (row / card).
    private productContainerByIndex(i: number): string {
        return `${ProductBooster.productContainerSelector}:nth-of-type(${i + 1})`;
    }
    // CSS Selector for 'more dropdown menu' (the menu will appeared if 'Lainnya' button is clicked), for specific product by indexed.
    private cssMoreDropdownMenuByIndex(i: number): string {
        return `${this.productContainerByIndex(i)} .more-dropdown-menu`;
    }
    // CSS Selector for the container of the next product to boost. 
    private productContainerSelectorForNextIndexToBoost(): string {
        console.debug(`next index to boost: ${this.#nextIndexToBoost}`);
        return `.shopee-table__row:nth-of-type(${this.#nextIndexToBoost + 1})`;
        console.log(`Product row selector ++++`);
        console.log(`.shopee-table__row:nth-of-type(${this.#nextIndexToBoost + 1})`);

    }
    private moreButtonSelector = '.more-dropdown-menu';
    private productActionsContainerSelector = '.last-cell';
    private productListContainerSelector = '.product-list-main';
    constructor() {
    }
    /**
 * main function to 'execute' product booster functionality.
 * 
 * @return {Promise<void>}
 */
    async execute() {

        // Start the first boost iteration
        this.AttempToBoostThisProduct();
    }
    private isNoProductsCurrentlyBoosted(): boolean {
        const result = this.#countdownDimersInSeconds.length == 0;

        if (result) console.log('No products is currently boosted');
        else helper.log('There are some products currently boosted');

        return result;
    }
    private async isThisProductCurrentlyBoosted(page: Page) {
        const result = await page.$(`${this.productContainerSelectorForNextIndexToBoost()}  ${ProductBooster.generalCountdownTimerSelector}`) === null ? false : true;

        if (result) console.log('This product is currently boosted');

        return result;
    }
    private areCurrentBoostedProductsAtMaximumCapacity(): boolean {
        const result = this.#countdownDimersInSeconds.length >= ProductBooster.maxBoostSlot;

        if (result) console.log('Current boosted products are at maximum capacity');
        else console.log('Some spaces available to boost a product');

        return result;
    }

    private async clickTheBoostButton(page: Page): Promise<number> {
        // The objective is to click the 'boost button', which contain inside a dropdown element of a specific product element.
        // However after the dropdown element become visible, triggerred by clicking 'Lainnya' button, the dropdown element is no longer a child of the product element. 
        // The dropdown element, including the booster button element, are moved to the buttom of the HTML DOM.
        // Since moved, it is now harder to select the booster button element for the specific product.
        // `page.waitForSelector(boosterSelector, {visible: true})` will wait for the first booster button (different product), on top of DOM, which is hidden. This will result in timeout error.
        // The solution is to get reference to the booster button element while still inside the product element.
        // Even after the dropdown element is moved, we will still be able to 'click' the booster button.


        // FIXME: delete line below
        // await new Promise(r => setTimeout(r, 231e3));

        // This is a try out
        // Click the 'more' button ('Lainnya' button) of the product that is going to be boosted.
        const allMoreButtons = await page.$x("//*[contains(text(), 'Lainnya')]");
        if (allMoreButtons === null) throw ('Error find button');

        // Get the 'more' button to be clicked.
        const moreButton = allMoreButtons[this.#nextIndexToBoost] as ElementHandle<Element>;
        await moreButton.click();












        // DELETE THIS BLOCK: Get reference to the booster button of the target product.
        // console.log(`searching boost button: ${this.productContainerSelectorForNextIndexToBoost()} ${ProductBooster.generalBoosterButtonSelector}`);
        // const boostButton = await page.$(`${this.productContainerSelectorForNextIndexToBoost()} ${ProductBooster.generalBoosterButtonSelector}`).catch((e: any) => {
        //     console.error('Error finding boost button element');
        // });
        // if (!boostButton) throw new Error('Boost button is falsy');



        // Click the booster button
        await page.evaluate(this.clickBoosterButtonInSpecificProduct, this.cssMoreDropdownMenuByIndex(this.#nextIndexToBoost));


        // Click `Lainnya` button / link. This will show and move the dropdown element.
        // const dropdownClickableSelector = `${this.productContainerSelectorForNextIndexToBoost()}.product-action.shopee-dropdown button`;
        // await page.click(dropdownClickableSelector);

        await page.waitForTimeout(ProductBooster.SHORT_TIME); // Wait until dropdown animation completely finished.

        // Click the booster button within browser context
        await page.evaluate((cssMoreDropdownMenu) => {
            console.log(`css: ${cssMoreDropdownMenu}`)

            let buttons = document.querySelectorAll(`${cssMoreDropdownMenu} li`)

            for (let i = 0; i < buttons.length; i++) {
                console.log(`text: ${buttons[i].textContent}`);
            }
        }, this.cssMoreDropdownMenuByIndex(this.#nextIndexToBoost));

        // Click the `Naikkan produk` (booster button). 
        // await boostButton.click();

        await page.waitForTimeout(ProductBooster.TINY_TIME);
        helper.log('"naikkan produk" button is clicked');

        // Click again to close the drop down
        // await page.click(dropdownClickableSelector);
        await moreButton.click();

        // Wait so the dropdown's fade out animation completely finished
        await page.waitForTimeout(ProductBooster.SHORT_TIME);


        // Return the timeout for the next 'boost'
        return ProductBooster.boostInterval;
    }

    /**
     * Get the greatest countdown timer, the last timer will reach 00:00, of the currently boosted products.
     * @return {number} Number of seconds until the last countdown timer is completed.
     */
    async #getTheGreatestCountdownTimerValueInSeconds(page: Page): Promise<number> {
        let timersValueString: string[][] = await page.$$eval(`${ProductBooster.generalCountdownTimerSelector}`, elements => {
            return elements.map(el => {
                const text: string[] = el.textContent?.match(/\d{2}/g) || [];
                return text;
            });
        });
        if (!timersValueString) timersValueString = [];

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
            helper.log(`Next boost should've been : ${nextBoost} ago.`);
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
    private async AttempToBoostThisProduct() {
        // Launch browser & init a page
        const browser = await puppeteer.launch({
            // headless: process.env.BROWSER_HEADLESS ? true : false,
            headless: false,
            slowMo: 50, // slow down by 50ms 
            userDataDir: "./user_data",
        }).catch(e => {
            console.error(e);
        });

        // Open a new page
        if (!browser) throw new Error("Failed launching browser.");
        const page = await browser.newPage();
        // Increase timeout to handle slow internet connection.
        await page.setDefaultNavigationTimeout(50e3);
        await page.setDefaultTimeout(50e3)

        await login(page);
        helper.log('---------------------------------')

        // Open new page & go to the product list page
        await page.goto('https://seller.shopee.co.id/portal/product/list/all');
        await page.waitForSelector(this.productListContainerSelector);
        // Wait for products
        await page.waitForSelector(ProductBooster.productContainerSelector);
        // Wait a little more to make sure all products are loaded
        await new Promise(r => setTimeout(r, ProductBooster.MEDIUM_TIME));

        try {
            // View the product actions containers so the page will generate the DOM inside, including the boost buttons
            await this.viewAllProductActionsContainers(page);

            // So we are going to hold the 'boostable' products by their occurances in the web page, skiping the non-boostable products.
            // This values will be used to determine which product, by its order, to be boosted this time.
            await this.generateBoostableProductIndexes(page);

            // Set the index of the product to boost.
            await this.setProductIndexToBoost(page);

            // Log info about this boot iteration
            let now = new Date();
            helper.log(`${now.getHours()}: ${now.getMinutes()}: ${now.getSeconds()} - Product #${this.#nextIndexToBoost}, initiating boost sequence..`);

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
                this.AttempToBoostThisProduct();
            }, nextAttemptTimeout * 1000);

            console.log(`Next boost attempt will be in ${helper.printSeconds(nextAttemptTimeout)}(at ${helper.printHourAndMinuteFromNow(nextAttemptTimeout)})`);

            // Close this page & browser
            // Note: If we do `page.close()` will create error: `process PID 'xxxx' can not be found`.
            // This error may be caused by the attempt to remove process during `browser.close()` that already removed during `page.close()`.
            // The error started to occur after `puppeteer` has just been updated.
            // await page.close();
            await browser.close();
            console.log("Page & browser is closed.");

            console.log('\n');
        } catch (e) {
            await screenshot({ page, fName: 'error_attempt-to-boost.png' });
            console.error(e);
            console.error('Oops, something is wrong. Will redo the attempt in 5 minutes');
            console.log('\n');
            // Try again
            setTimeout(() => {
                this.AttempToBoostThisProduct();
            }, 5 * 60e3);
        }
    }
    private async parseCountdownTimers(page: Page) {
        // let timersValueString: string[][] = await page.$$eval(`${ProductBooster.generalBoosterButtonSelector}${ProductBooster.generalCountdownTimerSelector}`, elements => {
        let timersValueString: string[][] = await page.$$eval(`${ProductBooster.generalCountdownTimerSelector}${ProductBooster.generalCountdownTimerSelector}`, elements => {
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
        console.log(`parsed seconds : `);
        this.#countdownDimersInSeconds.forEach(sec => {
            console.log(helper.printSeconds(sec));
        });
    }
    /**
     * To be executed in browser context.
     * To get the string of the countdown timer for a specific product index (by the appearance in the browser). 
     * @param index The index of a specific product appeared in the web. 
     * @param containerSelector The CSS selector containing the countdown timer element. 
     * @param countdownTimerSelector The general CSS selector of countdown timer element.  
     */
    private getCountdownTimerTextByIndexInBrowserContext(containerSelector: string, countdownTimerSelector: string): string {
        let selector = `${containerSelector} ${countdownTimerSelector}`;
        // console.log(`aaa: ${ selector }`);
        let ctEl = document.querySelector(selector);
        // console.log("ctl");
        console.log(ctEl);
        // console.log(ctEl?.textContent);

        return ctEl?.textContent ? ctEl.textContent : "";
    }
    /**
     * This function is meant to be executed within browser context. 
     * This function is to get booster button / link in product container by index.
     * @param containerSelector CSS selector  for the container of the boost button. Product index already contained in this selector.
     */
    private getBoosterButtonByIndexInBrowserContext(containerSelector: string): undefined | HTMLButtonElement {
        console.log("This is the booster button selector");

        let boosterButton = undefined;

        // Loop for all `< `a />` elements, find the one with 'Lainnya' text.
        let buttons = document.querySelectorAll(`${containerSelector} a`)
        for (let i = 0; i < buttons.length; i++) {

            console.log(`text: ${buttons[i].textContent}`);
        }

        return boosterButton;
    }
    /**
     * This function to be executed within browser context.
     * Check if a booster button exist inthe specific product container. Product index already contained in the CSS selector.
     * @param cssMoreDropdownMenu CSS selector for a specific product container.
     */
    private isBoosterButtonExistInSpecificProduct(cssMoreDropdownMenu: string): boolean {
        // console.log('start checking booster button');
        let isBoosterButtonExist = false;

        let buttonsSelector = `${cssMoreDropdownMenu} .shopee-popover__ref`;
        // console.log(`button selector: ${buttonsSelector}`);
        let buttons = document.querySelectorAll(`${buttonsSelector} `);
        // console.log(`buttons length: ${buttons.length}`);

        // Look for button with 'Naikkan produk' text
        for (let i = 0; i < buttons.length; i++) {
            let buttonText: string = buttons[i].textContent + "";

            if (/\s*Naikkan\s+produk\s*/i.test(buttonText)) {
                isBoosterButtonExist = true;
                break;
            }

        }
        if (isBoosterButtonExist) {
            console.log("booster button is found");
        }
        return isBoosterButtonExist;
    }
    /**
     * Click the booster button for specific product index.
     * 
     * @param cssMoreDropdownMenu 
     * @returns 
     */
    private clickBoosterButtonInSpecificProduct(cssMoreDropdownMenu: string): boolean {
        console.log('about to click booster button');
        // let isBoosterButtonExist = false;

        let buttonsSelector = `${cssMoreDropdownMenu} .shopee-popover__ref`;
        // console.log(`button selector: ${buttonsSelector}`);
        let buttons = document.querySelectorAll(`${buttonsSelector} `);
        // console.log(`buttons length: ${buttons.length}`);

        // Look for button with 'Naikkan produk' text
        let isBoosterButtonClicked = false;
        for (let i = 0; i < buttons.length; i++) {
            let buttonText: string = buttons[i].textContent + "";

            if (/\s*Naikkan\s+produk\s*/i.test(buttonText)) {
                // isBoosterButtonExist = true;

                // Click the button
                (buttons[i] as HTMLButtonElement).click();
                isBoosterButtonClicked = true;
                break;
            }

        }
        // if (isBoosterButtonExist) {
        //     console.log("booster button is found");
        // }
        // return isBoosterButtonExist;
        return isBoosterButtonClicked;
    }
    /**
     * Generate the 'boostable' product index by their appearance order in the web page.
     * The boostableProductindexes is useful to determine the next product to be boosted, while skipping the non-boostable products (if any).
     * @return Promise<void>
     */
    private async generateBoostableProductIndexes(page: Page): Promise<void> {
        // Count the total products in theh web  page.
        const totalProducts = await page.$$eval(ProductBooster.productContainerSelector, (elements: any[]) => elements.length);
        console.log(`total products: ${totalProducts}`);



        // Loop from the first product, to see if the product container element has boost button or countdown timer text.
        // Stop the loop if ProductVooster.maxBoostSlot or the total available products has been reached.
        this.#boostableProductIndexes = [];
        for (let i = 0; i < totalProducts; i++) {

            // DELETE block below
            // Add the container if it has booster button or countdown timer text
            // let found = await page.evaluate((selector) => {
            //     console.log(selector);
            //     const el = document.querySelector(selector);
            //     if (el) return true;
            //     return false;

            // }, `${ProductBooster.productContainerSelector}:has(${ProductBooster.generalBoosterButtonSelector}):nth-of-type(${i + 1})`);

            // if (found) this.#boostableProductIndexes.push(i);





            // Stop if the range of products quantity to be boosted has been reached
            if (this.#boostableProductIndexes.length >= ProductBooster.totalProductsToBoost) break;

            // Check if the current index has countdown timer element
            let ctText = await page.evaluate(this.getCountdownTimerTextByIndexInBrowserContext, this.productContainerByIndex(i), ProductBooster.generalCountdownTimerSelector);
            // If countdown timer is found, this means this product is boostable. Then continue the loop.
            if (ctText) {
                // console.log(`ctText is ${ctText}`);
                this.#boostableProductIndexes.push(i);
                continue;
            }

            // Test if the current product (i) has 'boost button' by checking if it has 'Naikkan produk' text.
            let isBoosterButtonFound = await page.evaluate(this.isBoosterButtonExistInSpecificProduct, this.cssMoreDropdownMenuByIndex(i));
            if (isBoosterButtonFound) {
                this.#boostableProductIndexes.push(i);
                continue;
            }




        }
        console.log(`boostable product indexes : ${this.#boostableProductIndexes}`)
        console.log(this.#boostableProductIndexes);

        // Throw error if no boostable products are found.
        if (this.#boostableProductIndexes.length < 1) throw ("Error: not found boostable productt indexes");
    }
    /**
     * Set the product index to boost next, based on `this.boostableProductIndexes`
     * The next product index to boost is boostableProductIndexes[n] if Product index of boostableProductIndexes[n] is not boosted & boostableProductIndexes[n-1] is boosted. Default `n` is 0.
     * @param page 
     */
    private async setProductIndexToBoost(page: Page) {
        // Note: This function determines the start index by detecting the 'countdown timer' element in HTML.
        // The 'countdown timer' is generated by the JS in the web page.
        // To make sure the 'countdown timer' elements are completely generated, we are gonna wait a little more.
        await page.waitForTimeout(ProductBooster.MEDIUM_TIME);

        // Remove the `.` (dot) from the selector
        const timerClass = ProductBooster.generalCountdownTimerSelector.substring(1);
        // Evaluate browser context to decide on which index to boost next
        this.#nextIndexToBoost = await page.evaluate((boosterSelector: string, arg2: unknown, bpi: number[], productContainerSelector: string) => {
            const timerClass = typeof (arg2) === 'string' ? arg2 : 'count-cool';

            // Decide which index to boost next based on the `boostableProductIndexes`
            console.log('showing bpi');
            console.log(bpi);
            let indexToBoost = bpi[0];  // Default value
            for (let i = 1; i < bpi.length; i++) {
                const currIndex = bpi[i];
                const prevIndex = bpi[i - 1];

                const currBoosterButton = document.querySelector(`${productContainerSelector}:nth-of-type(${currIndex + 1}) ${boosterSelector}`);
                const prevBoosterButton = document.querySelector(`${productContainerSelector}:nth-of-type(${prevIndex + 1}) ${boosterSelector}`);

                // Index to boost is the index with the previous index is currently boosted (has countdown timer).
                if (currBoosterButton && prevBoosterButton
                    && !currBoosterButton?.classList.contains(timerClass)
                    && prevBoosterButton.classList.contains(timerClass)) {
                    indexToBoost = currIndex;
                    break;
                }

                // Current version
                const isCurrentProductHasTimer = document.querySelector(`${productContainerSelector}:nth-of-type(${currIndex + 1}) .${timerClass}`);
                const isPrevProductHasTimer = document.querySelector(`${productContainerSelector}:nth-of-type(${prevIndex + 1}) .${timerClass}`);

                if (!isCurrentProductHasTimer && isPrevProductHasTimer) {
                    indexToBoost = currIndex;
                    break;
                }
            }
            console.log(`returned index to boost: ${indexToBoost}`);
            return indexToBoost;
        }, ProductBooster.generalBoosterButtonSelector, timerClass, this.#boostableProductIndexes, ProductBooster.productContainerSelector);
        helper.log(`Product index to boost: #${this.#nextIndexToBoost}`);
    }
    /**
     * Scroll each of the booster button containers into view for a moment,
     * so it will generate a DOM hierarchy down to the booster button inside the booster button container.
     * 
     * TLDR; The purpose of this ProductBooster class is related to clicking the booser button or reading the remaining time int the `.boost-button-text`.
     * However DOM hierarchies, which the boost button included, will only be generated if the container is visible in the view for a moment.
     * Not all of the containers, `.last-cell`, contains 'rpoduct actions'. 
     * However we are going to show all the containers, since there is no hints to tell which f the containers contain 'product actions'.
*/
    private async viewAllProductActionsContainers(page: Page): Promise<void> {
        // Do the action in the browser context
        await page.evaluate(async (containerSelector: string, duration: number) => {
            const containers = document.querySelectorAll(containerSelector);

            // Loop to make all the containers visible into the the view 
            for (let i = 0; i < containers.length; i++) {
                let cell: HTMLElement = containers[i] as HTMLElement;
                cell.scrollIntoView();
                // Wait a little
                await new Promise(r => setTimeout(r, duration));
            }
        }, this.productActionsContainerSelector, ProductBooster.TINY_TIME);
    }
}

export default ProductBooster;
console.log('')
