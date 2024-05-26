import ProductBoosterV2 from './product-booster-v2';
import Logger from './logger';

// This is the entry point for `Hepikid` app

// If no `storeId` supplied, that means run this app for all stores.
const storeIds: string[] = ["hepikid"];
// const storeIds: string[] = ["hepikid", "store2", "store3"];

// Execute `ProductBooster` for every stores. with time interval.
const execInterval = 0.3 * 60e3; //  Change to 5 minutes.
let execStart: number = 0; // Start now

// Set log level
const logLevel = Logger.INFO;

storeIds.forEach(storeId => {

    setTimeout(ProductBoosterV2.getStarter(storeId, logLevel), execStart);
    execStart += execInterval;
});



