import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]

class SearchIndexTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert (ROOT/'scripts/build_site_search.py').exists(), 'index generator must exist'
        spec=importlib.util.spec_from_file_location('search_builder', ROOT/'scripts/build_site_search.py')
        cls.builder=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.builder)

    def test_section_links_and_excluded_chrome(self):
        html='<html lang="en"><title>Eye care</title><body><nav>DO NOT INDEX MENU</nav><main><h1>Eye care</h1><section id="drops"><h2>Drops</h2><p>Unique full text needle.</p><script>DO NOT INDEX CODE</script></section></main></body></html>'
        records=self.builder.extract(html,'/en/eye-care/')
        hit=next(x for x in records if 'needle' in x['text'])
        self.assertEqual(hit['url'],'/en/eye-care/#drops')
        self.assertEqual(hit['lang'],'en')
        self.assertNotIn('DO NOT INDEX',str(records))

    def test_public_discovery_excludes_private_and_utilities(self):
        pages=self.builder.public_pages(ROOT)
        self.assertIn(ROOT/'en/patients/glaucoma/index.html',pages)
        self.assertIn(ROOT/'social/index.html',pages)
        self.assertNotIn(ROOT/'logbook/index.html',pages)
        self.assertNotIn(ROOT/'konspekt.html',pages)
        self.assertFalse(any('tests' in p.relative_to(ROOT).parts for p in pages))

    def test_prepare_never_rewrites_inline_code(self):
        script='<script>const template="<h3>Runtime heading</h3>";</script>'
        html='<html><head></head><body><main><h2>Static heading</h2></main>'+script+'</body></html>'
        output=self.builder.prepare(html)
        self.assertIn(script,output)
        self.assertIn('<h2 id="search-',output)

if __name__=='__main__': unittest.main()
