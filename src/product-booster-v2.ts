import s from './product-booster-static';
import * as helper from './helper';

type ProductRow = {
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
    /**
     * This function is called every time this app is started,
     * meant to prepare values and set up the environment.
     */
    start() {

    }
    /**
     * Basically this function will answer 2 questions :
     * 1. When should this app click a 'boost' button ? Now or how many more seconds ? The answer will be based on the time interval.
     * 2. If 'Yes', which boost button need to be clicked ?
     * And then this function will schedule time to execute this function again, in relation to the answer of question 1.
     */
    private async run() {
        // Launch browser and open web page

        // Login if required.

        // Wait until page is completely loaded

        // Parse and index the required data from product list
        let boostableProducts: ProductRow[] = await this.parseData();;

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

        setTimeout(this.run, timeoutForNextBoost);
        helper.log(`Next boost will be in ${helper.printSeconds(timeoutForNextBoost)}: ${helper.printHourAndMinuteFromNow(timeoutForNextBoost)}`);
        // Close browser
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
        return 52;
    }
}



export default ProductBoosterV2;