import puppeteer, { Page } from "puppeteer";
import "dotenv/config";

console.log(`process.env.USER_ID : ${process.env.USER_ID}`);

const openProductPage = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 250, // slow down by 250ms 
    });
    console.log("Browser is launched..");
    const page = await browser.newPage();
    console.log("A page is opned..");
    await page.goto("https://seller.shopee.co.id", {
        waitUntil: 'networkidle2',
    });
    await page.screenshot({ path: "logs/screenshots/products-page-01.png" });

    if (await isLoginFormExist(page)) {
        console.log("Login form is detected");
        // Login
        await fillAndSubmitLoginForm(page);
    } else {
        console.log("Login form is not detected")
    }

}


openProductPage();

console.log("End of hepikid");

const isLoginFormExist = async (page: Page): Promise<boolean> => {
    const loginFormsCount = await page.$$eval("form#shop-login", elements => elements.length);
    console.log(`loginFOrmCounts ${loginFormsCount}`);

    return loginFormsCount > 0;
}
const fillAndSubmitLoginForm = async (page: Page) => {

}
