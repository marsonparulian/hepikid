import { Page } from "puppeteer"
import 'dotenv/config';

// This file contains helpers to automate puppeteer's page login to Shoppee seller center

/**
 *  Will do login process on web page, if shopee's login form is detected.
  */
const login = async (page: Page) => {
    // TODO Login if needed
    await page.goto("https://seller.shopee.co.id", {
        waitUntil: 'networkidle2',
    });

    if (await isLoginFormExist(page)) {
        console.log("Login form is detected. Will attempt to log in..");

        // Login
        await fillAndSubmitLoginForm(page);
    } else {
        console.log('No login form s detected. Browser is already logged in');
    }

}
const isLoginFormExist = async (page: Page): Promise<boolean> => {
    const loginFormsCount = await page.$$eval("form#shop-login", elements => elements.length);

    return loginFormsCount > 0;
}
const fillAndSubmitLoginForm = async (page: Page) => {
    const userId = process.env.USER_ID || "";
    const userPassword = process.env.USER_PASSWORD || "";

    console.log(`user id & password : ${userId} - ${userPassword}`);

    // Fill the form
    await page.type('input[type="text"]', userId);
    await page.type('input[type="password"]', userPassword);

    // Submit
    await page.click('form button');
    await page.waitForNavigation();
    await page.screenshot({ path: 'logs/screenshots/30.png' });
    console.log(`URL #30.png : ${await page.url()}`);

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

    // we need to wait until user receive & click verify link on whatsapp.
    // After verified by the user, the page will be directed to shopee seller's landing page.
    // TODO Increase timeout to 70 seconds, and wait for selector of one of the elements on landing page.
    await page.setDefaultNavigationTimeout(70e3);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.setDefaultNavigationTimeout(30e3);

    await screenshot(page, '45.png');
    console.log(`URL #45.png : ${await page.url()}`);

}


function screenshot(page: Page, fName: string) {

}

export default login;
