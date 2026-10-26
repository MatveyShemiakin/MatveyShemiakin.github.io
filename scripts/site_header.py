"""Apply the one shared header without reserializing any page content."""
from __future__ import annotations
import argparse
import hashlib
import html
import re
from html.parser import HTMLParser
from pathlib import Path
from string import Template

ROOT=Path(__file__).resolve().parents[1]
CSS=('site-language-switch.css','site-theme.css','site-mega-nav.css','mobile-nav.css','site-header.css')
SCRIPTS=('site-language-switch.js','site-theme.js','site-mega-nav.js','mobile-nav.js')
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Elements(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=False)
  self.text=text;self.lines=[0];self.stack=[];self.nodes=[]
  self.lines.extend(m.end() for m in re.finditer('\n',text));self.feed(text)
 def position(self):
  line,column=self.getpos();return self.lines[line-1]+column
 def handle_starttag(self,tag,attrs):
  start=self.position();node={'tag':tag,'attrs':dict(attrs),'start':start,'open_end':start+len(self.get_starttag_text()),'parent':self.stack[-1] if self.stack else None}
  if tag not in VOID:self.stack.append(node)
 def handle_startendtag(self,tag,attrs):pass
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]['tag']==tag:
    node=self.stack[i];del self.stack[i:]
    node.update(close_start=self.position(),end=self.text.index('>',self.position())+1);self.nodes.append(node);return

def is_public_page(relative):
 p=Path(relative)
 return p.suffix=='.html' and p.parts[0] not in {'.git','logbook','media','tests','shared'} and p.name!='konspekt.html'

def public_pages():
 return sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*.html') if is_public_page(p.relative_to(ROOT)) and '<html' in p.read_text().lower())

def asset_version(asset):return hashlib.sha256((ROOT/asset).read_bytes()).hexdigest()[:12]

def asset_tag(asset):
 url='/'+asset+'?v='+asset_version(asset)
 return f'<link rel="stylesheet" href="{url}">' if asset.endswith('.css') else f'<script'+('' if asset=='site-theme-init.js' else ' defer')+f' src="{url}"></script>'

def _headers(text):
 shells={'site-header','site-head','patient-header','doctors-header','terms-head','professional-updates-header','clinical-header'}
 return [n for n in sorted(Elements(text).nodes,key=lambda n:n['start']) if n['tag']=='header' and shells.intersection(n['attrs'].get('class','').split())]

def _header(text):return next(iter(_headers(text)),None)

def _remaining_header(text,node):
 if node['attrs'].get('data-site-header')=='shared':return ''
 inner=text[node['open_end']:node['close_start']]
 nodes=Elements(text).nodes
 containers={'nav','header-inner','header-row','doctors-nav','professional-updates-nav','terms-nav'}
 nav=next((n for n in sorted(nodes,key=lambda n:n['start']) if n['parent'] is not None and n['parent']['start']==node['start'] and containers.intersection(n['attrs'].get('class','').split())),None)
 context=''
 if nav:
  # Section anchors and notifications are page tools, not copies of the global header.
  descendants=[n for n in sorted(nodes,key=lambda n:n['start']) if nav['open_end']<=n['start'] and n['end']<=nav['close_start']]
  links=[text[n['start']:n['end']] for n in descendants if n['tag']=='a' and n['attrs'].get('href','').startswith('#') and n['attrs'].get('href') not in {'#top','#about','#directions','#education','#science','#contacts'}]
  if links:context='<nav class="nav-links" aria-label="'+html.escape(next((n['attrs'].get('aria-label','') for n in descendants if n['tag']=='nav'),'') or 'Navigation',quote=True)+'">'+''.join(links)+'</nav>'
  for n in descendants:
   if n['attrs'].get('id') in {'patient-updates','doctors-updates'}:
    widget=text[n['start']:n['end']]
    if n['attrs']['id']=='doctors-updates':widget='<!-- doctors-updates:start -->'+widget+'<!-- doctors-updates:end -->'
    context+=widget
  if context:context='<div class="container" data-site-header-context>'+context+'</div>'
  inner=text[node['open_end']:nav['start']]+text[nav['end']:node['close_start']]
 else:inner=''
 if not inner.strip():return context
 opening=text[node['start']:node['open_end']].replace('<header','<section',1)
 return context+opening+re.sub(r'(?m)^[ \t]+$','',inner)+'</section>'

def _detach_updates(text):
 # Preserve complete widgets and their generator markers when moving them.
 widgets=[]
 for node in sorted(Elements(text).nodes,key=lambda n:n['start'],reverse=True):
  if node['attrs'].get('id') not in {'patient-updates','doctors-updates'}:continue
  parent=node['parent'];in_navigation=False
  while parent:
   if 'data-site-header-context' in parent['attrs'] or parent['tag']=='header':in_navigation=True;break
   parent=parent['parent']
  if not in_navigation:continue
  start,end=node['start'],node['end']
  before='<!-- doctors-updates:start -->';after='<!-- doctors-updates:end -->'
  if text[:start].endswith(before) and text[end:].startswith(after):start-=len(before);end+=len(after)
  widgets.insert(0,text[start:end]);text=text[:start]+text[end:]
 text=re.sub(r'<div\b[^>]*\bdata-site-header-context[^>]*>\s*</div>','',text)
 return text,''.join(widgets)

