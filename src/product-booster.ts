import { Browser, Page } from "puppeteer";
import 'dotenv/config';
import login from "./web-login";
import { exit } from "process";

// This file contain `ProductBooster`, a sub application to boost product by web automation

class ProductBooster {
    #browser: Browser;
    // Next product index to boost from list on web page
    #nextIndexToBoost: number = 0;
    // Total products to boost
    static totalProductsToBoost: number = 7;
    // Maximum number of concurrently boosted products .
    static MaxBoostedConcurrently: number = 5;
    // How long the boostedproduct will last until can be boosted again (in seconds)
    static boostedDuration = 4 * 60 * 60; // 4 hours
    // Boost interval, elapsed boost time between products, in seconds
    static boostInterval: number = Math.ceil(ProductBooster.boostedDuration / ProductBooster.MaxBoostedConcurrently);
    constructor(browser: Browser) {
        this.#browser = browser;
        // this.#boostInterval = Math.ceil(this.#boostedDuration / ProductBooster.MaxBoostedConcurrently);
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

        console.log('\n');

        // Start the first `boostAProduct`
        this.boostAProduct(page);
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
            await page.goto('https://seller.shopee.co.id/portal/crm/overview');
            await page.waitForTimeout(200);

            // Go to the product page 
            await page.goto('https://seller.shopee.co.id/portal/product/list/all');
            await page.waitForSelector('.product-list-wrap');
            log('Product page is loaded');

            // Create the CSS selector for the product. Will serve as context.
            const productSelector = `.product-list-card:nth-of-type(${this.#nextIndexToBoost + 1})`

            // Parse the product name
            const productName = await page.$eval(`${productSelector} a.product-name-wrap`, el => el.textContent);
            log(`Checking product #${this.#nextIndexToBoost + 1}: ${productName} `)

            // Click `Lainnya` link (will triggerdropdown))
            const dropdownClickableSelector = `${productSelector}  .product-action .shopee-dropdown button`;
            log(`'lainnya' button selector: ${dropdownClickableSelector} `);
            await page.click(dropdownClickableSelector);

            // Define & wait for `boosButtonSelector`
            const generalBoostButtonSelector = '.boost-button-text';
            const boostButtonSelector = `${productSelector}  ${generalBoostButtonSelector}`;
            log(`boostButtonSelector: ${boostButtonSelector} `);
            await page.waitForSelector(boostButtonSelector);
            await page.waitForTimeout(500);  // Wait until dropdown animation completely finished.
            console.log("boostButton is loaded / visible");

            // Timeout for the next boost
            let nextBoostTimeout = ProductBooster.boostInterval;

            // Check is this product is still 'boosted'. Note : If a product is still in 'boosted' perode, it will show the timer, with specific HTML class, in the drop down.
            const isProductStillBoosted = await page.$(`${productSelector}  .count-cool`) === null ? false : true;
            // If this product is still boosted, Immediately check the next product until the end of product (`#totalProductToBoost).
            // If the number of boosted products has reached the limit (`ProductBooster.MaxBoostedConcurrently``), retry to boost the same product in 5 minutes.

            // IMPORTANT! It is assumed that `ProductBooster.totalProductsToBoost` > `ProductBooster.MaxBoostedConcurrently`
            if (isProductStillBoosted) {
                console.log('This product is still boosted. Immediately check the next product');
                this.#toNextProductIndex();
                nextBoostTimeout = 1; // Immediately.
            } else {
                // If there are no  `boostButton` found in whole page, that means `ProductBooster.MaxBoostedConcurrently` has been reached.
                // Then wait for 5 minutes before try to boost again for the same product (do not increment the product index)
                const numberOfBoostButtonsOnThePage = await page.$$eval(`${generalBoostButtonSelector}`, elements => elements.length);

                if (numberOfBoostButtonsOnThePage == 0) {
                    nextBoostTimeout = 5 * 60;
                    log('Reached the `ProductBooster.MaxBoostedConcurrently`. Wait for 5 minutes before retry.');
                } else {
                    // Click the `Naikkan produk` link
                    await page.click(boostButtonSelector);
                    this.#toNextProductIndex();
                    log('"naikkan produk" button is clicked');
                }

            }

            // Click again to close the drop down
            await page.click(dropdownClickableSelector);
            // Wait so the dropdown's fade out animation completely finished
            await page.waitForTimeout(600);

            // Schedule next `boostAProduct`
            setTimeout(() => {
                this.boostAProduct(page);
            }, nextBoostTimeout * 1000);
            console.log('\n');

        } catch (e) {
            console.error(e);
        }
    }
    #toNextProductIndex() {
        this.#nextIndexToBoost = (this.#nextIndexToBoost + 1) % ProductBooster.totalProductsToBoost;
    }
}

function log(msg: string) {
    console.log(`[Boost] ${msg} `);
}

export default ProductBooster;
