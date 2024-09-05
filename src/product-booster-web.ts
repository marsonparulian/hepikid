import puppeteer, { Page, Browser, ElementHandle } from 'puppeteer';
import s from './product-booster-static';
import webLogin from './web-login-v2';
import ProductBoosterV2, { ProductRow } from './product-booster-v2'
import Logger from './logger';
import * as helper from "./helper";

/**
 * This type hold `Element` from web that we need to interact with for each product.
 * This type is created becaused in puppeteer we can not do `page.$` and `page.$$` to get same element twice. Somehow the elements in `page` will be reduced after we do `page.$` or `page.$$`.t seems will return different el 
 */
type ProductElements = {
    container: ElementHandle<Element>,
    moreButton: ElementHandle<Element>,  // Button to show pop up containing `boosterButton`
    boosterButton: ElementHandle<Element> | null,    // If exists, meaning the product is boostable
}

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

    // Hold sets of elements for each product. The elements will only acquired once from the `page` due to the fact `page.$` or `page.$$` will have different result on the next iteration.
    private productElements: ProductElements[] = [];

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

        //IMPORTANT: Do all `page.evaluate`, `page.$eval`, and `page.$$eval` first, then later do the 'get' oprations such as `page.$` and `page.$$`.
        // It seems the  content of `page` will change after 'get' operation has been done.'
        // To prove this, measure the length of the result of `page.$$('some-selector')`.

        // Count the total products in theh web  page.
        const totalProducts = await this.page.$$eval(ProductBoosterWeb.productActionsContainerSelector, (elements: any[]) => elements.length);
        this.logger.debug(`total products: ${totalProducts}`);

        // Loop from the first product, to see if the product container element has countdown timer text.
        let products: ProductRow[] = [];
        for (let i = 0; i < totalProducts; i++) {

            // Check if the current index has countdown timer element
            let ctText = await this.page.evaluate(this.getCountdownTimerTextByIndexInBrowserContext, this.productActionsContainerByIndex(i), ProductBoosterWeb.generalCountdownTimerSelector);

            // Init all products, despite we don't know yet it is boostable or not, and attach the countdownTimer text. Later remove the not boostableProduct (product that doesn't have countdownTimer or boosterButton) and only keep product as much we want too boost 
            products.push({
                index: i,
                hasBoostButton: false,
                countdown: this.convertCountdownTextToSeconds(ctText),
                countdownString: ctText,
            });
        }

        // Now get all the productElements, start with the containers then loop
        const productContainers = await this.page.$$(ProductBoosterWeb.productActionsContainerSelector);
        this.logger.debug(`Total productContainers found: ${productContainers.length}`);
        for (let i = 0; i < productContainers.length; i++) {

            // Button to toggle pop up menu containing boosterButton
            let moreButton = await productContainers[i].$('::-p-text(Lainnya)');
            if (!moreButton) throw new Error(`moreButton can't be found for index ${i}`);

            // The booster button
            let boosterButton = await productContainers[i].$('::-p-text(Naikkan Produk)');

            // Attach the elements
            this.productElements.push({
                container: productContainers[i],
                moreButton,
                boosterButton,
            });
        }

        // Edit `boostableProducts` based on the existence of boosterButton
        for (let i = 0; i < products.length; i++) {
            if (this.productElements[i].boosterButton) {
                products[i].hasBoostButton = true;
            }
        }

        // IMPORTANT: Remove the products that are not boostable or over the number of products to be boosted
        let boostableProducts = products.filter((v, i, arr) => {
            return (v.hasBoostButton || v.countdownString);
        }).slice(0, s.TOTAL_PRODUCTS_TO_BOOST);
        console.log(`Total boostable products ${boostableProducts.length}`);

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
    // CSS Selector for HTML element that holds 1 product's actions container by index, as representation of products.
    private productActionsContainerByIndex(i: number): string {
        return `${ProductBoosterWeb.productActionsContainerSelector}:nth-of-type(${i + 1})`;
    }
    // CSS Selector for 'more dropdown menu' (the menu will appeared if 'Lainnya' button is clicked), for specific product by indexed.
    private cssMoreDropdownMenuByIndex(i: number): string {
        return `${this.productActionsContainerByIndex(i)} .eds-dropdown`;
    }
    private convertCountdownTextToSeconds(ctText: string): number | null {
        // Parse format `h:m:s` to an array of 3.
        const parsedTime: string[] = ctText.match(/\d{2}/g) || [];

        // If the total numbers are not 3, something is wrong. 
        if (parsedTime.length !== 3) return null

        // Convert to seconds
        const seconds: number = parseInt(parsedTime ? parsedTime[0] : '0') * 60 * 60
            + parseInt(parsedTime ? parsedTime[1] : '0') * 60
            + parseInt(parsedTime ? parsedTime[2] : '0');

        return seconds;
    }
    public async clickBoostButton(index: number): Promise<void> {
        if (!this.page) throw new Error("'page' is falsy.");
        this.logger.debug(`About to click boost button index ${index}. Selector: ${this.cssMoreDropdownMenuByIndex(index)}`)

        // Scroll to moreButton, click, and wait a little for animation to complete
        const { moreButton, boosterButton } = this.productElements[index];
        await moreButton.scrollIntoView();
        await moreButton.click();
        await new Promise(r => setTimeout(r, s.MEDIUM_TIME))

        // Scrool to boosterButton, then click
        await boosterButton?.scrollIntoView();
        await boosterButton?.click();
        await new Promise(r => setTimeout(r, s.SHORT_TIME));
    }
    public async closeBrowser(): Promise<void> {
        await this.browser?.close();
        this.logger.info("Browser has been closed");
    }
}

export default ProductBoosterWeb;