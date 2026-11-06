#!/usr/bin/env python3
"""Read-only social research CLI. Private config, originals and evidence stay outside the skill."""
import argparse
import bisect
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
from urllib.parse import urljoin, urlsplit
import uuid
sys.dont_write_bytecode = True
from instagram_adapter import Refused

HERE = Path(__file__).resolve().parent
CONFIG = Path.home() / '.config/social-video-research/config.json'
DATA = Path.home() / '.local/share/social-video-research'
MAX_ASSET = 64 * 1024 * 1024
MAX_POST = 256 * 1024 * 1024
MAX_SECONDS = 600

class ResearchError(Exception):
    pass


def require(ok, message):
    if not ok:
        raise ResearchError(message)


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    path.chmod(0o600)


def load_config(path):
    if not path.exists():
        return {}
    require(path.is_file(), 'Config must be a JSON file.')
    require(path.stat().st_mode & 0o077 == 0, 'Config must be private: chmod 600 CONFIG.')
    value = json.loads(path.read_text())
    require(isinstance(value, dict), 'Config must be a JSON object.')
    return value


def private_root(config):
    path = Path(config.get('data_dir', str(DATA))).expanduser()
    require(path.is_absolute(), 'data_dir must be absolute.')
    require(not path.is_symlink(), 'data_dir must not be a symlink.')
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    require(path.stat().st_mode & 0o077 == 0, 'data_dir must be private: chmod 700 DATA_DIR.')
    skill = HERE.parent.resolve()
    require(not path.resolve().is_relative_to(skill), 'Keep research data outside the skill folder.')
    return path.resolve()


def fresh(root, prefix):
    path = root / (prefix + '-' + uuid.uuid4().hex[:12])
    path.mkdir(mode=0o700)
    return path


def execute(command, timeout=120):
    result = subprocess.run(command, capture_output=True, timeout=timeout)
    require(result.returncode == 0, 'Media operation failed; no completed evidence was produced.')
    return result.stdout


def python_bin(config):
    return config.get('python', sys.executable)


def binary(config, name):
    value = config.get(name, name)
    require(shutil.which(value) is not None, f'{name} is missing. Install FFmpeg or configure its executable path.')
    return value


def canonical_url(value):
    parts = urlsplit(value)
    require(parts.scheme == 'https' and not parts.username and not parts.password and not parts.port,
            'Use an HTTPS Instagram post/Reel or TikTok video link.')
    instagram = parts.hostname in ('instagram.com', 'www.instagram.com') and re.fullmatch(r'/(?:p|reel|reels|tv)/[A-Za-z0-9_-]+/?', parts.path)
    tiktok = ((parts.hostname in ('tiktok.com', 'www.tiktok.com') and re.fullmatch(r'/(?:@[^/]+/video/\d+|t/[A-Za-z0-9_-]+)/?', parts.path))
              or (parts.hostname in ('vm.tiktok.com', 'vt.tiktok.com') and re.fullmatch(r'/[A-Za-z0-9_-]+/?', parts.path)))
    require(instagram or tiktok, 'Use a content link, rather than a profile, login or account-action URL.')
    host = 'www.instagram.com' if instagram else parts.hostname
    return 'https://' + host + parts.path.rstrip('/') + '/', bool(instagram)


def instagram(config, operation, **kwargs):
    require(all(config.get(k) for k in ('profile', 'username', 'account_id')),
            'Instagram needs a configured browser profile, expected username and account_id. Read README.md.')
    request = dict(operation=operation, profile=str(Path(config['profile']).expanduser().resolve()),
                   browser=config.get('browser', 'chrome'), username=config['username'],
                   accountId=str(config['account_id']), dataRoot=str(private_root(config)), limit=20, **kwargs)
    result = subprocess.run([python_bin(config), '-I', '-B', str(HERE / 'instagram_adapter.py')],
                            input=json.dumps(request).encode(), capture_output=True, timeout=85)
    try:
        response = json.loads(result.stdout)
    except ValueError:
        raise ResearchError('Instagram adapter failed. Check the Python runtime and yt-dlp installation.') from None
    require(result.returncode == 0 and 'error' not in response,
            'Instagram read unavailable: ' + str(response.get('error', 'unknown')) +
            '. Check the existing session/account. Do not retry repeatedly or claim content was viewed.')
    return response


