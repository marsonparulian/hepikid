import puppeteer, { Browser } from 'puppeteer';
import ProductBooster from './product-booster';

// This is the entry point for `Hepikid` app

// Execute `ProductBooster`
puppeteer.launch({
    headless: false,
    slowMo: 50, // slow down by 50ms 
    userDataDir: "./user_data"
}).then((browser: Browser) => {
    const productBooster = new ProductBooster(browser);
    productBooster.execute();
}).catch(e => {
    console.error(e);
});


