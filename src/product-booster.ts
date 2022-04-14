import { Browser, Page } from "puppeteer";
import 'dotenv/config';
import login from "./web-login";

// This file contain `ProductBooster`, a sub application to boost product by web automation

class ProductBooster {
    #browser: Browser;
    constructor(browser: Browser) {
        this.#browser = browser;
    }
    /**
 * main function to 'execute' product booster functionality.
 * 
 * @return {Promise<void>}
 */
    async execute() {
        // Collect env variables & user's configuration.

        // Open new page & login
        const page = await this.#browser.newPage();
        await login(page);
        log('New page is opned and logged in');

        // Go to the product page 
        await page.goto('https://seller.shopee.co.id/portal/product/list/all', {
            waitUntil: 'networkidle2',
        });
        log('Product page is loaded');

        // Crawl product page to collect each product's query selector & product name.

        // Count the interval, in minutes, to `boost` a product, based on the number of products & `BOOSTED_PERIODE`

        // Start the first `boostAProduct`
    }
    /**
 * Boost a product. Will schedule the next `boostAProduct`.
 * 
 */
    boostAProduct() {

    }
}

function log(msg: string) {
    console.log(`[ProductBooster] msg `);
}

export default ProductBooster;
