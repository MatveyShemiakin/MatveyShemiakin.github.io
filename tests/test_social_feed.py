import unittest
from pathlib import Path
from scripts.build_social_feed import render_cards, build_pages, ROOT
class FeedTests(unittest.TestCase):
 def test_escape(self):
  html=render_cards([{'text':'<script>x</script>','url':'javascript:x','date':100,'id':'1'}],'ru')
  self.assertNotIn('<script>',html);self.assertNotIn('javascript:',html);self.assertIn('&lt;script&gt;',html)
 def test_empty_bilingual(self):
  self.assertIn('Публикации',render_cards([],'ru'));self.assertIn('Posts',render_cards([],'en'))
 def test_album(self):
  html=render_cards([{'text':'a','album':'1','date':100,'url':'https://t.me/DrShemMYu/1','id':'1'},{'text':'b','album':'1','date':100,'url':'https://t.me/DrShemMYu/2','id':'2'}],'en')
  self.assertEqual(html.count('<article'),1);self.assertIn('a',html);self.assertIn('b',html)

 def test_page_assets_and_mobile_cta(self):
  build_pages([])
  for path in ['social/index.html','en/social/index.html']:
   page=(ROOT/path).read_text()
   self.assertIn('/collaboration/assets/styles.css',page)
   self.assertNotIn('/social/assets/',page)
   self.assertNotIn('href="#email"',page)
   self.assertIn('href="/en/social/"',page)

 def test_generated_header_keeps_shared_navigation(self):
  import tempfile, shutil
  from unittest.mock import patch
  from scripts import build_social_feed
  with tempfile.TemporaryDirectory() as temp:
   target=Path(temp)
   for source in ['collaboration/index.html','en/collaboration/index.html']:
    dest=target/source;dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/source,dest)
   with patch.object(build_social_feed,'ROOT',target):
    build_social_feed.build_pages([])
   for prefix in ['', 'en/']:
    page=(target/(prefix+'social/index.html')).read_text()
    self.assertIn('class="nav-right"',page)
    self.assertNotIn('<nav class="nav"',page)
    for asset in ['site-language-switch.js','site-theme-init.js','site-theme.js','site-mega-nav.js','mobile-nav.js']:
     self.assertEqual(page.count('/'+asset+'?'),1,asset)
    self.assertIn('href="/social/" lang="ru"',page)
    self.assertIn('href="/en/social/" lang="en"',page)
    from scripts.site_header import asset_version
    self.assertIn('/site-mega-nav.css?v='+asset_version('site-mega-nav.css'),page)