def probe(config, path, kind):
    value = json.loads(execute([binary(config, 'ffprobe'), '-v', 'error', '-protocol_whitelist', 'file,pipe',
                               '-show_format', '-show_streams', '-of', 'json', str(path)], 30))
    video = next((s for s in value.get('streams', []) if s.get('codec_type') == 'video'), None)
    require(video and video.get('width', 0) > 0 and video.get('height', 0) > 0, 'No decodable image/video stream.')
    duration = video.get('duration') or value.get('format', {}).get('duration')
    seconds = float(duration) if duration is not None else None
    if kind == 'video':
        require(seconds is not None and math.isfinite(seconds) and 0 < seconds <= MAX_SECONDS,
                f'Videos must have a known duration of at most {MAX_SECONDS} seconds.')
    return dict(width=video['width'], height=video['height'], duration_seconds=seconds if kind == 'video' else None,
                video_start_seconds=float(video.get('start_time') or 0),
                has_audio=any(s.get('codec_type') == 'audio' for s in value.get('streams', [])))


def asset_record(config, path, kind, index):
    size = path.stat().st_size
    require(0 < size <= MAX_ASSET, 'Asset is empty or exceeds the 64 MiB limit.')
    metadata = probe(config, path, kind)
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    return dict(index=index, kind=kind, path=path.name, bytes=size, sha256=digest, **metadata)


def download_cdn(url, target, maximum):
    from instagram_adapter import PinnedHTTPS
    for _ in range(4):
        parts = urlsplit(url)
        host = parts.hostname or ''
        require(parts.scheme == 'https' and not parts.username and not parts.password and not parts.port
                and not parts.fragment and any(host.endswith('.' + d) for d in ('cdninstagram.com', 'fbcdn.net')),
                'Instagram supplied an unsupported media destination.')
        conn = PinnedHTTPS(host, timeout=20, context=ssl.create_default_context())
        deadline = time.monotonic() + 90
        try:
            conn.request('GET', parts.path + ('?' + parts.query if parts.query else ''),
                         headers={'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity'})
            response = conn.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader('Location')
                require(bool(location), 'Media redirect has no destination.')
                url = urljoin(url, location)
                continue
            require(response.status == 200, 'Original media is unavailable; its CDN link may have expired.')
            length = response.getheader('Content-Length')
            require(length is None or (length.isdigit() and int(length) <= maximum), 'Media exceeds the download budget.')
            require(response.getheader('Content-Encoding', 'identity').lower() in ('identity', ''), 'Unsupported media encoding.')
            count = 0
            with target.open('xb') as stream:
                while True:
                    chunk = response.read(min(65536, maximum - count + 1))
                    if not chunk:
                        break
                    count += len(chunk)
                    require(count <= maximum and time.monotonic() < deadline, 'Media exceeds the byte/time budget.')
                    stream.write(chunk)
            require(count > 0, 'The original media is empty.')
            return
        finally:
            conn.close()
    raise ResearchError('Too many media redirects.')


def strip_inventory(response):
    value = json.loads(json.dumps(response))
    value.pop('discovery', None)
    value.pop('account', None)
    for item in value.get('items', []):
        for asset in item.get('assets', []):
            asset.pop('url', None)
    return value


