"""Build the static site index with Python/Node standard libraries only.

--write refreshes the index, stable heading anchors and shared search hooks.
Default/--check verifies that the committed index and hooks are current.
"""
import hashlib
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
VERSION='20261017-1'
EXCLUDED={'logbook','tests','docs','scripts','.git','.github','sources','konspekty'}

def public_pages(root):
    result=[]
    for path in sorted(root.rglob('*.html')):
        rel=path.relative_to(root)
        if set(rel.parts)&EXCLUDED or rel.name=='konspekt.html': continue
        html=path.read_text(encoding='utf-8')
        # Drafts and utility viewers explicitly opted out of publication/search.
        if re.search(r'<meta\b(?=[^>]*\bname=[\"\']robots[\"\'])(?=[^>]*\bcontent=[\"\'][^\"\']*noindex)',html,re.I): continue
        result.append(path)
    return result

def page_url(path,root=ROOT):
    rel=path.relative_to(root).as_posix()
    return '/'+(rel[:-10] if rel.endswith('index.html') else rel)

class Node:
    def __init__(self,tag='',attrs=(),parent=None):
        self.tag=tag; self.attrs=dict(attrs); self.parent=parent; self.children=[]
    def text(self):
        if self.tag in {'script','style','nav','header','footer','form','button','svg','template','noscript'}: return ''
        return ' '.join(c if isinstance(c,str) else c.text() for c in self.children)
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child,Node): yield from child.walk()

class Parser(HTMLParser):
    def __init__(self,html):
        super().__init__(convert_charrefs=True)
        self.root=Node(); self.current=self.root; self.feed(html)
    def handle_starttag(self,tag,attrs):
        node=Node(tag,attrs,self.current); self.current.children.append(node)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.current=node
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs); self.handle_endtag(tag)
    def handle_endtag(self,tag):
        node=self.current
        while node.parent:
            if node.tag==tag: self.current=node.parent; return
            node=node.parent
    def handle_data(self,data): self.current.children.append(data)

def clean(value): return re.sub(r'\s+',' ',value).strip()

def extract(html,url):
    root=Parser(html).root; nodes=list(root.walk())
    lang=next((n.attrs.get('lang','ru') for n in nodes if n.tag=='html'),'ru')[:2]
    title=next((clean(n.text()) for n in nodes if n.tag=='h1'),None) or next((clean(n.text()) for n in nodes if n.tag=='title'),url)
    main=next((n for n in nodes if n.tag=='main'),None) or next((n for n in nodes if n.tag=='body'),root)
    records=[]; current={'title':title,'page':title,'url':url,'lang':lang,'text':''}
    def visit(node):
        nonlocal current
        if node.tag in {'script','style','nav','header','footer','form','button','svg','template','noscript'}: return
        # The homepage replaces this whole subtree from science-section-data.js.
        if node.attrs.get('id')=='science': return
        if node.tag in {'h1','h2','h3','h4','summary'}:
            heading=clean(node.text())
            if heading:
                if clean(current['text']): records.append(current)
                anchor=node
                while anchor.parent and not anchor.attrs.get('id'): anchor=anchor.parent
                fragment=quote(anchor.attrs['id'],safe='') if anchor.attrs.get('id') else ''
                destination=url+('#'+fragment if fragment else '')
                link=node.parent
                while link and link is not main:
                    href=link.attrs.get('href','')
                    if link.tag=='a' and href.startswith('/') and not href.startswith('//'):
                        destination=href; break
                    link=link.parent
                current={'title':heading,'page':title,'url':destination,'lang':lang,'text':''}
        for child in node.children:
            if isinstance(child,str): current['text']+=' '+child
            else: visit(child)
    visit(main)
    if clean(current['text']): records.append(current)
    for item in records: item['text']=clean(item['text'])
    return records

def prepare(html):
    # Add stable ids without rewriting existing markup or existing anchors.
    seen=set(re.findall(r'\bid=[\"\']([^\"\']+)',html))
    def heading(match):
        tag,attrs,body=match.groups()
        if re.search(r'\bid\s*=',attrs,re.I): return match.group(0)
        base='search-'+hashlib.sha1(clean(re.sub('<[^>]+>','',body)).encode()).hexdigest()[:10]
        anchor=base; i=2
        while anchor in seen: anchor=base+'-'+str(i); i+=1
        seen.add(anchor)
        return f'<{tag}{attrs} id="{anchor}">{body}</{tag}>'
    parts=re.split(r'(<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<!--.*?-->)',html,flags=re.I|re.S)
    html=''.join(part if i%2 else re.sub(r'<(h[2-4])\b([^>]*)>(.*?)</\1>',heading,part,flags=re.I|re.S) for i,part in enumerate(parts))
    for asset,tag in [('css',f'<link rel="stylesheet" href="/mobile-nav.css?v={VERSION}">'),('js',f'<script src="/mobile-nav.js?v={VERSION}"></script>')]:
        pattern=r'<link\b[^>]*href=[\"\']/mobile-nav\.css[^\"\']*[\"\'][^>]*>' if asset=='css' else r'<script\b[^>]*src=[\"\']/mobile-nav\.js[^\"\']*[\"\'][^>]*>\s*</script>'
        if re.search(pattern,html,re.I): html=re.sub(pattern,lambda _:tag,html,flags=re.I)
        else: html=html.replace('</head>' if asset=='css' else '</body>',tag+('</head>' if asset=='css' else '</body>'),1)
    if 'data-site-header="shared"' in html:
        from scripts.site_header import inject_assets
        html=inject_assets(html)
    return html

