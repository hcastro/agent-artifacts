"""Standalone read-only Instagram queries, adapted from Juniper. Never emits credentials."""
import contextlib
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import ssl
import sys
import time
from html.parser import HTMLParser
from urllib.parse import urlencode, urlsplit

QUERY = 'PolarisProfileSavedTabContentQuery'
OPERATION = QUERY + '_instagramRelayOperation'
INSTAGRAM = 'https://www.instagram.com'
STATIC_HOST = 'static.cdninstagram.com'
USER_AGENT = 'Mozilla/5.0'
MAX_HTML = 12 * 1024 * 1024
MAX_SCRIPT = 6 * 1024 * 1024
MAX_JSON = 4 * 1024 * 1024
MAX_TOTAL = 48 * 1024 * 1024


class Refused(Exception):
    pass


class ReadFailure(Exception):
    def __init__(self, code):
        self.code = code


def error_code(error):
    if isinstance(error, ReadFailure) and error.code in ('instagram_sign_in_required', 'instagram_retry_later'):
        return error.code
    if isinstance(error, (TimeoutError, ConnectionError, socket.gaierror)):
        return 'instagram_retry_later'
    return 'instagram_read_unavailable'


def require(condition):
    if not condition:
        raise Refused('Instagram saved collection read could not be verified')


def bounded(value, maximum, pattern=None):
    require(isinstance(value, str) and 0 < len(value) <= maximum and not any(ord(c) < 32 or ord(c) == 127 for c in value))
    if pattern:
        require(re.fullmatch(pattern, value) is not None)
    return value


def static_url(value):
    parts = urlsplit(bounded(value, 2048))
    require(parts.scheme == 'https' and parts.hostname == STATIC_HOST and not parts.username and not parts.password and not parts.port and not parts.fragment)
    require(parts.path.startswith('/') and ('.js' in parts.path or parts.path.startswith('/rsrc.php/')))
    return value


def validate_request(value):
    require(isinstance(value, dict))
    allowed = {'operation', 'username', 'accountId', 'dataRoot', 'profile', 'limit', 'cursor', 'collectionId', 'discovery', 'code', 'browser'}
    require(set(value) <= allowed and value.get('operation') in ('list', 'read', 'post'))
    bounded(value.get('username'), 30, r'[A-Za-z0-9_][A-Za-z0-9_.]{0,29}')
    bounded(value.get('accountId'), 30, r'[0-9]{1,30}')
    require(isinstance(value.get('dataRoot'), str) and os.path.isabs(value['dataRoot']))
    require(isinstance(value.get('profile'), str) and os.path.isabs(value['profile']))
    require(type(value.get('limit')) is int and 1 <= value['limit'] <= 100)
    if value.get('cursor') is not None:
        bounded(value['cursor'], 2048)
    if value['operation'] == 'read':
        bounded(value.get('collectionId'), 40, r'[0-9]{1,40}')
        require(value['limit'] <= 20)
    elif value['operation'] == 'post':
        bounded(value.get('code'), 100, r'[A-Za-z0-9_-]{1,100}')
        require('collectionId' not in value and not value.get('cursor'))
    else:
        require('collectionId' not in value)
    if value.get('discovery') is not None:
        hint = value['discovery']
        require(isinstance(hint, dict) and set(hint) == {'id', 'asset'})
        bounded(hint.get('id'), 30, r'[0-9]{1,30}')
        static_url(hint.get('asset'))
    return value


def profile_path(request):
    profile = Path(request['profile']).expanduser()
    require(profile.is_absolute() and profile.is_dir() and not profile.is_symlink())
    require(profile.resolve(strict=True) == profile)
    require(request.get('browser', 'chrome') in ('chrome', 'chromium', 'brave', 'edge'))
    for name in ('Cookies', 'Network', 'Network/Cookies'):
        path = profile / name
        require(not path.is_symlink())
        if path.exists():
            require(path.resolve(strict=True) == path)
    require(any((profile / name).is_file() for name in ('Cookies', 'Network/Cookies')))
    return str(profile)