def fetch(config, root, url):
    url, is_instagram = canonical_url(url)
    run = fresh(root, 'post')
    try:
        if is_instagram:
            code = urlsplit(url).path.rstrip('/').split('/')[-1]
            response = instagram(config, 'post', code=code)
            item = response['items'][0]
            require(item.get('assetsComplete') is True, 'Instagram did not return all original slides; no complete post was saved.')
            assets = []
            remaining = MAX_POST
            for entry in item['assets']:
                kind = entry['kind']
                path = run / f"asset-{entry['index']:02d}.{'mp4' if kind == 'video' else 'image'}"
                download_cdn(entry['url'], path, min(MAX_ASSET, remaining))
                record = asset_record(config, path, kind, entry['index'])
                assets.append(record)
                remaining -= record['bytes']
            source = {k: item[k] for k in ('url', 'creator', 'caption', 'kind') if k in item}
        else:
            target = run / 'asset-01.mp4'
            command = [python_bin(config), '-m', 'yt_dlp', '--ignore-config', '--no-plugin-dirs', '--no-cache-dir',
                       '--no-playlist', '--playlist-items', '1', '--no-progress', '--no-warnings', '--quiet',
                       '--socket-timeout', '15', '--retries', '0', '--fragment-retries', '0', '--extractor-retries', '0',
                       '--max-filesize', str(MAX_ASSET), '--match-filter', 'duration <= 600',
                       '--format', 'best[protocol=https][ext=mp4]', '--print-json', '--no-simulate', '--output', str(target)]
            if config.get('profile'):
                command += ['--cookies-from-browser', config.get('browser', 'chrome') + ':' + config['profile']]
            raw = execute(command + ['--', url], 120)
            require(target.is_file(), 'No downloadable video within the limits was returned.')
            lines = [json.loads(line) for line in raw.splitlines() if line.strip().startswith(b'{')]
            meta = lines[-1] if lines else {}
            assets = [asset_record(config, target, 'video', 1)]
            source = dict(url=url, creator=str(meta.get('uploader') or '')[:120],
                          caption=str(meta.get('description') or '')[:4000], kind='video',
                          coverage_note='First downloadable clip only; other post assets were not enumerated.')
        manifest = dict(schema=1, acquired_at=datetime.now(timezone.utc).isoformat(), source=source,
                        assets=assets, evidence_note='Originals acquired. No visual frames or speech have been inspected yet.')
        dump(run / 'manifest.json', manifest)
        return dict(manifest=str(run / 'manifest.json'), assets=len(assets), source_url=url,
                    note='Acquired originals; use inspect, view the images, and transcribe speech where relevant.')
    except BaseException:
        shutil.rmtree(run)
        raise


def load_asset(root, manifest_path, index):
    manifest_path = Path(manifest_path).expanduser().resolve(strict=True)
    require(manifest_path.is_relative_to(root), 'Use a manifest inside the configured private data directory.')
    manifest = json.loads(manifest_path.read_text())
    require(manifest.get('schema') == 1, 'Unsupported manifest schema.')
    asset = next((a for a in manifest['assets'] if a['index'] == index), None)
    require(asset is not None, 'Asset index is absent from this post.')
    path = (manifest_path.parent / asset['path']).resolve(strict=True)
    require(path.is_relative_to(manifest_path.parent) and path.is_file(), 'Original path escaped its post directory.')
    with path.open('rb') as stream:
        require(hashlib.file_digest(stream, 'sha256').hexdigest() == asset['sha256'], 'Original checksum changed; do not reuse this evidence.')
    return manifest_path, manifest, asset, path


