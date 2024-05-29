/**
 * This object is to contain constants and CSS selectors related to `ProductBooster` to make `ProductBooster` more compcat.
 */
class ProductBoosterStatics {
    // Constants below represent time in seconds.
    static SHORT_TIME = 2e3;
    static MEDIUM_TIME = 6e3;
    static LONG_TIME = 12e3;







    // // Selector for `boosterButton` elements.
    // static generalBoosterButtonSelector: string = '.boost-button-text';
    // // Selector for `countdownTimer` elements
    // static generalCountdownTimerSelector: string = '.count-cool';
    // // Selector for HTML elements that contains each product
    // static productContainerSelector = '.shopee-table__fix-body.shopee-table__fix-right .shopee-table__row';

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
}

export default ProductBoosterStatics;
