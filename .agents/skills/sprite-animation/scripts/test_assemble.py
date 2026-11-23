"""Real Aseprite CLI checks, without opening a desktop window."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from PIL import Image, ImageDraw

SCRIPT = Path(__file__).with_name('assemble.lua')

class AssemblyChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='sprite-assembly-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.aseprite = shutil.which('aseprite')
        self.assertIsNotNone(self.aseprite, 'Aseprite CLI is required for this integration check')
        self.images = []
        for i in range(2):
            im = Image.new('RGBA', (32, 40))
            ImageDraw.Draw(im).rectangle((8+i*4, 5, 17+i*4, 36), fill=(40, 170, 90, 255))
            im.save(self.root/f'{i}.png');self.images.append(im)
        self.manifest = {'canvas':[32,40], 'tag':'walk', 'output':'walk.aseprite',
                         'frames':[{'image':'0.png','duration_ms':90}, {'image':'1.png','duration_ms':170}]}

    def assemble(self):
        path = self.root/'motion.json'
        path.write_text(json.dumps(self.manifest))
        return subprocess.run([self.aseprite,'-b','--script-param',f'manifest={path}',
                               '--script',str(SCRIPT)], capture_output=True, text=True)

    def test_native_roundtrip_preserves_frames_timing_and_tag(self):
        result=self.assemble()
        self.assertEqual(result.returncode,0,result.stderr+result.stdout)
        native=self.root/'walk.aseprite'
        self.assertTrue(native.exists(),result.stdout+result.stderr)
        subprocess.run([self.aseprite,'-b','--list-tags',str(native),'--sheet',str(self.root/'sheet.png'),
                        '--format','json-array','--data',str(self.root/'export.json')],check=True,capture_output=True)
        data=json.loads((self.root/'export.json').read_text())
        self.assertEqual([f['duration'] for f in data['frames']],[90,170])
        self.assertEqual(data['meta']['frameTags'][0]['name'],'walk')
        sheet=Image.open(self.root/'sheet.png').convert('RGBA')
        for expected, f in zip(self.images,data['frames']):
            r=f['frame'];actual=sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
            self.assertEqual(actual.size,(32,40))
            self.assertEqual(actual.tobytes(),expected.tobytes())

    def test_mismatched_canvas_is_rejected_before_saving(self):
        self.manifest['canvas']=[20,20]
        result=self.assemble()
        self.assertIn('Frame size mismatch',result.stdout+result.stderr)
        self.assertFalse((self.root/'walk.aseprite').exists())

if __name__=='__main__':
    unittest.main(verbosity=2)
