import importlib
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class SharedHeaderTests(unittest.TestCase):
 def component(self):
  self.assertTrue((ROOT/'shared/site-header.html').exists(),'The website needs one shared header template')
  return importlib.import_module('scripts.site_header')

 def test_all_existing_page_variants_preserve_content(self):
  c=self.component()
  for rel in c.public_pages():
   with self.subTest(page=rel):
    source=(ROOT/rel).read_text();result=c.update_page(source,rel)
    self.assertEqual(c.content_without_navigation(source),c.content_without_navigation(result))
    self.assertEqual(result,c.update_page(result,rel))
    self.assertEqual(result.count('data-site-header="shared"'),1)
    self.assertNotIn('data-site-header-context',result)
    header=re.search(r'<header\b.*?</header>',result,re.S).group()
    self.assertEqual(header.count('data-site-theme-toggle'),1)
    self.assertEqual(header.count('data-site-search-open'),1)
    self.assertNotIn('style=',header)

 def test_language_links_use_real_counterparts(self):
  c=self.component()
  for rel,ru,en in [('for-doctors/simple-questions/index.html','/for-doctors/simple-questions/','/en/for-doctors/simple-questions/'),('en/social/index.html','/social/','/en/social/')]:
   result=c.update_page((ROOT/rel).read_text(),rel)
   header=re.search(r'<header\b.*?</header>',result,re.S).group()
   self.assertIn('href="'+ru+'"',header);self.assertIn('href="'+en+'"',header)
  result=c.update_page((ROOT/'patients/cataract-postop-plan/index.html').read_text(),'patients/cataract-postop-plan/index.html')
  self.assertNotIn('href="/en/patients/cataract-postop-plan/"',result)

 def test_patient_hero_is_preserved(self):
  c=self.component();rel='patients/iol-dislocation/index.html';source=(ROOT/rel).read_text()
  result=c.update_page(source,rel)
  self.assertIn('class="site-head"',result)
  self.assertIn('<h1>Смещение искусственного хрусталика</h1>',result)
  self.assertIn('id="content-material"',result)

 def test_asset_versions_match_file_content(self):
  c=self.component();rel='for-doctors/simple-questions/index.html'
  result=c.update_page((ROOT/rel).read_text(),rel)
  for asset in ['site-header.css','site-mega-nav.js','site-theme.js','mobile-nav.js','doctors-legal.js','for-doctors/simple-questions/series.css']:
   self.assertEqual(len(re.findall('/'+re.escape(asset)+r'\?v='+c.asset_version(asset),result)),1,asset)

 def test_article_header_does_not_duplicate_its_existing_contents(self):
  c=self.component()
  for rel in ['for-doctors/complicated-cataract/index.html','en/for-doctors/complicated-cataract/index.html']:
   with self.subTest(page=rel):
    source=(ROOT/rel).read_text();result=c.update_page(source,rel)
    self.assertFalse('data-site-header-context' in result)
    self.assertEqual(re.search(r'<main\b.*?</main>',source,re.S).group(),re.search(r'<main\b.*?</main>',result,re.S).group())
    self.assertEqual(result,c.update_page(result,rel))

 def test_excluded_tools_and_media_are_not_migrated(self):
  c=self.component()
  for rel in ['konspekt.html','logbook/index.html','media/index.html','tests/theme-contrast-audit.html']:
   self.assertFalse(c.is_public_page(rel))

 def test_nested_patient_headers_do_not_leave_a_second_navigation(self):
  c=self.component()
  import subprocess
  for rel in ['patients/iol-dislocation/index.html','en/patients/iol-dislocation/index.html','patients/glaucoma/index.html','en/patients/glaucoma/index.html']:
   source=subprocess.check_output(['git','show','HEAD:'+rel],text=True,cwd=ROOT)
   result=c.update_page(source,rel)
   self.assertEqual(len(re.findall(r'<header\b',result)),1,rel)

 def test_updates_and_local_page_navigation_survive_migration(self):
  c=self.component()
  import subprocess
  for rel,markers in [('patients/index.html',['id="patient-updates"','id="patient-updates-list"','id="conditions"']),('for-doctors/index.html',['id="doctors-updates"','<!-- doctors-updates:start -->']),('patients/cataract-postop-plan/index.html',['id="journal"','id="urgent"'])]:
   source=subprocess.check_output(['git','show','HEAD:'+rel],text=True,cwd=ROOT)
   result=c.update_page(source,rel)
   for marker in markers:self.assertIn(marker,result,rel)

 def test_update_bells_share_the_top_control_row_without_an_empty_context(self):
  c=self.component()
  for rel,widget in [('patients/index.html','patient-updates'),('for-doctors/index.html','doctors-updates'),('en/for-doctors/index.html','doctors-updates'),('for-doctors/ophthasearch/index.html','doctors-updates'),('en/for-doctors/ophthasearch/index.html','doctors-updates')]:
   with self.subTest(page=rel):
    source=(ROOT/rel).read_text();result=c.update_page(source,rel)
    nodes=c.Elements(result).nodes
    bell=next(n for n in nodes if n['attrs'].get('id')==widget)
    self.assertIn('nav-right',bell['parent']['attrs'].get('class','').split())
    self.assertEqual(result.count('id="'+widget+'"'),1)
    self.assertEqual(result,c.update_page(result,rel))
    self.assertNotRegex(result,r'<div[^>]*data-site-header-context[^>]*>\s*</div>')
    if rel=='patients/index.html':
     self.assertIn('id="conditions"',result)
     self.assertNotIn('data-site-header-context',result)

 def test_one_shared_breadcrumb_per_inner_page_with_working_parent_links(self):
  c=self.component()
  for rel in c.public_pages():
   with self.subTest(page=rel):
    text=(ROOT/rel).read_text();nodes=c.breadcrumb_nodes(text)
    self.assertEqual(len(nodes),0 if rel in {'index.html','en/index.html'} else 1)
    if not nodes:continue
    nav=nodes[0]
    self.assertEqual(nav['tag'],'nav')
    self.assertEqual(nav['attrs'].get('data-site-breadcrumbs'),'shared')
    self.assertEqual(nav['attrs'].get('class'),'site-breadcrumbs')
    descendants=[n for n in c.Elements(text).nodes if nav['open_end']<=n['start']<nav['close_start']]
    links=[n['attrs']['href'] for n in descendants if n['tag']=='a']
    self.assertEqual(links[0],'/en/' if rel.startswith('en/') else '/')
    self.assertEqual(len(links),len(set(links)))
    for href in links:self.assertTrue(c._exists(href),href)
    self.assertEqual(sum(n['attrs'].get('aria-current')=='page' for n in descendants),1)

 def test_mixed_legacy_and_shared_breadcrumbs_are_replaced_once(self):
  c=self.component();rel='for-doctors/bacterial-keratitis/index.html'
  source=(ROOT/rel).read_text()
  source=source.replace('<h1>','<nav class="clinical-breadcrumbs"><a href="/">Old home</a></nav><h1>',1)
  result=c.update_page(source,rel)
  self.assertEqual(len(c.breadcrumb_nodes(result)),1)
  self.assertNotIn('class="clinical-breadcrumbs"',result)
  self.assertEqual(c.content_without_navigation(source),c.content_without_navigation(result))
  self.assertEqual(result,c.update_page(result,rel))
