#!/usr/bin/env python3
"""Validate and monitor official ophthalmology-event sources.

The public site remains static. This script is designed for GitHub Actions:
1) validate locale datasets and source allowlist;
2) fetch only official HTTPS sources;
3) confirm that watched terms remain present;
4) produce a machine-readable report with page hashes and candidate dates.

It deliberately does not overwrite a factual event/deadline date from an ambiguous
web page. Changed or missing source context is marked attentionRequired so the
workflow can open a review issue/PR instead of silently publishing bad data.
"""
from __future__ import annotations
import argparse, hashlib, json, re, sys, urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'assets/data'
DATE_RE=re.compile(r'\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+20\d{2}|20\d{2}-\d{2}-\d{2})\b',re.I)

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in {'script','style','noscript'}: self.skip+=1
    def handle_endtag(self,tag):
        if tag in {'script','style','noscript'} and self.skip: self.skip-=1
    def handle_data(self,data):
        if not self.skip:
            v=' '.join(data.split())
            if v:self.parts.append(v)
    def text(self): return ' '.join(self.parts)

def load(path): return json.loads(path.read_text(encoding='utf-8'))

def validate_dataset(payload,lang):
    errors=[]
    if payload.get('schemaVersion')!=1: errors.append(f'{lang}: schemaVersion must be 1')
    events=payload.get('events')
    if not isinstance(events,list): return [f'{lang}: events must be an array']
    seen=set()
    for e in events:
        eid=e.get('id','')
        if not eid or eid in seen: errors.append(f'{lang}: missing/duplicate event id {eid!r}')
        seen.add(eid)
        for key in ('title','fullTitle','org','start','end','region','official','deadlines'):
            if key not in e: errors.append(f'{lang}:{eid}: missing {key}')
        if not str(e.get('official','')).startswith('https://'): errors.append(f'{lang}:{eid}: official URL must be HTTPS')
        for key in ('start','end'):
            try: datetime.fromisoformat(e[key].replace('Z','+00:00'))
            except Exception: errors.append(f'{lang}:{eid}: invalid {key}={e.get(key)!r}')
        for d in e.get('deadlines',[]):
            try: datetime.fromisoformat(d['date'].replace('Z','+00:00'))
            except Exception: errors.append(f'{lang}:{eid}: invalid deadline date {d.get("date")!r}')
            if not str(d.get('url','')).startswith('https://'): errors.append(f'{lang}:{eid}: deadline URL must be HTTPS')
    return errors

def validate_all():
    ru=load(DATA/'ophthalmology-events.ru.json'); en=load(DATA/'ophthalmology-events.en.json'); sources=load(DATA/'ophthalmology-event-sources.json')
    errors=validate_dataset(ru,'ru')+validate_dataset(en,'en')
    ru_ids={e['id'] for e in ru['events']}; en_ids={e['id'] for e in en['events']}
    if ru_ids!=en_ids: errors.append('RU/EN event id sets differ')
    source_ids=set()
    for s in sources.get('sources',[]):
        if not s.get('official'): errors.append(f"source {s.get('id')}: official must be true")
        u=urlparse(s.get('url',''))
        if u.scheme!='https' or not u.netloc: errors.append(f"source {s.get('id')}: invalid HTTPS URL")
        for eid in s.get('eventIds',[]):
            if eid not in ru_ids: errors.append(f"source {s.get('id')}: unknown event id {eid}")
            source_ids.add(eid)
    missing=ru_ids-source_ids
    if missing: errors.append('events without registered official source: '+', '.join(sorted(missing)))
    return errors,sources

def fetch_source(source,timeout=20):
    req=urllib.request.Request(source['url'],headers={'User-Agent':'MatveyShemyakin-OphthalmologyEventsBot/1.0 (+https://matveyshemyakin.ru/for-doctors/events/)','Accept':'text/html,application/xhtml+xml'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        raw=r.read(2_000_000); status=getattr(r,'status',200); final=r.geturl()
    parser=TextExtractor(); parser.feed(raw.decode('utf-8','replace')); text=parser.text()
    normalized=' '.join(text.split())
    term_status={term:(term.casefold() in normalized.casefold()) for term in source.get('watchTerms',[])}
    candidates=sorted(set(DATE_RE.findall(normalized)))[:80]
    return {'id':source['id'],'url':source['url'],'finalUrl':final,'httpStatus':status,'sha256':hashlib.sha256(raw).hexdigest(),'watchTerms':term_status,'candidateDates':candidates,'ok':status<400 and all(term_status.values())}

def check_sources(sources):
    rows=[]
    for source in sources['sources']:
        try: rows.append(fetch_source(source))
        except Exception as exc:
            rows.append({'id':source['id'],'url':source['url'],'ok':False,'error':f'{type(exc).__name__}: {exc}','watchTerms':{t:False for t in source.get('watchTerms',[])},'candidateDates':[]})
    attention=any(not r.get('ok') for r in rows)
    return {'checkedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),'attentionRequired':attention,'sources':rows}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--validate-only',action='store_true')
    ap.add_argument('--check-sources',action='store_true')
    ap.add_argument('--write-report',type=Path)
    args=ap.parse_args()
    errors,sources=validate_all()
    if errors:
        for e in errors: print('ERROR:',e,file=sys.stderr)
        return 2
    print('Dataset validation: OK')
    if args.validate_only and not args.check_sources: return 0
    if args.check_sources:
        report=check_sources(sources)
        if args.write_report:
            args.write_report.parent.mkdir(parents=True,exist_ok=True)
            args.write_report.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'checkedAt':report['checkedAt'],'attentionRequired':report['attentionRequired'],'sources':len(report['sources'])},ensure_ascii=False))
        return 1 if report['attentionRequired'] else 0
    return 0
if __name__=='__main__': raise SystemExit(main())
