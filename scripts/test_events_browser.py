#!/usr/bin/env python3
"""Real Chromium release checks. Playwright is a CI-only dependency, never shipped."""
import argparse,functools,http.server,json,threading,time,urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base-url');ap.add_argument('--output',default='artifacts/events-browser');ap.add_argument('--wait-for-release',action='store_true');args=ap.parse_args()
 out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
 if args.base_url:base=args.base_url.rstrip('/')
 else:
  class Quiet(http.server.SimpleHTTPRequestHandler):
   def log_message(self,*args):pass
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 datasets={lang:json.loads((ROOT/f'assets/data/ophthalmology-events.{lang}.json').read_text()) for lang in ['ru','en']}
 if args.wait_for_release:
  for attempt in range(60):
   try:
    match=all(json.load(urllib.request.urlopen(base+f'/assets/data/ophthalmology-events.{lang}.json?release=20261102',timeout=15))==datasets[lang] for lang in ['ru','en'])
    if match:break
   except Exception:pass
   time.sleep(5)
  else:raise AssertionError('Production has not served the expected release data')
 failures=[];rows=[];today=datetime.now(ZoneInfo('Europe/Moscow')).date().isoformat()
 with sync_playwright() as p:
  browser=p.chromium.launch()
  for lang in ['ru','en']:
   path=('/en' if lang=='en' else '')+'/for-doctors/events/'
   for width,height in [(320,740),(390,844),(768,1024),(1440,1000)]:
    for theme in ['light','dark']:
     name=f'{lang}-{width}-{theme}';row={'case':name,'checks':[],'errors':[]};rows.append(row)
     ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<768,has_touch=width<768,color_scheme=theme,reduced_motion='reduce',timezone_id='Europe/Moscow',accept_downloads=True)
     ctx.add_init_script(f"localStorage.setItem('site_theme_v1','{theme}');localStorage.setItem('medical_professional_audience_v1','confirmed');localStorage.setItem('site_cookie_choice','essential');")
     page=ctx.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda err,row=row:row['errors'].append(str(err)))
     try:
      page.goto(base+path,wait_until='domcontentloaded',timeout=60000)
      page.wait_for_selector('#events-grid [data-details]',timeout=30000)
      page.wait_for_function("document.documentElement.dataset.theme === '"+theme+"'")
      expected=sum(e['end']>=today for e in datasets[lang]['events'])
      assert page.locator('#events-grid .event-card').count()==expected,'initial catalogue count'
      def fits(label):
       sizes=page.evaluate('({viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
       assert max(sizes['doc'],sizes['body'])<=sizes['viewport']+1,f'{label}: horizontal overflow {sizes}'
       row['checks'].append(label)
      fits('initial layout')
      if width>=1021:assert page.locator('.hero').bounding_box()['height']<650,'homepage hero minimum height leaked into calendar'
      page.screenshot(path=str(out/(name+'-events.png')),full_page=False)
      page.locator('#event-search').fill('APAO')
      assert page.locator('#events-grid .event-card').count()==1,'APAO search'
      page.locator('#events-grid [data-details]').click();page.wait_for_selector('#event-dialog[open]')
      assert '2027' in page.locator('#dialog-title').inner_text()
      assert page.locator('#dialog-body a[href="https://2027.apaophth.org/registration/"]').count() or page.locator('#dialog-body a').filter(has_text='Registration' if lang=='en' else 'Регистрация').count(),'registration link missing'
      fits('event dialog');page.locator('#dialog-close').click()
      page.locator('#events-grid [data-add-event]').click();page.wait_for_selector('#calendar-options-dialog[open]')
      assert 'dates=20270318%2F20270322' in page.locator('#calendar-google').get_attribute('href'),'inclusive event dates'
      fits('calendar provider dialog')
      with page.expect_download() as download:page.locator('[data-calendar-provider]').first.click()
      text=Path(download.value.path()).read_text();assert 'DTSTART;VALUE=DATE:20270318' in text and 'DTEND;VALUE=DATE:20270322' in text,'ICS export'
      row['checks'].append('search, details, registration, Google/ICS export')
      page.locator('#clear-filters').click()
      regions=page.locator('#region-filters [data-region]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.region)')
      for region in regions:
       if region=='all':continue
       page.locator('#region-filters [data-region]').evaluate_all('(nodes,r)=>nodes.find(n=>n.dataset.region===r).click()',region)
       expected_region=sum(e['region']==region and e['end']>=today for e in datasets[lang]['events'])
       assert page.locator('#events-grid .event-card').count()==expected_region,f'region {region}'
      page.locator('#clear-filters').click();row['checks'].append('all region filters')
      spec=page.locator('#specialty-filters [data-specialty]').nth(1).get_attribute('data-specialty');page.locator('#specialty-filters [data-specialty]').nth(1).click()
      assert page.locator('#events-grid .event-card').count()==sum(e['end']>=today and spec in e['categories'] for e in datasets[lang]['events']),'specialty filter'
      page.locator('#clear-filters').click();page.locator('#toggle-open').check();assert page.locator('#events-grid .event-card').count()>0;page.locator('#clear-filters').click();page.locator('#toggle-deadlines').check();assert page.locator('#events-grid .event-card').count()>0;page.locator('#clear-filters').click()
      page.locator('#events-grid [data-favorite]').first.click();page.locator('#toggle-favorites').check();assert page.locator('#events-grid .event-card').count()==1;page.locator('#clear-filters').click()
      page.locator('#toggle-past').check();assert page.locator('#events-grid .event-card').count()==len(datasets[lang]['events']);page.locator('#clear-filters').click()
      page.locator('#event-search').fill('no-such-event-73938');assert page.locator('#events-grid .empty-state').count()==1;page.locator('#clear-filters').click();row['checks'].append('specialty, deadline, favourite, past, empty filters')
      page.locator('[data-view="calendar"]').click();page.wait_for_selector('#view-calendar.active');fits('calendar layout');assert page.locator('#calendar-grid .calendar-cell').count()==42
      before=page.locator('#calendar-title').inner_text();page.locator('#calendar-next').click();assert page.locator('#calendar-title').inner_text()!=before;page.locator('#calendar-prev').click()
      page.locator('#calendar-grid [data-calendar-day]').nth(15).click();assert page.locator('#day-agenda h3').inner_text();page.screenshot(path=str(out/(name+'-calendar.png')),full_page=False)
      page.locator('[data-view="deadlines"]').click();page.wait_for_selector('#view-deadlines.active');fits('deadlines layout')
      page.locator('[data-view="globe"]').click();page.wait_for_selector('#view-globe.active');page.wait_for_function('!!document.querySelector("#view-globe canvas").dataset.tileLevel')
      assert page.locator('.globe-city[data-city]').count()>0,'globe cities'
      fits('globe layout');canvas=page.locator('#view-globe canvas');initial=int(canvas.get_attribute('data-tile-level'));page.locator('.globe-city[data-city]').first.click();page.wait_for_function('(old)=>Number(document.querySelector("#view-globe canvas").dataset.tileLevel)>old',arg=initial)
      assert page.locator('.globe-selection .globe-event').count()>0,'selected city events'
      page.locator('.globe-selection .globe-event').first.click();page.wait_for_selector('#event-dialog[open]');page.locator('#dialog-close').click()
      page.locator('[data-globe-control="reset"]').click();canvas.focus();page.keyboard.press('ArrowRight');page.locator('[data-globe-control="in"]').click();page.locator('[data-globe-control="out"]').click()
      try:page.wait_for_function('Number(document.querySelector("#view-globe canvas").dataset.imageryLoaded)>0',timeout=15000)
      except Exception:row['satelliteUnavailable']=True
      row['imageryLoaded']=canvas.get_attribute('data-imagery-loaded');row['tileErrors']=canvas.get_attribute('data-tile-errors');fits('globe after navigation');page.screenshot(path=str(out/(name+'-globe.png')),full_page=False)
      assert not row['errors'],'JavaScript exceptions: '+str(row['errors']);row['passed']=True
     except Exception as exc:
      row['passed']=False;row['failure']=str(exc);failures.append(name+': '+str(exc));page.screenshot(path=str(out/(name+'-failure.png')),full_page=False)
     finally:ctx.close()
     print(json.dumps(row,ensure_ascii=False),flush=True)
  # Network failure must retain the usable HTML, and must not claim JS controls work.
  ctx=browser.new_context(java_script_enabled=False);page=ctx.new_page()
  for lang in ['ru','en']:
   page.goto(base+('/en' if lang=='en' else '')+'/for-doctors/events/');assert page.locator('#events-grid .event-card').count()>0
  ctx.close()
  ctx=browser.new_context();page=ctx.new_page()
  page.route('**/assets/data/ophthalmology-events.*.json*',lambda route:route.abort())
  for lang in ['ru','en']:
   page.goto(base+('/en' if lang=='en' else '')+'/for-doctors/events/')
   page.wait_for_function("document.querySelector('#results-meta').textContent.includes('Refresh the page') || document.querySelector('#results-meta').textContent.includes('Обновите страницу')")
   assert page.locator('#events-grid .event-card').count()>0
  ctx.close();browser.close()
 (out/'results.json').write_text(json.dumps({'base':base,'cases':rows,'failures':failures},ensure_ascii=False,indent=2))
 if failures:raise SystemExit('\n'.join(failures))
 print(f'PASS: {len(rows)} language/viewport/theme cases; no-JS catalogue in both languages')
if __name__=='__main__':main()
