import puppeteer, { ElementHandle, Page } from "puppeteer"
import 'dotenv/config';

// This file contains helpers to automate puppeteer's page login to Shoppee seller center
// This is version 2.0: handles `storeId` as parameter


/**
 *  Will do login process on web page, if shopee's login form is detected.
 * @version 2.0
  */
const login = async (page: Page, storeId: string) => {
    const userId = process.env[`${storeId}_USER_ID`] || "";
    const userPass = process.env[`${storeId}_USER_PASS`] || "";

    // TODO Login if needed
    await page.goto("https://seller.shopee.co.id", {
        // We only need to wait for the DOM to be loaded (`domcontentloaded`) than some network activity until completed (`networkidle2`).
        // waitUntil: 'domcontentloaded',
        waitUntil: 'networkidle2',
    });

    // We need to wait more, because if not logged in the page will be redirected  after 'networkidle2' above. The long wait time due to the possible long response from shopee.co.id.
    await page.waitForTimeout(7000);

    if (await isLoginFormExist(page)) {
        console.log("Login form is detected. Will attempt to log in..");

        // Login
        await fillAndSubmitLoginForm(page, userId, userPass);
    } else {
        console.log('No login form s detected. Browser is already logged in');
    }

}
const isLoginFormExist = async (page: Page): Promise<boolean> => {
    await page.screenshot({ path: 'logs/check-login-form.png' });
    console.log("Start to check login form");

    // Note: There is a change in the login form HTML. Now we are going to identify the existence of a login form by whether password input is exist or not.
    // const loginFormsCount = await page.$$eval("form#shop-login", elements => elements.length);
    const loginFormsCount = await page.$$eval("[type='password']", elements => elements.length);

    return loginFormsCount > 0;
}
const fillAndSubmitLoginForm = async (page: Page, userId: string, userPassword: string) => {
    // const userId = process.env.USER_ID || "";
    // const userPassword = process.env.USER_PASSWORD || "";

    console.log(`user id & password : ${userId} - ${userPassword}`);

    // Fill the form
    await page.type('input[type="text"]', userId);
    await page.type('input[type="password"]', userPassword);

    // Submit
    // await new Promise(r => setTimeout(r, 234e3));
    // await page.click('form button.wyhvVD');
    // await page.click("form button.DYKctS");
    await page.click("form button.vvOL40");
    await page.waitForNavigation();
    // await page.screenshot({ path: 'logs/screenshots/30.png' });
    console.log(`URL #30.png : ${await page.url()}`);

    // Click `send verification` button
    // Note : this `send verification` button does not always appear (Rarely need to verify)
    // So instead of waiting for the selector, just wait for 8 seconds before trying to click the button.
    await new Promise(r => setTimeout(r, 8e3));
    const sendVerificationButtonSelector = '.WMREvW';
    const sendVerificationButton = await page.$(sendVerificationButtonSelector);
    if (sendVerificationButton) {
        console.log('Send verification button is found');
        sendVerificationButton.click();

        // Now continue to the next process

        await screenshot(page, '40.png');
        console.log(`URL @40.png : ${await page.url()}`);

        // Wait for some time and click `OK` button
        await page.waitForTimeout(1000);

        await screenshot(page, '43.png');
        console.log(`URL @43.png : ${await page.url()}`);

        const [button] = await page.$x("//button[contains(., 'OK')]");
        if (button) {
            console.log("OK button is found !");
            await (button as ElementHandle<Element>).click();

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
    } else {
        console.log('The send verification button is not found');
    }

    // Wait until page is completely loaded (chance it may take some time if there is a login process)
    await new Promise(r => setTimeout(r, 7e3));
}

function screenshot(page: Page, fName: string) {

}

export default login;