def named_data(html, name):
    # Decode only the exact named configuration object, never execute embedded JavaScript.
    matches = list(re.finditer(r'\[\s*"' + re.escape(name) + r'"\s*,\s*\[\s*\]\s*,\s*', html))
    require(1 <= len(matches) <= 8)
    values = []
    for match in matches:
        try:
            value, _ = json.JSONDecoder().raw_decode(html[match.end():match.end() + 16384])
        except (ValueError, TypeError):
            raise Refused('Instagram named configuration is unavailable') from None
        require(isinstance(value, dict))
        values.append(value)
    require(all(value == values[0] for value in values))
    return values[0]


class Bootstraps(HTMLParser):
    def __init__(self):
        super().__init__()
        self.payloads = []
        self.parts = None

    def handle_starttag(self, tag, attrs):
        if tag != 'script':
            return
        attributes = dict(attrs)
        if attributes.get('type', '').lower() == 'application/json' and 'data-sjs' in attributes and not attributes.get('src'):
            self.parts = []

    def handle_data(self, data):
        if self.parts is not None:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.parts is not None:
            self.payloads.append(''.join(self.parts))
            self.parts = None
            require(len(self.payloads) <= 128)


def saved_identity(html, username, account_id):
    require(isinstance(html, str) and len(html) <= MAX_HTML)
    parser = Bootstraps()
    parser.feed(html)
    marker = r'\[\s*"PolarisViewer"\s*,\s*\[\s*\]\s*,'
    active = [payload for payload in parser.payloads if re.search(marker, payload)]
    require(len(active) == 1 and len(re.findall(marker, active[0])) == 1)
    # Tokens belong to the same server bootstrap as the checked viewer. Later hydration
    # scripts may rotate them and must not override or supply this bootstrap's pair.
    payload = active[0]
    viewer = named_data(payload, 'PolarisViewer').get('data')
    require(isinstance(viewer, dict) and str(viewer.get('id')) == account_id and str(viewer.get('username', '')).casefold() == username.casefold())
    dtsg = bounded(named_data(payload, 'DTSGInitialData').get('token'), 4096)
    lsd = bounded(named_data(payload, 'LSD').get('token'), 4096)
    return dtsg, lsd


def module_body(script, name):
    start = re.search(r'__d\("' + re.escape(name) + r'",', script)
    require(start is not None)
    end = script.find('__d("', start.end())
    return script[start.start():end if end >= 0 else len(script)]


def query_id(script):
    require(isinstance(script, str) and len(script) <= MAX_SCRIPT)
    relay = module_body(script, OPERATION)
    exports = re.findall(r'\b[A-Za-z_$][\w$]*\.exports\s*=\s*"([0-9]{1,30})"', relay)
    require(len(exports) == 1)
    graph = module_body(script, QUERY + '.graphql')
    require(re.search(r'\bname\s*:\s*"' + QUERY + r'"', graph) is not None)
    require(re.search(r'\boperationKind\s*:\s*"query"', graph) is not None)
    require(re.search(r'\boperationKind\s*:\s*"mutation"', graph) is None)
    require(re.search(r'\bid\s*:\s*[A-Za-z_$][\w$]*\("' + OPERATION + r'"\)', graph) is not None)
    return exports[0]


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        value = attributes.get('src') if tag == 'script' else attributes.get('href') if tag == 'link' and attributes.get('as') == 'script' else None
        if value:
            try:
                value = static_url(value)
            except (Refused, ValueError):
                return
            if value not in self.urls:
                self.urls.append(value)


class Quiet:
    def debug(self, *args, **kwargs): pass
    def info(self, *args, **kwargs): pass
    def warning(self, *args, **kwargs): pass
    def error(self, *args, **kwargs): pass


def public_address(value):
    address = ipaddress.ip_address(value)
    return address.is_global and not any((address.is_private, address.is_reserved, address.is_multicast, address.is_unspecified, address.is_loopback, address.is_link_local, getattr(address, 'is_site_local', False)))


