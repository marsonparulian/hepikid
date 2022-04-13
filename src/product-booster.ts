import { Browser, Page } from "puppeteer";
import 'dotenv/config';

// This file contain `ProductBooster`, a sub application to boost product by web automation

class ProductBooster {
    constructor(browser: Browser) {

    }
    /**
 * main function to 'execute' product booster functionality.
 * 
 * @return {Promise<void>}
 */
    execute() {
        // Collect env variables & user's configuration.

        // Go to the product page 

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


export default ProductBooster;
