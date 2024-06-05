import puppeteer, { Page, Browser } from 'puppeteer';
import s from './product-booster-static';
import webLogin from './web-login-v2';
import ProductBoosterV2, { ProductRow } from './product-booster-v2'
import Logger from './logger';
import * as helper from "./helper";
/**
 * This class deals with web and puppeteer.
 */
class ProductBoosterWeb {
    // static generalBoosterButtonSelector: string = '.boost-button-text';
    // Selector for `countdownTimer` elements
    static generalCountdownTimerSelector: string = '.count-cool';
    // Selector for HTML elements that contains each (one) product. This selector is actually the container of action buttons for each product.
    static productContainerSelector = '.shopee-table__fix-body.shopee-table__fix-right .shopee-table__row';

    // // CSS Selector for HTML element that holds 1 product by index (row / card).
    // private productContainerByIndex(i: number): string {
    //     return `${ProductBooster.productContainerSelector}:nth-of-type(${i + 1})`;
    // }
    // // CSS Selector for 'more dropdown menu' (the menu will appeared if 'Lainnya' button is clicked), for specific product by indexed.
    // private cssMoreDropdownMenuByIndex(i: number): string {
    //     return `${this.productContainerByIndex(i)} .more-dropdown-menu`;
    // }
    // // CSS Selector for the container of the next product to boost. 
    // private productContainerSelectorForNextIndexToBoost(): string {
    //     console.debug(`next index to boost: ${this.#nextIndexToBoost}`);
    //     return `.shopee-table__row:nth-of-type(${this.#nextIndexToBoost + 1})`;
    //     console.log(`Product row selector ++++`);
    //     console.log(`.shopee-table__row:nth-of-type(${this.#nextIndexToBoost + 1})`);

    // }
    // private moreButtonSelector = '.more-dropdown-menu';
    static productActionsContainerSelector = '.last-cell';
    // private productListContainerSelector = '.product-list-main';

    private page: Page | undefined;
    private browser: Browser | undefined;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;

    }
    async initPage(userDataPath: string): Promise<void> {
        this.logger.debug(`Will launch browser with user data: ${userDataPath}`);

        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 50, // slow down by 50ms 
            userDataDir: "./user_data",
            // userDataDir: userDataPath,
        });

        // Open a new page
        if (!browser) throw new Error("Failed launching browser.");
        this.page = await browser.newPage();
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
        await this.page.waitForSelector(ProductBoosterWeb.productContainerSelector);

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
     * However DOM hierarchies, which the boost button included, will only be generated if the container is visible in the view for a moment.
     * Not all of the containers, `.last-cell`, contains 'rpoduct actions'. 
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
        const totalProducts = await this.page.$$eval(ProductBoosterWeb.productContainerSelector, (elements: any[]) => elements.length);
        this.logger.debug(`total products: ${totalProducts}`);

        // Loop from the first product, to see if the product container element has boost button or countdown timer text.
        // Stop the loop if ProductVooster.maxBoostSlot or the total available products has been reached.
        let boostableProducts: ProductRow[] = [];
        for (let i = 0; i < totalProducts; i++) {
            // Stop if the range of products quantity to be boosted has been reached
            if (boostableProducts.length >= s.TOTAL_PRODUCTS_TO_BOOST) break;

            // Check if the current index has countdown timer element
            let ctText = await this.page.evaluate(this.getCountdownTimerTextByIndexInBrowserContext, this.productContainerByIndex(i), ProductBoosterWeb.generalCountdownTimerSelector);
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

            // Test if the current product (i) has 'boost button' by checking if it has 'Naikkan produk' text.
            let isBoosterButtonFound = await this.page.evaluate(this.isBoosterButtonExistInSpecificProduct, this.cssMoreDropdownMenuByIndex(i));
            if (isBoosterButtonFound) {
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
        // console.log(ctEl);

        return ctEl?.textContent ? ctEl.textContent : "";
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
    // CSS Selector for HTML element that holds 1 product by index (row / card).
    private productContainerByIndex(i: number): string {
        return `${ProductBoosterWeb.productContainerSelector}:nth-of-type(${i + 1})`;
    }
    // CSS Selector for 'more dropdown menu' (the menu will appeared if 'Lainnya' button is clicked), for specific product by indexed.
    private cssMoreDropdownMenuByIndex(i: number): string {
        return `${this.productContainerByIndex(i)} .more-dropdown-menu`;
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
    async clickBoostButton(index: number): Promise<void> {

    }
    public async closeBrowser(): Promise<void> {
        this.logger.info("Browser has been closed");
        await this.browser?.close();
    }
}

export default ProductBoosterWeb;