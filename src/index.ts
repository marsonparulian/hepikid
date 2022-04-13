import puppeteer, { Page } from "puppeteer";
import "dotenv/config";
import { Console } from "console";

console.log(`process.env.USER_ID : ${process.env.USER_ID}`);

const openProductPage = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50, // slow down by 50ms 
        userDataDir: "./user_data"
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
    const userId = process.env.USER_ID || "";
    const userPassword = process.env.USER_PASSWORD || "";

    console.log(`user id & password : ${userId} - ${userPassword}`);

    // Fill the form
    await page.type('input[type="text"]', userId);
    await page.type('input[type="password"]', userPassword);


    page.screenshot({ path: 'logs/screenshots/10.png' });


    // Submit
    await page.click('form button');
    await page.screenshot({ path: 'logs/screenshots/20.png' });


    await page.waitForNavigation();
    await page.screenshot({ path: 'logs/screenshots/30.png' });
    console.log(`URL #30.png : ${await page.url()}`);
    // Button for verification
    /*
    <button class="WMREvW"><div class="_2a60oL"><svg width="25" height="24" fill="none"><path d="M10.77 12.527l2.413 2.37a2 2 0 002.803 0l5.561-5.463a2 2 0 000-2.853l-3.26-3.204a2 2 0 00-2.804 0l-1.772 1.74" stroke="#000" stroke-opacity=".54" stroke-width="1.5"></path><path d="M15.23 11.473l-2.413-2.37a2 2 0 00-2.803 0l-5.562 5.463a2 2 0 000 2.853l3.261 3.204a2 2 0 002.804 0l1.772-1.74" stroke="#000" stroke-opacity=".54" stroke-width="1.5"></path></svg></div><div class="_1e6qWr">Verifikasi melalui link</div></button>
    */

    // Click `send verification` button
    const sendVerificationButtonSelector = '.WMREvW';
    await page.waitForSelector(sendVerificationButtonSelector);
    await page.click(sendVerificationButtonSelector);

    await screenshot(page, '40.png');
    console.log(`URL @40.png : ${await page.url()}`);

    // Wait for some time and click `OK` button
    await page.waitForTimeout(1000);

    await screenshot(page, '43.png');
    console.log(`URL @43.png : ${await page.url()}`);

    const [button] = await page.$x("//button[contains(., 'OK')]");
    if (button) {
        console.log("OK button is found !");
        await button.click();

    } else {
        console.log("OK Button is not found");
    }

    // await page.waitForNavigation({ waitUntil: 'networkidle2' });

    await screenshot(page, '45.png');
    console.log(`URL #45.png : ${await page.url()}`);
}

function screenshot(page: Page, fName: string): Promise<any> {
    return page.screenshot({ path: `logs/screenshots/${fName}` });
}
