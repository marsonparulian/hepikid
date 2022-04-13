import puppeteer, { Browser } from 'puppeteer';
import ProductBooster from './product-booster';

// This is the entry point for `Hepikid` app

// Execute `ProductBooster`
puppeteer.launch({
    slowMo: 50, // 50 miliseconds
}).then((browser: Browser) => {
    const productBooster = new ProductBooster(browser);
    productBooster.execute();
}).catch(e => {
    console.error(e);
});


