import puppeteer, { Page, Browser, ElementHandle } from 'puppeteer';
import s from './product-booster-static';
import webLogin from './web-login-v2';
import ProductBoosterV2, { ProductRow } from './product-booster-v2'
import Logger from './logger';
import * as helper from "./helper";
/**
 * This class deals with web and puppeteer.
 */
class ProductBoosterWeb {
    // Selector for `countdownTimer` elements
    static generalCountdownTimerSelector: string = '.count-cool';

    // Each product in the table has 1 container for the action links. Those action container HTML elements are not within HTML element of the product list (table).
    // We only gonna work with those containers, not using info of products outside of those action containers.
    // Each of the containers has '.eds-table__row' and direct descendant of '.eds-table__fix-right' element. 
    static productActionsContainerSelector = '.eds-table__fix-right .eds-table__row';

    private page: Page | undefined;
    private browser: Browser | undefined;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;

    }
    async initPage(userDataPath: string): Promise<void> {
        this.logger.debug(`Launching browser with user data: ${userDataPath}`);

        this.browser = await puppeteer.launch({
            headless: false,
            slowMo: 50, // slow down by 50ms 
            userDataDir: "./user_data",
        });

        // Open a new page
        if (!this.browser) throw new Error("Failed launching browser.");
        this.page = await this.browser.newPage();
        // Increase timeout to handle slow internet connection.
        await this.page.setDefaultNavigationTimeout(3 * s.LONG_TIME);

    }
    async loginIfNeeded(storeId: string): Promise<void> {
        if (!this.page) throw new Error('The page property is falsy. Maybe its uninitialized.');

        await webLogin(this.page, storeId);
    }
    async loadProductListPage(): Promise<void> {
        if (!this.page) throw new Error('`page` attribute is falsy, may be has not been initialized');
        this.logger.debug("-- start method `loadingProductList`");

        // Goto the product list page
        await this.page.goto('https://seller.shopee.co.id/portal/product/list/all');

        // Wait for products
        await this.page.waitForSelector(ProductBoosterWeb.productActionsContainerSelector);

        // Wait a little more to make sure all products are loaded
        await new Promise(r => setTimeout(r, s.MEDIUM_TIME));

        // Scroll down to activate related elements. I forgot whether it's the booster button or the pop up menu.
        await this.viewAllProductActionsContainers();
    }
    /**
     * Scroll each of the booster button containers into view for a moment,
     * so it will generate a DOM hierarchy down to the booster button inside the booster button container.
     * 
     * TLDR; The purpose of this ProductBooster class is related to clicking the booser button or reading the remaining time int the `.boost-button-text`.
     * However,the DOM hierarchies which the boost button included, will only be generated if the container is visible in the view for a moment.
     * Not all of the containers, contains 'rproduct actions'. 
     * However we are going to show all the containers, since there is no hints to tell which f the containers contain 'product actions'.
*/
    private async viewAllProductActionsContainers(): Promise<void> {
        if (!this.page) throw new Error('`page` property is falsy, may be has not been initialized.');

        // Do the action in the browser context
        await this.page.evaluate(async (containerSelector: string, duration: number) => {
            const containers = document.querySelectorAll(containerSelector);

            // Loop to make all the containers visible into the the view 
            for (let i = 0; i < containers.length; i++) {
                let cell: HTMLElement = containers[i] as HTMLElement;
                cell.scrollIntoView();
                // Wait a little
                await new Promise(r => setTimeout(r, duration));
            }
        }, ProductBoosterWeb.productActionsContainerSelector, s.SHORT_TIME);
        this.logger.debug("Finish loading product list page");
    }
    public async parseData() {
        this.logger.debug("start parsing product data");
        if (!this.page) throw new Error('`page` property is falsy');

        // Count the total products in theh web  page.
        const totalProducts = await this.page.$$eval(ProductBoosterWeb.productActionsContainerSelector, (elements: any[]) => elements.length);
        this.logger.debug(`total products: ${totalProducts}`);

        // Loop from the first product, to see if the product container element has boost button or countdown timer text.
        // Stop the loop if ProductVooster.maxBoostSlot or the total available products has been reached.
        let boostableProducts: ProductRow[] = [];
        for (let i = 0; i < totalProducts; i++) {
            // Stop if the range of products quantity to be boosted has been reached
            if (boostableProducts.length >= s.TOTAL_PRODUCTS_TO_BOOST) break;

            // Check if the current index has countdown timer element
            let ctText = await this.page.evaluate(this.getCountdownTimerTextByIndexInBrowserContext, this.productActionsContainerByIndex(i), ProductBoosterWeb.generalCountdownTimerSelector);
            // If countdown timer is found, this means this product is boostable. Then continue the loop.
            if (ctText) {
                boostableProducts.push({
                    index: i,
                    hasBoostButton: false,
                    countdown: this.convertCountdownTextToSeconds(ctText),
                    countdownString: ctText,
                });
                continue;
            }

            // Test if the current product (i) has booster button.
            const boosterButton = await this.getBoosterButton(i);
            if (boosterButton) {
                boostableProducts.push({
                    index: i,
                    hasBoostButton: true,
                    countdown: null,
                    countdownString: "",
                });
                continue;
            }
        }

        // Debug
        this.logger.debug("");
        this.logger.info("Boostable products:");
        boostableProducts.forEach((pr) => {
            this.logger.info(`${helper.printSeconds(pr.countdown ? pr.countdown : 0)}, ${pr.countdown} seconds, index: ${pr.index}, ${pr.hasBoostButton ? "has boost button" : "no boost button"}`);
        });
        this.logger.debug("");

        // Throw error if no boostable products are found.
        if (boostableProducts.length < 1) throw ("Error: not found boostable productts on web page");

        return boostableProducts;
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
        let ctEl = document.querySelector(selector);

        return ctEl?.textContent ? ctEl.textContent : "";
    }
    /**
     * Retrieve booster button for a specific product (by index in the web appearance order).
     * If the booster button is not available, meaning either the product is currently boosted (countdown timer is hhown) or the product is not boostable.
     * @param i - The order number the product appeared on web from top to down. 
     * @returns -Puppeteer's `ElementHandle` of the booster button. Otherwise return null if the booster button is not available.
     */
    private async getBoosterButton(i: number): Promise<ElementHandle<Element> | null> {
        if (!this.page) throw new Error("Page attribute is falsy");

        // Get all product action containers
        let containers = await this.page.$$(ProductBoosterWeb.productActionsContainerSelector);

        if (!containers[i]) throw new Error(`Container[${i}] is falsy`);

        // Find booster button within a specific  product actions container
        let button = await containers[i].$('::-p-text(Naikkan Produk)');

        return button;
    }
    // CSS Selector for HTML element that holds 1 product's actions container by index, as representation of products.
    private productActionsContainerByIndex(i: number): string {
        return `${ProductBoosterWeb.productActionsContainerSelector}:nth-of-type(${i + 1})`;
    }
    // CSS Selector for 'more dropdown menu' (the menu will appeared if 'Lainnya' button is clicked), for specific product by indexed.
    private cssMoreDropdownMenuByIndex(i: number): string {
        return `${this.productActionsContainerByIndex(i)} .eds-dropdown`;
    }
    private convertCountdownTextToSeconds(ctText: string): number {
        // Parse format `h:m:s` to an array of 3.
        const parsedTime: string[] = ctText.match(/\d{2}/g) || [];

        // If the total numbers are not 3, something is wrong. 
        if (parsedTime.length !== 3) throw new Error(`Parsed time should be 3 elements. Got: ${parsedTime}`);

        // Convert to seconds
        const seconds: number = parseInt(parsedTime ? parsedTime[0] : '0') * 60 * 60
            + parseInt(parsedTime ? parsedTime[1] : '0') * 60
            + parseInt(parsedTime ? parsedTime[2] : '0');

        return seconds;
    }
    public async clickBoostButton(index: number): Promise<void> {
        if (!this.page) throw new Error("'page' is falsy.");
        this.logger.debug(`About to click boost button index ${index}. Selector: ${this.cssMoreDropdownMenuByIndex(index)}`)

        const boosterButton = await this.getBoosterButton(index);
        if (!boosterButton) throw new Error(`Booster button index ${index} is not found`);

        return await boosterButton.click();
    }
    public async closeBrowser(): Promise<void> {
        await this.browser?.close();
        this.logger.info("Browser has been closed");
    }
}

export default ProductBoosterWeb;