def inspect(config, root, args):
    manifest_path, manifest, asset, path = load_asset(root, args.manifest, args.asset)
    require(1 <= args.frames <= 32, 'Inspect 1–32 positions per call; split longer ranges.')
    start, end = args.start, args.end
    if asset['kind'] == 'video':
        duration = asset['duration_seconds']
        end = duration if end is None else end
        require(math.isfinite(start) and math.isfinite(end) and 0 <= start < end <= duration, 'Choose a range inside the original duration.')
        packets = json.loads(execute([binary(config, 'ffprobe'), '-v', 'error', '-protocol_whitelist', 'file,pipe',
                     '-select_streams', 'v:0', '-show_packets', '-show_entries', 'packet=pts_time',
                     '-of', 'json', str(path)], 40))
        origin = asset.get('video_start_seconds', 0)
        times = sorted({float(packet['pts_time']) - origin for packet in packets.get('packets', [])
                        if 'pts_time' in packet and math.isfinite(float(packet['pts_time']))})
        require(times, 'Video has no usable presentation timestamps.')
        requested = [start + (end - start) * (i + 0.5) / args.frames for i in range(args.frames)]
        positions = []
        for target in requested:
            index = max(0, bisect.bisect_right(times, target) - 1)
            if times[index] not in positions:
                positions.append(times[index])
    else:
        require(start == 0 and end is None, 'Time ranges only apply to video assets.')
        positions = [None]
    filters = []
    if args.crop:
        x, y, w, h = args.crop
        require(x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= asset['width'] and y + h <= asset['height'],
                'Crop must fit inside the original pixel dimensions.')
        filters.append(f'crop={w}:{h}:{x}:{y}')
    filters.append('scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2')
    out = fresh(manifest_path.parent, 'inspection')
    try:
        images = []
        for i, position in enumerate(positions):
            target = out / f'frame-{i + 1:02d}.jpg'
            cmd = [binary(config, 'ffmpeg'), '-nostdin', '-v', 'info', '-copyts', '-protocol_whitelist', 'file,pipe']
            if position is not None:
                cmd += ['-ss', f'{max(0, position - 0.00001):.6f}']
            rendered = subprocess.run(cmd + ['-i', str(path), '-frames:v', '1', '-vf', 'showinfo,' + ','.join(filters),
                                               '-fps_mode', 'passthrough', '-q:v', '2', str(target)], capture_output=True, timeout=40)
            require(rendered.returncode == 0 and target.is_file() and target.stat().st_size > 0,
                    'No image was produced at the selected presentation timestamp.')
            decoded = re.search(rb'\bn:\s*0\s+pts:.*?pts_time:([0-9.eE+-]+)', rendered.stderr)
            actual = float(decoded[1]) - asset.get('video_start_seconds', 0) if decoded and position is not None else None
            require(position is None or actual is not None, 'Could not verify the decoded frame timestamp.')
            images.append(dict(path=str(target), original_seconds=actual, selected_seconds=position, asset_index=asset['index']))
        value = dict(source_url=manifest['source'].get('url'), manifest=str(manifest_path), images=images,
                     requested_range=[start, end], crop=args.crop, note='Prepared sampled pixels. Read these files with view_image before making visual claims.')
        dump(out / 'evidence.json', value)
        return value
    except BaseException:
        shutil.rmtree(out)
        raise


def transcribe(config, root, args):
    manifest_path, manifest, asset, path = load_asset(root, args.manifest, args.asset)
    require(asset['kind'] == 'video' and asset['has_audio'], 'This asset has no audio track to transcribe.')
    duration = asset['duration_seconds']
    end = duration if args.end is None else args.end
    require(math.isfinite(args.start) and math.isfinite(end) and 0 <= args.start < end <= duration, 'Choose an audio range inside the original duration.')
    speech = config.get('speech', {})
    require(speech.get('python') and speech.get('model'), 'Configure speech.python and a local MLX Whisper speech.model in config.json.')
    model = Path(speech['model']).expanduser().resolve(strict=True)
    require(model.is_dir() and (model / 'config.json').is_file() and any(model.glob('*.npz')), 'A local MLX Whisper model directory with config.json and weights is required.')
    out = fresh(manifest_path.parent, 'speech')
    try:
        audio = out / 'audio.wav'
        execute([binary(config, 'ffmpeg'), '-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe',
                 '-ss', str(args.start), '-i', str(path), '-t', str(end - args.start), '-vn', '-ac', '1', '-ar', '16000', str(audio)], 60)
        cmd = [speech['python'], '-I', '-B', str(HERE / 'transcribe_local.py'), str(audio), str(model), str(out / 'transcript.json'), '--offset', str(args.start)]
        if args.language != 'auto':
            cmd += ['--language', args.language]
        execute(cmd, 600)
        value = json.loads((out / 'transcript.json').read_text())
        audio.unlink()
        value.update(source_url=manifest['source'].get('url'), asset_index=args.asset, start_seconds=args.start,
                     end_seconds=end, original_sha256=asset['sha256'])
        dump(out / 'transcript.json', value)
        return dict(transcript=str(out / 'transcript.json'), segments=len(value['segments']),
                    start_seconds=args.start, end_seconds=end, note='Speech recognition is fallible; read the full saved text and uncertainty flags.')
    except BaseException:
        shutil.rmtree(out)
        raise