class PinnedHTTPS(http.client.HTTPSConnection):
    def connect(self):
        addresses = socket.getaddrinfo(self.host, 443, type=socket.SOCK_STREAM)
        require(addresses and all(public_address(item[4][0]) for item in addresses))
        self.sock = socket.create_connection((addresses[0][4][0], 443), timeout=self.timeout)
        self.sock = self._context.wrap_socket(self.sock, server_hostname=self.host)


def cookie_identity(cookies, account_id):
    ids = {cookie.value for cookie in cookies if cookie.name == 'ds_user_id' and cookie.domain.lstrip('.') in ('instagram.com', 'www.instagram.com')}
    require(ids == {account_id})
    csrf = {cookie.value for cookie in cookies if cookie.name == 'csrftoken' and cookie.domain.lstrip('.') in ('instagram.com', 'www.instagram.com')}
    require(len(csrf) == 1)
    return bounded(next(iter(csrf)), 2048)


class Session:
    def __init__(self, request):
        profile = profile_path(request)
        with open(os.devnull, 'w') as sink, contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            from yt_dlp.cookies import extract_cookies_from_browser
            self.cookies = extract_cookies_from_browser(request.get('browser', 'chrome'), profile=profile, logger=Quiet())
        self.csrf = cookie_identity(self.cookies, request['accountId'])
        self.deadline = time.monotonic() + 70
        self.total = 0
        self.saved_url = INSTAGRAM + '/' + request['username'] + '/saved/'

    def request(self, url, method='GET', form=None, maximum=MAX_JSON):
        from urllib.request import Request
        parts = urlsplit(url)
        require(parts.scheme == 'https' and parts.hostname in ('www.instagram.com', STATIC_HOST) and not parts.username and not parts.password and not parts.port and not parts.fragment)
        require(time.monotonic() < self.deadline)
        if parts.hostname == STATIC_HOST:
            static_url(url)
            require(method == 'GET' and form is None)
        else:
            allowed_get = url == self.saved_url or re.fullmatch(r'/api/v1/feed/collection/[0-9]{1,40}/posts/', parts.path) is not None or re.fullmatch(r'/api/v1/media/[0-9]{1,80}/info/', parts.path) is not None
            require((method == 'GET' and allowed_get and form is None) or (method == 'POST' and parts.path == '/api/graphql' and not parts.query and isinstance(form, dict)))
            if method == 'POST':
                require(form.get('fb_api_req_friendly_name') == QUERY and set(form) == {'doc_id', 'variables', 'fb_api_req_friendly_name', 'fb_dtsg', 'lsd', '__user', 'av', '__a'})
        headers = {'User-Agent': USER_AGENT, 'Accept': 'application/json' if maximum == MAX_JSON else '*/*', 'Accept-Encoding': 'identity'}
        if parts.hostname == 'www.instagram.com':
            cookie_request = Request(url)
            self.cookies.add_cookie_header(cookie_request)
            cookie = cookie_request.get_header('Cookie')
            if cookie:
                headers['Cookie'] = cookie
            headers['Referer'] = self.saved_url
            headers['X-IG-App-ID'] = '936619743392459'
            if method == 'POST':
                headers.update({'Content-Type': 'application/x-www-form-urlencoded', 'Origin': INSTAGRAM, 'X-IG-App-ID': '936619743392459', 'X-FB-Friendly-Name': QUERY, 'X-FB-LSD': form['lsd'], 'X-CSRFToken': self.csrf})
        body = urlencode(form).encode('utf-8') if form is not None else None
        connection = PinnedHTTPS(parts.hostname, timeout=min(15, max(1, self.deadline - time.monotonic())), context=ssl.create_default_context())
        try:
            connection.request(method, parts.path + ('?' + parts.query if parts.query else ''), body=body, headers=headers)
            response = connection.getresponse()
            if response.status in (401, 403):
                raise ReadFailure('instagram_sign_in_required')
            if response.status in (429, 503):
                raise ReadFailure('instagram_retry_later')
            require(response.status == 200)
            declared = response.getheader('Content-Length')
            require(declared is None or (declared.isdigit() and int(declared) <= maximum))
            raw = response.read(maximum + 1)
            require(len(raw) <= maximum)
            self.total += len(raw)
            require(self.total <= MAX_TOTAL and time.monotonic() < self.deadline)
            require(response.getheader('Content-Encoding', 'identity').lower() in ('identity', ''))
            return raw.decode('utf-8')
        finally:
            connection.close()


