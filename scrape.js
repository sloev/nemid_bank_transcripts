const { exit } = require('process')
const puppeteer = require('puppeteer-extra')
const LRU = require("lru-cache")
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const NETBANK_URL = process.env.NETBANK_URL
const USERNAME = process.env.NEM_USERNAME
const PASSWORD = process.env.NEM_PASSWORD

if (!USERNAME || !PASSWORD || !NETBANK_URL){
  console.error("needs all of NEM_USERNAME, NEM_PASSWORD, NETBANK_URL env vars given!!! exiting!")
  exit()
}

let seenIds = new LRU({max:100})

// puppeteer usage as normal
puppeteer.launch({ headless: true, args:['--no-sandbox'] }).then(async browser => {
    const page = await browser.newPage()
    await page.on('console', msg => {
      for (let i = 0; i < msg._args.length; ++i)
          console.error(`✨ [browser says] ${msg._args[i]}`);
      });    
    await page.on('response', async response => {
      if(response.request().method() !== 'GET') return
      if (response.url().includes('/posting-entries')) {
          console.error('🚀 - got transaction json from', response.url())
          const data = await response.json()
          data?._embedded?.postingEntries?.map(item=>{
            id = item.postingEntryId
            if (!seenIds.get(id)){
              seenIds.set(id, true)

              console.log(JSON.stringify(
                {
                  amount: item.amount.amount,
                  balance: item.bookBalance.amount,
                  description: item.description,
                  timestamp: item.postingTimestamp,
                  id
                }
              ))
            }
          })
      }
  })

  async function autoScroll(page){
    await page.evaluate(async () => {
      var totalHeight = 0;
      var distance = 200;
      let scrollTries = 20
  
      try {
        while (scrollTries>0){
          console.error(`scrolling. reached height: ${totalHeight}, scrollTries left: ${scrollTries}`)
          window.scrollBy(0, distance);
          totalHeight += distance;
  
          scrollTries -= 1
          const snooze = new Promise(resolve => setTimeout(resolve, 1000));
          await snooze
        }
      }
      catch(e) {
        console.error(e)
      }
    });
    let rescrollResult = true
    if (page.url().includes(`${NETBANK_URL}/privat/login`)) {
      console.error("got logged out")
      rescrollResult = false;
    }
    console.error("✨ - exiting scroll", rescrollResult? "retrying scroll": "have to log in again!")
    return rescrollResult
  
  }
  async function performLogin(page) { 
    console.error("[ 🍔 performing login ]")
    
    console.error("🐌 - loading login page")
    await page.goto(`${NETBANK_URL}/privat/login`)
    await page.waitForTimeout(5000)

    console.error("✍️ - entering username")
    await page.keyboard.type(USERNAME);
    await page.keyboard.press( `Tab`);
    await page.waitForTimeout(1000)
    
    console.error("✍️ - entering password")
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press( `Tab`);
    await page.waitForTimeout(1000)

    console.error("🐁 - clicking login button")
    await page.keyboard.press( `Enter`);
    await page.waitForTimeout(1000)
    
    console.error("🛂 - pressing send nemid request")
    await page.keyboard.press( `Enter`);

    let retryPeriod = 0  
    const sleepPeriod = 2000  
    let gotResult = false
    while (!gotResult && retryPeriod < 60000) {
        retryPeriod += sleepPeriod;
        if (page.url().includes(`${NETBANK_URL}/privat/frontpage`)) {
          gotResult = true;
        }
        console.error(`🐌 - waiting ${sleepPeriod}ms more on nemid confirm (waited ${retryPeriod}ms already)`)
        await page.waitForTimeout(sleepPeriod);

    }
    await page.screenshot({ path: 'login.png', fullPage: true })
    console.error("✨ - login ", gotResult ? "success": "fail")

    return gotResult
  }

  async function scrollTransactions(page) {
    console.error("[ 🍔 performing transaction scrolling ]")
    const link = await page.$('a[href*="/privat/frontpage"]');

    if (link) {
        console.error("🐁 - found home button, clicking it")
        await link.click();
    }
    const [button] = await page.$x("//span[contains(., 'NemKonto')]");
    await page.screenshot({ path: 'home.png', fullPage: true })

    console.error("🐁 - clicking NemKonto button")
    if(button){
      await button.click();
    }
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'postings_start.png', fullPage: true })
    const retryScroll = await autoScroll(page);
    await page.screenshot({ path: 'postings_end.png', fullPage: true })
    console.error("🎬 - exiting transaction scrolling")
    return retryScroll
  }
  const [button] = await page.$x("//span[contains(., 'NemKonto')]");

  try {
    let loggedIn = false;
    let retryScroll = false;
    while (true) {
      console.error(`[ 🍔 iterating ] loggedIn:${loggedIn}, retryScroll:${retryScroll}`)

      if (!retryScroll){
        loggedIn = await performLogin(page)
      }
      if (loggedIn){
        retryScroll = await scrollTransactions(page)
      }

    }
  }
  catch (e){
    console.error("‼️ - error caught", e)
    await browser.close()
  }
})