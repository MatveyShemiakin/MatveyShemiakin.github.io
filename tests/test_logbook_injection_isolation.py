import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1]


class LogbookInjectionIsolationTest(unittest.TestCase):
    def test_site_injectors_skip_logbook(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'logbook').mkdir()
            page = '<!doctype html><html><head></head><body><main>Private app</main></body></html>'
            (root / 'index.html').write_text(page)
            (root / 'logbook' / 'index.html').write_text(page)
            for name in ('inject_legal.py', 'inject_site_mega_nav.py'):
                target = root / 'scripts' / name
                target.write_bytes((SOURCE / 'scripts' / name).read_bytes())
                subprocess.run([sys.executable, str(target)], check=True, capture_output=True)
            self.assertEqual((root / 'logbook' / 'index.html').read_text(), page)
            self.assertIn('/legal.js', (root / 'index.html').read_text())


if __name__ == '__main__':
    unittest.main()
