import fs from 'fs';
import puppeteer, { Page } from 'puppeteer';

import s from './product-booster-static';
import * as helper from './helper';
import Logger from './logger';
import webLogin from './web-login-v2';
import ProductBoosterWeb from './product-booster-web';

export type ProductRow = {
    index: number, // The appeareance order index on the web page, top to down, starting from 0.
    countdown: null | number, // Number of seconds the product can be be boostable again. The value based on the countdown timer on each product. 'null' means the product does not have countdown timer.
}
/**
 * The objective of this class is to click 'boost' button' of a certain product in shopee product list every an interval of time.
 * 
 * Some important notes:
 * - Some products may not be boostable: products that don't have boost button or countdown timer.
 * - All time data and calculation will be done in unit  time of second .
 */
class ProductBoosterV2 {
    private storeId: string = '';
    private logger: Logger;
    private web: ProductBoosterWeb;
    // User data directory for cookies used by the browser. Will be generated one time at the `1`start`
    private userDataPath: string = '';
    constructor(storeId: string, logger: Logger) {
        this.storeId = storeId;
        this.logger = logger;
        this.web = new ProductBoosterWeb(logger);
    }

    public static getStarter(storeId: string, logLevel: number = 5) {

        return () => {
            let logger = new Logger(logLevel);
            let app = new ProductBoosterV2(storeId, logger);

            app.run();
        }
    }
    /**
     * Basically this function will answer 2 questions :
     * 1. When should this app click a 'boost' button ? Now or how many more seconds ? The answer will be based on the time interval.
     * 2. If 'Yes', which boost button need to be clicked ?
     * And then this function will schedule time to execute this function again, in relation to the answer of question 1.
     */
    public async run() {
        this.logger.info(`>>> Start boosting process for store : ${this.storeId}`);

        await this.createUserDataFolderIfNeeded();

        // Launch browser and open web page
        await this.web.initPage(this.userDataPath);

        // Login if required.
        await this.web.loginIfNeeded(this.storeId);

        // Go to product list page, and wait untill all scripts are loaded
        await this.web.loadProductListPage();

        // await this.goToProductListPageAndWait(page);
        // Prepare the page so the page is ready 

        // Parse and index the required data from product list
        let boostableProducts: ProductRow[] = await this.parseData();

        // How many more seconds to 'boost' button ? Negative values represents the past, 0 value means 'now'. 
        let whenShouldBoost: number = this.whenShouldBoost();

        // Click the boost button, if `whenShouldBoost` <= 0
        if (whenShouldBoost <= 0) {
            // Which boost button to be clicked ?
            const nextIndexToBoost: number = this.nextIndexToBoost();

            await this.clickBoostButton(nextIndexToBoost);
        }



        // Schedule for the next run
        const timeoutForNextBoost: number = this.timeoutForNextBoost();

        // setTimeout(this.run, timeoutForNextBoost);
        setTimeout(ProductBoosterV2.getStarter(this.storeId, this.logger.getLevel()), timeoutForNextBoost * 1000);
        helper.log(`Next boost will be in ${helper.printSeconds(timeoutForNextBoost)}: ${helper.printHourAndMinuteFromNow(timeoutForNextBoost)}`);
        // Close browser
    }
    private getUserDataPath(): string {
        return `./user_data/${this.storeId}`;
    }
    private async createUserDataFolderIfNeeded(): Promise<void> {
        let userDataPath = this.getUserDataPath();
        let isExists = fs.existsSync(userDataPath);
        if (!isExists) {
            this.logger.debug(`Can not find uer data directory : ${userDataPath}`);
            this.logger.debug(`Trying to create user dadta folder..`);

            // Create the folder
            fs.mkdirSync(userDataPath, 0o744)
            this.logger.debug(`User data folder has been created: ${userDataPath}`);

        } else {
            this.logger.debug(`User data folder already existed : ${userDataPath}`);
        }
        // Insert empty line to make the log easy to red.
        this.logger.debug("");
    }
    private async parseData() {

        return [];
    }
    private whenShouldBoost(): number {
        return 432;
    }
    private nextIndexToBoost(): number {
        return 42;
    }
    private clickBoostButton(indexToBoost: number): Promise<void> {
        // return new Promise(r => r("done"));
        return Promise.resolve();
    }
    private timeoutForNextBoost(): number {
        return 110; // seconds;
    }
    private async goToProductListPageAndWait(page: Page): Promise<void> {


    }
}



export default ProductBoosterV2;