import fs from 'fs';
import puppeteer, { Page } from 'puppeteer';

import s from './product-booster-static';
import * as helper from './helper';
import Logger from './logger';
import webLogin from './web-login-v2';
import ProductBoosterWeb from './product-booster-web';
import { exit } from 'process';

export type ProductRow = {
    index: number, // The appeareance order index on the web page, top to down, starting from 0.
    countdown: null | number, // Number of seconds the product can be be boostable again. The value based on the countdown timer on each product. 'null' means the product does not have countdown timer.
    countdownString: string,
    hasBoostButton: boolean,
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
        this.userDataPath = `./user_data/${this.storeId}`;
        this.logger = logger;
        this.web = new ProductBoosterWeb(logger);
    }

    public static getStarter(storeId: string, logLevel: number = 5) {

        return async () => {
            let logger = new Logger(logLevel);
            let app = new ProductBoosterV2(storeId, logger);

            try {
                await app.run();
            } catch (e: any) {
                console.error('Something is wrong..');
                console.error(e);

                console.log("Now exiting application..");
                exit();
            }
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

        // Make sure folder for cookies is exist
        await this.createUserDataFolderIfNeeded();

        // Launch browser and open web page
        await this.web.initPage(this.userDataPath);

        // Login if required.
        await this.web.loginIfNeeded(this.storeId);

        // Go to product list page, and wait untill all scripts are loaded
        await this.web.loadProductListPage();

        // Parse and index the required data from product list
        let boostableProducts: ProductRow[] = await this.web.parseData();

        // How many more seconds to 'boost' button ? Negative values represents the past, 0 value means 'now'. 
        let whenShouldBoost: number = this.whenShouldBoost(boostableProducts);

        // Click the boost button, if `whenShouldBoost` <= 0
        if (whenShouldBoost <= 0) {
            // Which boost button to be clicked ?
            const nextIndexToBoost: number = this.findNextIndexToBoost(boostableProducts);

            const isBoostingSuccess = await this.clickBoostButton(nextIndexToBoost);

            // If boosting fail, retry again later
            if (!isBoostingSuccess) whenShouldBoost = s.retryy_timeout;
            // If success, the next boosting will fullfill the boosting interval
            else whenShouldBoost = s.BOOST_INTERVAL;
        }

        // Schedule for the next run
        setTimeout(ProductBoosterV2.getStarter(this.storeId, this.logger.getLevel()), whenShouldBoost * 1000);
        this.logger.info(`Next boost has been scheduled in ${helper.printSeconds(whenShouldBoost)}: ${helper.printHourAndMinuteFromNow(whenShouldBoost)}`);
        // Close browser
        await this.web.closeBrowser();
    }
    private async createUserDataFolderIfNeeded(): Promise<void> {
        let userDataPath = this.userDataPath;
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

    private whenShouldBoost(boostableProducts: ProductRow[]): number {
        // Initial value is 0 (second to boost).
        let secondsToBoost = 0;

        // Get the greatest countdown seconds, meaning it  is the last product being boosted.
        // It should have value of 0 if there is no active countdown timer.
        let greatestCt = boostableProducts.reduce((acc, pr) => {
            if (!pr.countdown || pr.countdown < acc) return acc;
            return pr.countdown;
        }, 0);

        // If there is any active countdown timer, count when should click the next boost button
        if (greatestCt > 0) {
            secondsToBoost = s.BOOST_INTERVAL - (s.BOOSTED_DURATION - greatestCt);
        }

        this.logger.info(`Next boost should be in ${helper.printSeconds(secondsToBoost)}`);
        return secondsToBoost;
    }
    private findNextIndexToBoost(boostableProducts: ProductRow[]): number {
        // Default is the first product 
        let indexToBoost: number = 0;

        // Iterate to find the next product index to boost
        for (let i = 1; i < boostableProducts.length; i++) {
            // Product to boost is the first product that is not being boosted and the previous product is currently boosted.
            if (!boostableProducts[i].countdown && boostableProducts[i - 1].countdown) {
                indexToBoost = boostableProducts[i].index;
                break;
            }
        }

        this.logger.info(`Next index to boost: ${indexToBoost}`);
        return indexToBoost;
    }

    private async clickBoostButton(indexToBoost: number): Promise<boolean> {
        this.logger.debug("start to click the boost button in ProductBoosterV2");
        await this.web.clickBoostButton(indexToBoost);

        this.logger.info(`Boost button #${indexToBoost} has been told to be clicked`);

        // NOTE always assumed the boosterButton has been clicked
        return true;
    }
    // private timeoutForNextBoost111(): number {
    //     return 110; // seconds;
    // }
    private async goToProductListPageAndWait(page: Page): Promise<void> {


    }
}





export default ProductBoosterV2;