def content_without_navigation(text):
 text,updates=_detach_updates(text)
 for node in reversed(_headers(text)):
  text=text[:node['start']]+_remaining_header(text,node)+text[node['end']:]
 return inject_assets(text)+updates

def _url(relative):
 path='/'+relative
 return path.removesuffix('index.html') if path.endswith('index.html') else path

def _exists(url):
 target=ROOT/url.lstrip('/')
 return (target/'index.html').exists() if url.endswith('/') else target.exists()

def render_header(relative,updates=''):
 en=relative.startswith('en/');base=relative.removeprefix('en/');ru=_url(base);eng='/en'+ru
 if not _exists(eng):
  eng='/en/for-doctors/ophthasearch/' if 'ophthasearch-v2/' in eng else '/en/patients/' if base.startswith('patients/') else '/en/for-doctors/' if base.startswith('for-doctors/') else '/en/'
 if not _exists(ru):ru='/patients/' if base.startswith('patients/') else '/for-doctors/' if base.startswith('for-doctors/') else '/'
 values=dict(overlay=' data-site-header-overlay' if relative in {'index.html','en/index.html'} else '',home='/en/' if en else '/',prefix='/en' if en else '',monogram='MS' if en else 'МШ',home_label='Home' if en else 'Главная',nav_label='Main navigation' if en else 'Основная навигация',patients='Patients' if en else 'Пациентам',doctors='For doctors' if en else 'Для врачей',about='About the doctor' if en else 'О враче',language_label='Website language' if en else 'Язык сайта',theme_label='Switch to dark theme' if en else 'Включить тёмную тему',search='Search' if en else 'Поиск',ru_url=ru,en_url=eng,ru_active='' if en else ' is-active',en_active=' is-active' if en else '',ru_current='' if en else ' aria-current="page"',en_current=' aria-current="page"' if en else '')
 values['updates']=updates
 return Template((ROOT/'shared/site-header.html').read_text()).substitute({k:html.escape(v,quote=True) if k not in {'overlay','ru_current','en_current','updates'} else v for k,v in values.items()}).strip()

def inject_assets(text):
 assets=set(CSS+SCRIPTS+('site-theme-init.js',))
 def strip_tag(match):
  tag=match.group();url=re.search(r'(?:src|href)=["\'](/[^"\']+)["\']',tag)
  return '' if url and url.group(1).split('?')[0].lstrip('/') in assets else tag
 text=re.sub(r'[ \t]*<link\b[^>]*>|[ \t]*<script\b[^>]*>\s*</script>',strip_tag,text,flags=re.I)
 text=text.replace('</head>',asset_tag('site-theme-init.js')+''.join(asset_tag(a) for a in CSS)+'</head>',1)
 text=text.replace('</body>',''.join(asset_tag(a) for a in SCRIPTS)+'</body>',1)
 # Keep the existing professional notices, but invalidate their legacy header rewriter.
 text=re.sub(r'(/doctors-legal\.js)(?:\?v=[^"\']*)?',lambda m:m.group(1)+'?v='+asset_version('doctors-legal.js'),text)
 return text

def update_page(text,relative):
 if not is_public_page(relative) or '<html' not in text.lower():return text
 text,updates=_detach_updates(text)
 headers=_headers(text);current=next((n for n in headers if n['attrs'].get('data-site-header')=='shared'),None)
 header=render_header(relative,updates)
 if current:
  text=text[:current['start']]+header+text[current['end']:]
  for node in reversed(_headers(text)):
   if node['attrs'].get('data-site-header')!='shared':text=text[:node['start']]+_remaining_header(text,node)+text[node['end']:]
 else:
  first=next(iter(headers),None)
  for node in reversed(headers):text=text[:node['start']]+_remaining_header(text,node)+text[node['end']:]
  if first and first['parent'] and first['parent']['tag']=='body':text=text[:first['start']]+header+text[first['start']:]
  else:text=re.sub(r'(<body\b[^>]*>)',lambda m:m.group(1)+header,text,count=1,flags=re.I)
 return inject_assets(text)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();changed=[]
 for rel in public_pages():
  p=ROOT/rel;old=p.read_text();new=update_page(old,rel)
  if old!=new:
   changed.append(rel)
   if not args.check:p.write_text(new)
 if args.check and changed:raise SystemExit('Noncanonical header/assets: '+', '.join(changed))
 print(f'Shared header: {len(public_pages())} pages, {len(changed)} '+('outdated' if args.check else 'updated'))
if __name__=='__main__':main()
