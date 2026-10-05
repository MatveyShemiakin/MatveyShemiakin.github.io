import unittest
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
