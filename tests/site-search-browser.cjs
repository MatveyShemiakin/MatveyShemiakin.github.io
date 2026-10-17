// Run with Playwright available in NODE_PATH; no dependency is shipped to the site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8765';
(async()=>{
  const browser=await chromium.launch({channel:process.env.SEARCH_BROWSER||'msedge',headless:true});
  try{
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:844}});
      await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
      await page.goto(base+'/');
      const open=page.locator(width>760?'[data-site-search-open]':'[data-mobile-nav="search"]');
      await open.click();
      const input=page.locator('.site-mobile-search__input');
      await input.fill('катаракта');
      await page.locator('.site-mobile-search__result[href]').first().waitFor();
      assert.ok(await page.locator('.site-mobile-search__result mark').count()>0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
      assert.ok(await page.locator('.site-mobile-search__dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));
      await page.keyboard.press('Escape');
      assert.equal(await open.evaluate(el=>el===document.activeElement),true,'focus restored to the opener');
      await open.click();await input.fill('cataract');
      await page.waitForFunction(()=>!!document.querySelector('.site-mobile-search__result[href^="/en/"]'));
      await input.fill('zzzunfindablezzz');
      await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.includes('не найдено'));
      assert.equal(await page.locator('.site-mobile-search__result[href]').count(),0);
      await page.close();
    }
    const page=await browser.newPage();
    await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    await page.goto(base+'/en/patients/');
    await page.locator('[data-site-search-open]').click();
    await page.locator('.site-mobile-search__input').fill('glaucoma');
    await page.locator('.site-mobile-search__result[href]').first().waitFor();
    assert.ok((await page.locator('.site-mobile-search [role="status"]').innerText()).includes('matching sections'));
    await page.keyboard.press('Escape');
    // Every indexed static fragment must exist in its source page. Runtime FAQs
    // are checked separately in the browser, since they are not in static HTML.
    const data=JSON.parse(fs.readFileSync('site-search-index.json','utf8'));
    for(const item of data.records){
      const u=new URL(item.url,base);if(!u.hash)continue;
      const file=u.pathname.endsWith('/')?u.pathname.slice(1)+'index.html':u.pathname.slice(1);
      if(!u.hash.startsWith('#search-'))continue;
      assert.ok(fs.readFileSync(file,'utf8').includes('id="'+decodeURIComponent(u.hash.slice(1))+'"'),item.url);
    }
    await page.goto(base+'/patients/cataract/#antikoagulyanty');
    await page.waitForFunction(()=>document.getElementById('antikoagulyanty')?.open);
    await page.goto(base+'/for-doctors/events/#event-fedorov-2026');
    await page.waitForFunction(()=>document.getElementById('event-dialog')?.open);
    assert.ok((await page.locator('#dialog-body').innerText()).includes('Федоровские чтения'));
    await page.goto(base+'/');
    for(let i=0;i<2;i++){
      await page.locator('.site-theme-toggle').click();
      await page.locator('[data-site-search-open]').click();
      assert.equal(await page.locator('.site-mobile-search').getAttribute('data-theme'),await page.locator('html').getAttribute('data-theme'));
      await page.keyboard.press('Escape');
    }
    console.log('Search browser checks passed: desktop, 390/320px, RU/EN, focus, empty state, static anchors and rendered FAQ');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