def import_local(config, root, args):
    source = Path(args.file).expanduser().resolve(strict=True)
    require(source.is_file() and 0 < source.stat().st_size <= MAX_ASSET, 'Import a nonempty local media file up to 64 MiB.')
    out = fresh(root, 'local')
    try:
        kind = args.kind
        target = out / ('asset-01' + source.suffix)
        shutil.copyfile(source, target)
        record = asset_record(config, target, kind, 1)
        dump(out / 'manifest.json', dict(schema=1, acquired_at=datetime.now(timezone.utc).isoformat(),
             source=dict(kind=kind, provenance='User-supplied local file; platform identity not verified.'), assets=[record]))
        return dict(manifest=str(out / 'manifest.json'), assets=1)
    except BaseException:
        shutil.rmtree(out)
        raise


def doctor(config):
    python = python_bin(config)
    try:
        yt = subprocess.run([python, '-I', '-c', 'import yt_dlp'], capture_output=True, timeout=15).returncode == 0
    except (OSError, subprocess.SubprocessError):
        yt = False
    profile = Path(config.get('profile', '/nonexistent')).expanduser()
    speech = config.get('speech', {})
    return dict(python_with_yt_dlp=yt, ffmpeg=shutil.which(config.get('ffmpeg', 'ffmpeg')) is not None,
                ffprobe=shutil.which(config.get('ffprobe', 'ffprobe')) is not None,
                instagram_identity_configured=bool(config.get('username') and config.get('account_id')),
                browser_cookie_store_present=any((profile / p).is_file() for p in ('Cookies', 'Network/Cookies')),
                speech_configured=bool(speech.get('python') and speech.get('model')),
                note='Setup checks do not verify the account session. Use collections or a requested post to test live access.')


def main():
    os.umask(0o077)
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config', type=Path, default=Path(os.environ.get('SOCIAL_RESEARCH_CONFIG', str(CONFIG))))
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('doctor')
    for name in ('collections', 'collection'):
        s = sub.add_parser(name)
        s.add_argument('--cursor')
        if name == 'collection':
            s.add_argument('id')
    s = sub.add_parser('fetch'); s.add_argument('url')
    s = sub.add_parser('import'); s.add_argument('file'); s.add_argument('--kind', choices=['video', 'image'], required=True)
    for name in ('inspect', 'transcribe'):
        s = sub.add_parser(name); s.add_argument('manifest'); s.add_argument('--asset', type=int, default=1)
        s.add_argument('--start', type=float, default=0); s.add_argument('--end', type=float)
        if name == 'inspect':
            s.add_argument('--frames', type=int, default=8); s.add_argument('--crop', type=int, nargs=4, metavar=('X', 'Y', 'W', 'H'))
        else:
            s.add_argument('--language', choices=['auto', 'en', 'es'], default='auto')
    args = p.parse_args()
    try:
        config = load_config(args.config.expanduser())
        if args.command == 'doctor':
            result = doctor(config)
        else:
            root = private_root(config)
            if args.command in ('collections', 'collection'):
                kwargs = {'cursor': args.cursor} if args.cursor else {}
                if args.command == 'collection':
                    kwargs['collectionId'] = args.id
                response = strip_inventory(instagram(config, 'list' if args.command == 'collections' else 'read', **kwargs))
                directory = fresh(root, 'inventory')
                dump(directory / 'inventory.json', response)
                result = dict(inventory=str(directory / 'inventory.json'), **response)
            elif args.command == 'fetch':
                result = fetch(config, root, args.url)
            elif args.command == 'import':
                result = import_local(config, root, args)
            elif args.command == 'inspect':
                result = inspect(config, root, args)
            else:
                result = transcribe(config, root, args)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ResearchError, Refused, ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError) as error:
        message = str(error) if isinstance(error, ResearchError) else 'Operation failed. Check local setup and inputs; no complete result is claimed.'
        print(json.dumps({'error': message}), file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