def json_response(text):
    if text.startswith('for (;;);'):
        text = text[len('for (;;);'):]
    value = json.loads(text)
    require(isinstance(value, dict) and not value.get('errors') and value.get('status', 'ok') == 'ok')
    return value


def discover(session, html, hint=None):
    parser = Scripts()
    parser.feed(html)
    require(0 < len(parser.urls) <= 24)
    urls = list(parser.urls)
    if hint and hint['asset'] in urls:
        urls.remove(hint['asset'])
        urls.insert(0, hint['asset'])
    for url in urls:
        script = session.request(url, maximum=MAX_SCRIPT)
        if OPERATION not in script or QUERY + '.graphql' not in script:
            continue
        identity = query_id(script)
        return {'id': identity, 'asset': url}
    raise Refused('Instagram read-query metadata is unavailable')


def page_info(value, next_key='end_cursor', more_key='has_next_page'):
    require(isinstance(value, dict) and type(value.get(more_key)) is bool)
    cursor = value.get(next_key)
    if cursor is not None:
        bounded(cursor, 2048)
    require(not value[more_key] or cursor is not None)
    return {'cursor': cursor, 'hasMore': value[more_key]}


def collections_response(value):
    try:
        connection = value['data']['viewer']['collections_unified_with_auto_collections']
        edges = connection['edges']
        require(isinstance(edges, list) and len(edges) <= 200)
        collections = []
        skipped_automatic = 0
        automatic = {'ALL_MEDIA_AUTO_COLLECTION': 'IGAllMediaAutoCollection', 'AUDIO_AUTO_COLLECTION': 'XDTAudioAutoCollection'}
        for edge in edges:
            node = edge['node']
            if node.get('collection_id') in automatic:
                require(node.get('__typename') == automatic[node['collection_id']])
                skipped_automatic += 1
                continue
            identity = bounded(str(node['collection_id']), 40, r'[0-9]{1,40}')
            name = bounded(node['collection_name'], 200)
            count = node['collection_media_count']
            require(count is None or (type(count) is int and 0 <= count <= 10000000))
            kind = bounded(node.get('__typename', 'MEDIA'), 100)
            collections.append({'id': identity, 'name': name, 'mediaCount': count, 'type': kind})
        info = page_info(connection['page_info'])
        info.update(reportedCount=len(edges), skippedAutomatic=skipped_automatic)
        return collections, info
    except (KeyError, TypeError, ValueError):
        raise Refused('Instagram collection response shape changed') from None


def media_assets(media):
    children = media.get('carousel_media', []) if media['media_type'] == 8 else [media]
    reported = media.get('carousel_media_count', len(children) or None) if media['media_type'] == 8 else 1
    require(isinstance(children, list) and len(children) <= 20 and (reported is None or (type(reported) is int and 1 <= reported <= 100)))
    assets = []
    for index, child in enumerate(children, 1):
        require(isinstance(child, dict) and child.get('media_type') in (1, 2))
        kind = 'video' if child['media_type'] == 2 else 'image'
        candidates = child.get('video_versions', []) if kind == 'video' else (child.get('image_versions2') or {}).get('candidates', [])
        require(isinstance(candidates, list) and len(candidates) <= 100)
        candidates = [c for c in candidates if isinstance(c, dict) and type(c.get('width')) is int and type(c.get('height')) is int and c['width'] > 0 and c['height'] > 0]
        if not candidates:
            continue
        candidate = max(candidates, key=lambda c: c['width'] * c['height'])
        url = bounded(candidate.get('url'), 8192)
        parts = urlsplit(url)
        require(parts.scheme == 'https' and not parts.username and not parts.password and not parts.port and not parts.fragment and any(parts.hostname.endswith('.' + domain) for domain in ('cdninstagram.com', 'fbcdn.net')))
        assets.append({'index': index, 'kind': kind, 'url': url})
    return {'assets': assets, 'reportedAssets': reported, 'assetsComplete': len(assets) == reported}


