"""Offline regression checks with generated media; no account, cookies or network needed."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('social_research', SCRIPTS / 'research.py')
research = importlib.util.module_from_spec(spec)
spec.loader.exec_module(research)


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'Requires FFmpeg')
class MediaChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='social-research-check-')
        self.base = Path(self.temp.name)
        self.config = self.base / 'config.json'
        self.config.write_text(json.dumps({'data_dir': str(self.base / 'data')}))
        self.config.chmod(0o600)
        self.video = self.base / 'source.mp4'
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=96x64:r=10:d=2',
                        '-f', 'lavfi', '-i', 'color=c=blue:s=96x64:r=10:d=2', '-f', 'lavfi', '-i', 'color=c=green:s=96x64:r=10:d=2',
                        '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]', '-map', '[v]', '-c:v', 'libx264',
                        '-pix_fmt', 'yuv420p', str(self.video)], check=True, capture_output=True)
        self.manifest = self.call('import', str(self.video), '--kind', 'video')['manifest']

    def tearDown(self):
        self.temp.cleanup()

    def call(self, *args, success=True):
        p = subprocess.run([sys.executable, str(SCRIPTS / 'research.py'), '--config', str(self.config), *args],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode == 0, success, p.stderr)
        return json.loads(p.stdout if success else p.stderr)

    def test_default_eof_and_decoded_timestamps(self):
        value = self.call('inspect', self.manifest)
        self.assertEqual(len(value['images']), 8)
        for frame in value['images']:
            t = frame['original_seconds']
            self.assertLess(t, 6)
            self.assertAlmostEqual(t, frame['selected_seconds'], places=4)
            pixel = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', frame['path'], '-vf', 'scale=1:1',
                                    '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], capture_output=True, check=True).stdout
            red, green, blue = pixel[:3]
            self.assertEqual(max(range(3), key=[red, green, blue].__getitem__), 0 if t < 2 else 2 if t < 4 else 1)
            self.assertEqual(Path(frame['path']).stat().st_mode & 0o077, 0)

    def test_later_interval_and_crop(self):
        value = self.call('inspect', self.manifest, '--start', '4', '--end', '6', '--frames', '3', '--crop', '0', '0', '48', '32')
        self.assertEqual(len(value['images']), 3)
        self.assertTrue(all(4 <= f['original_seconds'] < 6 for f in value['images']))

    def test_checksum_and_no_audio_fail_explicitly(self):
        self.assertIn('no audio', self.call('transcribe', self.manifest, success=False)['error'])
        manifest = json.loads(Path(self.manifest).read_text())
        original = Path(self.manifest).parent / manifest['assets'][0]['path']
        with original.open('ab') as stream:
            stream.write(b'changed')
        self.assertIn('checksum', self.call('inspect', self.manifest, success=False)['error'])

    def test_invalid_ranges_and_import_rollback(self):
        self.call('inspect', self.manifest, '--start', '6', '--end', '5', success=False)
        data = self.base / 'data'
        before = set(data.iterdir())
        broken = self.base / 'not-video.mp4'; broken.write_bytes(b'invalid video bytes')
        self.call('import', str(broken), '--kind', 'video', success=False)
        self.assertEqual(set(data.iterdir()), before)

    def test_outside_manifest_is_refused(self):
        outside = self.base / 'manifest.json';outside.write_text(Path(self.manifest).read_text())
        self.assertIn('private data', self.call('inspect', str(outside), success=False)['error'])


class BoundaryChecks(unittest.TestCase):
    def test_platform_action_urls_are_rejected(self):
        for url in ['http://instagram.com/p/abc/', 'https://instagram.com/accounts/login/',
                    'https://user:password@instagram.com/p/abc/', 'https://127.0.0.1/p/abc/']:
            with self.assertRaises(research.ResearchError):
                research.canonical_url(url)

    def test_inventory_never_includes_signed_media_urls(self):
        value = research.strip_inventory({'account': {'id': 'private'}, 'discovery': {'id': 'query'},
                   'items': [{'code': 'demo', 'assets': [{'index': 1, 'url': 'https://media.example/signed?token=secret'}]}]})
        self.assertNotIn('secret', json.dumps(value))
        self.assertNotIn('account', value)

    def test_provider_refusal_is_sanitized(self):
        out = io.StringIO()
        with patch.object(sys, 'argv', ['research.py', 'fetch', 'https://www.instagram.com/reel/demo/']), \
             patch.object(research, 'load_config', return_value={}), \
             patch.object(research, 'private_root', return_value=Path('/unused')), \
             patch.object(research, 'fetch', side_effect=research.Refused('signed secret must not print')), \
             contextlib.redirect_stderr(out):
            result = research.main()
        self.assertEqual(result, 1)
        self.assertNotIn('secret', out.getvalue())
        self.assertIn('error', json.loads(out.getvalue()))


if __name__ == '__main__':
    unittest.main()
