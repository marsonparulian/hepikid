import puppeteer, { Page } from 'puppeteer';
import s from './product-booster-static';
import webLogin from './web-login-v2';
import { ProductRow } from './product-booster-v2'
import Logger from './logger';
/**
 * This class deals with web and puppeteer.
 */
class ProductBoosterWeb {
    // static generalBoosterButtonSelector: string = '.boost-button-text';
    // // Selector for `countdownTimer` elements
    // static generalCountdownTimerSelector: string = '.count-cool';
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
    // private productActionsContainerSelector = '.last-cell';
    // private productListContainerSelector = '.product-list-main';




    private page: Page | undefined;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;

    }
    async initPage(userDataPath: string): Promise<void> {
        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 50, // slow down by 50ms 
            // userDataDir: "./user_data",
            userDataDir: userDataPath,
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
        this.logger.debug("-- start method `loadingProductList`");

        // Goto the product list page


        // Wait until product container elements are loaded

        // Scroll down to activate related elements. I forgot whether it's the booster button or the pop up menu.

    }
    async parseProductsData(): Promise<ProductRow[]> {
        return [];
    }
    async clickBoostButton(index: number): Promise<void> {

    }

}

export default ProductBoosterWeb;