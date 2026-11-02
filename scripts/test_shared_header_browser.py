#!/usr/bin/env python3
"""Compare author-section headers with the homepage in real CI Chromium."""
import argparse
import functools
import http.server
import json
import hashlib
import time
import urllib.request
import threading
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
METRICS = """() => {
 const header=document.querySelector('header[data-site-header]');
 const items={};
 for(const selector of ['.container.nav','.monogram','.site-language-switch','.site-theme-toggle']){
  const element=header.querySelector(selector),rect=element.getBoundingClientRect(),style=getComputedStyle(element);
  items[selector]={x:rect.x,y:rect.y,width:rect.width,height:rect.height,border:style.borderTopWidth,radius:style.borderTopLeftRadius,font:style.font,fontWeight:style.fontWeight,color:style.color};
 }
 return {items,headerHeight:header.getBoundingClientRect().height,viewport:innerWidth,
  overflow:[...header.querySelectorAll('a,button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').some(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1})};
}"""

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--base-url')
 parser.add_argument('--output',default='artifacts/shared-header')
 args=parser.parse_args()
 out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
 if args.base_url:base=args.base_url.rstrip('/')
 else:
  class Quiet(http.server.SimpleHTTPRequestHandler):
   def log_message(self,*args):pass
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  threading.Thread(target=server.serve_forever,daemon=True).start()
  base=f'http://127.0.0.1:{server.server_port}'
 if args.base_url:
  assets=['site-header.css','for-doctors/simple-questions/series.css']
  versions={asset:hashlib.sha256((ROOT/asset).read_bytes()).hexdigest()[:12] for asset in assets}
  for attempt in range(40):
   try:
    published=all(hashlib.sha256(urllib.request.urlopen(base+'/'+asset+'?v='+version,timeout=15).read()).hexdigest()[:12]==version for asset,version in versions.items())
    if published:break
   except Exception:pass
   time.sleep(3)
  else:raise AssertionError('Production has not served the approved header styles yet')
 rows=[]
 with sync_playwright() as p:
  browser=p.chromium.launch()
  for lang in ['ru','en']:
   prefix='/en' if lang=='en' else ''
   for width in [320,390,768,1440]:
    for theme in ['light','dark']:
     name=f'{lang}-{width}-{theme}'
     row={'case':name};rows.append(row)
     ctx=browser.new_context(viewport={'width':width,'height':1000},is_mobile=width<768,color_scheme=theme,reduced_motion='reduce')
     ctx.add_init_script(f"localStorage.setItem('site_theme_v1','{theme}');localStorage.setItem('medical_professional_audience_v1','confirmed');localStorage.setItem('site_cookie_choice','essential');")
     ctx.route('http**',lambda route:route.continue_() if urlsplit(route.request.url).netloc==urlsplit(base).netloc else route.abort())
     page=ctx.new_page();page.set_default_timeout(10000)
     try:
      page.goto(base+prefix+'/',wait_until='domcontentloaded',timeout=45000)
      page.locator('[data-site-header] .site-mega-nav').wait_for(state='attached')
      reference=page.evaluate(METRICS)
      page.screenshot(path=str(out/(name+'-home.png')))
      for slug in ['simple-questions','complicated-cataract']:
       path=prefix+'/for-doctors/'+slug+'/'
       page.goto(base+path,wait_until='domcontentloaded',timeout=45000)
       page.locator('[data-site-header] .site-mega-nav').wait_for(state='attached')
       actual=page.evaluate(METRICS)
       assert not actual['overflow'],f'{path}: header overflow'
       assert actual['headerHeight']==reference['headerHeight'],f'{path}: header height differs'
       for selector,wanted in reference['items'].items():
        found=actual['items'][selector]
        for prop,value in wanted.items():
         if isinstance(value,(float,int)):assert abs(found[prop]-value)<1.1,f'{path} {selector} {prop}: {found[prop]} vs homepage {value}'
         else:assert found[prop]==value,f'{path} {selector} {prop}: {found[prop]} vs homepage {value}'
       assert page.locator('header[data-site-header]').count()==1
       other='/en' if lang=='ru' else ''
       assert page.locator(f'.site-language-switch a[lang="{"en" if lang=="ru" else "ru"}"]').get_attribute('href')==other+'/for-doctors/'+slug+'/'
       if slug=='complicated-cataract':
        assert page.locator('[data-site-header-context]').count()==0,'duplicate article navigation'
        gap=page.evaluate("document.querySelector('.article-hero').getBoundingClientRect().top-document.querySelector('header[data-site-header]').getBoundingClientRect().bottom")
        assert abs(gap)<1,'gap between shared header and article hero'
        assert page.locator('.article-toc a[href="#assessment"]').count()==1
        assert page.locator('#assessment').count()==1
       if width>1020:
        toggle=page.locator('.site-mega-nav__toggle').first
        toggle.focus();toggle.press('Enter')
        assert toggle.get_attribute('aria-expanded')=='true','Enter must open the dropdown'
        page.keyboard.press('Escape');assert toggle.get_attribute('aria-expanded')=='false'
        toggle.hover();assert toggle.get_attribute('aria-expanded')=='true','Hover must open the dropdown'
        page.keyboard.press('Escape');assert toggle.get_attribute('aria-expanded')=='false'
        page.mouse.move(0,200)
       theme_button=page.locator('[data-site-theme-toggle]')
       theme_button.click()
       assert page.locator('html').get_attribute('data-site-theme')!=theme
       theme_button.click()
       assert page.locator('html').get_attribute('data-site-theme')==theme
       page.screenshot(path=str(out/(name+'-'+slug+'.png')))
       row[slug]=actual
      row['passed']=True
     except Exception as exc:
      row['passed']=False;row['failure']=str(exc)
      page.screenshot(path=str(out/(name+'-failure.png')))
      raise
     finally:
      (out/'results.json').write_text(json.dumps({'base':base,'cases':rows},ensure_ascii=False,indent=2))
      ctx.close()
     print(name,'PASS',flush=True)
  browser.close()
 print('PASS:',len(rows),'RU/EN × width × theme cases; homepage geometry, menus, themes and article TOC')

if __name__=='__main__':main()
