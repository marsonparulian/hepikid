import puppeteer, { Browser } from 'puppeteer';
import ProductBooster from './product-booster';

// This is the entry point for `Hepikid` app

// Execute `ProductBooster`
puppeteer.launch({
    headless: process.env.BROWSER_HEADLESS ? true : false,
    slowMo: 50, // slow down by 50ms 
    userDataDir: "./user_data",
}).then((browser: Browser) => {
    const productBooster = new ProductBooster(browser);
    return productBooster.execute();
}).catch(e => {
    console.error(e);
});