def dynamic_faq(root,lang):
    prefix='en/patients' if lang=='en' else 'patients'
    script="const fs=require('fs'),vm=require('vm');const ctx={window:{}};vm.createContext(ctx);for(const p of process.argv.slice(1))vm.runInContext(fs.readFileSync(p,'utf8'),ctx);process.stdout.write(JSON.stringify(ctx.window.PATIENT_FAQ_DATA));"
    return json.loads(subprocess.check_output(['node','-e',script,str(root/prefix/'faq-data.js'),str(root/prefix/'faq-extra-data.js')],text=True,encoding='utf-8'))['faqs']

def text_values(value):
    if isinstance(value,str):
        return value if not value.startswith(('http','/','data:')) else ''
    if isinstance(value,list): return ' '.join(text_values(x) for x in value)
    if isinstance(value,dict): return ' '.join(text_values(v) for k,v in value.items() if k not in {'id','image','logo','imageAlt','logoAlt','url','href'})
    return ''

def dynamic_sections(root,urls):
    records=[]
    script="const fs=require('fs'),vm=require('vm');const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),ctx);process.stdout.write(JSON.stringify(ctx.window.SCIENCE_SECTION_CONTENT));"
    science=json.loads(subprocess.check_output(['node','-e',script,str(root/'science-section-data.js')],text=True,encoding='utf-8'))
    for lang in ('ru','en'):
        prefix='/en' if lang=='en' else ''
        records.append({'title':'Research and publications' if lang=='en' else 'Наука и публикации','page':'Matvey Shemyakin' if lang=='en' else 'Матвей Шемякин','url':prefix+'/#science','lang':lang,'text':clean(text_values(science[lang]))})
        events=json.loads((root/f'assets/data/ophthalmology-events.{lang}.json').read_text(encoding='utf-8'))['events']
        for event in events:
            records.append({'title':event['title'],'page':'Ophthalmology events' if lang=='en' else 'Офтальмологические события','url':prefix+'/for-doctors/events/#event-'+quote(event['id'],safe=''),'lang':lang,'text':clean(text_values(event))})
        for feed in ('patients/updates.json','for-doctors/updates.json'):
            for item in json.loads((root/feed).read_text(encoding='utf-8')):
                suffix='_en' if lang=='en' else ''
                url=item.get('url'+suffix)
                if not url or url.split('#')[0] not in urls: continue
                records.append({'title':item.get('title'+suffix,item['title']),'page':'Latest materials' if lang=='en' else 'Новые материалы','url':url,'lang':lang,'text':item.get('description'+suffix,item.get('description',''))})
    return records

def build(root,write=False):
    records=[]; pages=public_pages(root); stale=[]
    for path in pages:
        before=path.read_text(encoding='utf-8'); html=prepare(before)
        if html!=before:
            if write: path.write_text(html,encoding='utf-8',newline='')
            else: stale.append(path.relative_to(root).as_posix())
        records.extend(extract(html,page_url(path,root)))
    # These FAQs are rendered at runtime, so static HTML alone is insufficient.
    for lang in ('ru','en'):
        url=('/en' if lang=='en' else '')+'/patients/cataract/'
        for faq in dynamic_faq(root,lang):
            records.append({'title':faq['q'],'page':'Cataract' if lang=='en' else 'Катаракта','url':url+'#'+quote(faq['id'],safe=''),'lang':lang,'text':clean(' '.join([faq['short'],*faq['paragraphs'],*faq['important']]))})
    records.extend(dynamic_sections(root,{page_url(p,root) for p in pages}))
    data={'version':1,'pages':[page_url(p,root) for p in pages],'records':records}
    output=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
    target=root/'site-search-index.json'
    if write: target.write_text(output,encoding='utf-8',newline='')
    elif not target.exists() or target.read_text(encoding='utf-8')!=output: stale.append('site-search-index.json')
    if stale: raise SystemExit('Run python scripts/build_site_search.py --write: '+', '.join(stale))
    print(f'Search index: {len(pages)} public pages, {len(records)} sections')
    return data

if __name__=='__main__': build(ROOT,'--write' in sys.argv)