def items_response(value):
    require(value.get('status') == 'ok' and isinstance(value.get('items'), list) and len(value['items']) <= 200)
    items = []
    for entry in value['items']:
        require(isinstance(entry, dict) and isinstance(entry.get('media'), dict))
        media = entry['media']
        code = bounded(media.get('code'), 100, r'[A-Za-z0-9_-]{1,100}')
        media_type = media.get('media_type')
        require(type(media_type) is int and media_type in (1, 2, 8))
        kind = {1: 'image', 2: 'video', 8: 'carousel'}[media_type]
        item = {'code': code, 'kind': kind, 'url': INSTAGRAM + ('/reel/' if kind == 'video' else '/p/') + code + '/'}
        item.update(media_assets(media))
        duration = media.get('video_duration')
        if duration is not None:
            require(type(duration) in (int, float) and 0 <= duration <= 86400)
            item['durationSeconds'] = duration
        creator = (media.get('user') or {}).get('username')
        if creator:
            item['creator'] = bounded(creator, 30, r'[A-Za-z0-9_][A-Za-z0-9_.]{0,29}')
        caption = (media.get('caption') or {}).get('text')
        if isinstance(caption, str):
            item['caption'] = caption[:2000]
        items.append(item)
    info = page_info(value, 'next_max_id', 'more_available')
    if 'num_results' in value:
        require(type(value['num_results']) is int and 0 <= value['num_results'] <= 200)
        info['reportedCount'] = value['num_results']
    return items, info


def run(request, session_factory=Session):
    request = validate_request(request)
    session = session_factory(request)
    saved_url = INSTAGRAM + '/' + request['username'] + '/saved/'
    html = session.request(saved_url, maximum=MAX_HTML)
    dtsg, lsd = saved_identity(html, request['username'], request['accountId'])
    account = {'id': request['accountId'], 'username': request['username']}
    if request['operation'] == 'post':
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        identity = 0
        for character in request['code']:
            identity = identity * 64 + alphabet.index(character)
        require(0 < identity < 10 ** 80)
        payload = json_response(session.request(INSTAGRAM + '/api/v1/media/' + str(identity) + '/info/'))
        require(isinstance(payload.get('items'), list) and len(payload['items']) == 1 and payload['items'][0].get('code') == request['code'])
        items, info = items_response({'status': 'ok', 'items': [{'media': payload['items'][0]}], 'more_available': False})
        return {'account': account, 'items': items, 'pageInfo': info}
    if request['operation'] == 'list':
        discovery = discover(session, html, request.get('discovery'))
        variables = {'first': min(20, request['limit']), 'after': request.get('cursor'), 'collection_types': ['MEDIA']}
        form = {'doc_id': discovery['id'], 'variables': json.dumps(variables, separators=(',', ':')), 'fb_api_req_friendly_name': QUERY, 'fb_dtsg': dtsg, 'lsd': lsd, '__user': '0', 'av': request['accountId'], '__a': '1'}
        payload = json_response(session.request(INSTAGRAM + '/api/graphql', method='POST', form=form))
        collections, info = collections_response(payload)
        return {'account': account, 'collections': collections, 'pageInfo': info, 'discovery': discovery}
    path = INSTAGRAM + '/api/v1/feed/collection/' + request['collectionId'] + '/posts/'
    if request.get('cursor') is not None:
        path += '?' + urlencode({'max_id': request['cursor']})
    items, info = items_response(json_response(session.request(path)))
    return {'account': account, 'items': items, 'pageInfo': info}


def main():
    try:
        raw = sys.stdin.buffer.read(16385)
        require(len(raw) <= 16384)
        value = run(json.loads(raw))
        output = json.dumps(value, ensure_ascii=True, separators=(',', ':'))
        require(len(output) <= 1024 * 1024)
        sys.stdout.write(output)
    except BaseException as error:
        # No exception text can expose page content, tokens, cookie paths or signed media URLs.
        sys.stdout.write(json.dumps({'error': error_code(error)}, separators=(',', ':')))
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
