#!/usr/bin/env python3
"""index.html の自動生成ブロック（収録曲・生き物ギャラリー・構造化データ・プレーヤー用データ）を作り直す。
マーカー <!-- gen:NAME:start --> 〜 <!-- gen:NAME:end --> の間だけを書き換える（冪等）。"""
import json, re, html
from pathlib import Path

DEV = Path(__file__).resolve().parent
HERE = DEV / 'data'
SITE = DEV.parent
V = '20260927'

base = json.load(open(HERE / 'tracks_base.json'))
wf = json.load(open(HERE / 'waveforms.json'))
tracks_by_no = {t['no']: dict(t, title=title) for title, t in base.items()}

APPLE_IDS = [6796327239, 6796327241, 6796327243, 6796327244, 6796327245, 6796327336, 6796327337, 6796327338, 6796327339,
             6796327340, 6796327341, 6796327343, 6796327345, 6796327346, 6796327347, 6796327348, 6796327350, 6796327351, 6796327352]
ALBUM_APPLE = 'https://music.apple.com/jp/album/%E9%AD%9A%E6%AD%8C-uo-uta/6796327238'

# 生き物・学名・一言（歌詞と「三浦 海の学校」海の生き物図鑑の記述に基づく）
INFO = json.load(open(HERE / 'track_notes.json'))

GALLERY = [  # (track no, file, 和名, 学名)
    (3, 'nijiginpo', 'ニジギンポ', 'Petroscirtes breviceps'),
    (4, 'kokeginpo', 'コケギンポ', 'Neoclinus bryope'),
    (7, 'kurohoshiishimochi', 'クロホシイシモチ', 'Apogon notatus'),
    (8, 'utsubo', 'ウツボ', 'Gymnothorax kidako'),
    (9, 'aoumiushi', 'アオウミウシ', 'Hypselodoris festiva'),
    (9, 'shiroumiushi', 'シロウミウシ', 'Chromodoris orientalis'),
    (11, 'tatsunootoshigo', 'タツノオトシゴ', 'Hippocampus coronatus'),
    (11, 'tatsunoitoko', 'タツノイトコ', 'Hippichthys penicillus'),
    (15, 'hanahaze', 'ハナハゼ', 'Ptereleotris hanae'),
    (16, 'kaeruankou', 'カエルアンコウ', 'Antennarius striatus'),
    (17, 'kingyohanadai', 'キンギョハナダイ', 'Pseudanthias squamipinnis'),
    (18, 'nekozame', 'ネコザメ', 'Heterodontus japonicus'),
    (19, 'otohimeebi', 'オトヒメエビ', 'Stenopus hispidus'),
]

PLAY = '<svg class="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>'
e = html.escape


def mmss(ms):
    s = round(ms / 1000)
    return f'{s // 60}:{s % 60:02d}'


def is_latin(s):
    return not re.search(r'[぀-ヿ一-鿿]', s)


def tracklist():
    out = []
    for no in range(1, 20):
        t = tracks_by_no[no]
        info = INFO[str(no)]
        title = t['title']
        lang = ' lang="en"' if is_latin(title) else ''
        sci = f'<i>{e(info["sci"])}</i>' if info.get('sci') else ''
        out.append(f'''    <li class="tr" data-no="{no}">
      <button class="tr-btn" type="button">
        <span class="tr-no"><span class="vh">試聴 </span>{no:02d}</span>
        <svg class="tr-shell" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="2.6"/></svg>
        <span class="tr-main"><span class="tr-title"{lang}>{e(title)}</span><span class="tr-who">{e(info['c'])}{sci}</span></span>
        <span class="tr-note">{e(info['note'])}</span>
        <span class="tr-time" aria-hidden="true">{mmss(t['dur_ms'])}</span>
        <span class="tr-play" aria-hidden="true">{PLAY}</span>
      </button>
      <div class="tr-more"><div><div class="tr-more-in">
        <div class="tr-wave" aria-hidden="true"></div>
        <div class="tr-full"><a href="https://open.spotify.com/track/{t['spotify']}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-spotify"/></svg>Spotifyでフルで聴く</a><a href="{ALBUM_APPLE}?i={APPLE_IDS[no - 1]}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-apple"/></svg>Apple Music</a></div>
      </div></div></div>
    </li>''')
    return '\n'.join(out)


def gallery():
    from PIL import Image
    out = []
    for no, f, ja, sci in GALLERY:
        w, h = Image.open(SITE / f'image/creatures/{f}.webp').size
        title = tracks_by_no[no]['title']
        out.append(f'''      <figure class="cr" data-no="{no}" style="--ar:{w}/{h}">
        <img src="image/creatures/{f}.webp?v={V}" width="{w}" height="{h}" alt="{e(ja)}の水中写真" loading="lazy" decoding="async" draggable="false">
        <figcaption class="cr-cap"><span class="cr-cap-t"><span class="cr-name">{e(ja)}</span><span class="cr-sci">{e(sci)}</span><span class="cr-song"><b>{no:02d}</b>{e(title)}</span></span>
          <button class="cr-play" type="button" aria-label="{e(title)} を試聴">{PLAY}</button></figcaption>
      </figure>''')
    return '\n'.join(out)


def iso_dur(ms):
    s = round(ms / 1000)
    return f'PT{s // 60}M{s % 60}S'


def jsonld():
    tj = {'@id': 'https://tj-music.com/#tj'}
    recs = []
    for no in range(1, 20):
        t = tracks_by_no[no]
        recs.append({'@type': 'ListItem', 'position': no, 'item': {
            '@type': 'MusicRecording', 'name': t['title'], 'duration': iso_dur(t['dur_ms']), 'byArtist': tj,
            'url': f"https://open.spotify.com/track/{t['spotify']}",
            'audio': {'@type': 'AudioObject', 'contentUrl': f'https://tj-music.com/audio/uo-uta/uouta-{no:02d}.m4a', 'encodingFormat': 'audio/mp4', 'duration': 'PT30S', 'description': '30秒の試聴（サビ）'},
        }})
    graph = [
        {'@type': 'WebSite', '@id': 'https://tj-music.com/#website', 'url': 'https://tj-music.com/', 'name': 'TJ Official', 'inLanguage': 'ja'},
        {'@type': 'MusicGroup', '@id': 'https://tj-music.com/#tj', 'name': 'TJ', 'alternateName': ['ティージェー', 'TJ - ティージェー'],
         'url': 'https://tj-music.com/', 'image': 'https://tj-music.com/image/kv/kv-wide-1600.jpg',
         'description': '最新のAIと人間のクリエイティビティが溶け合って生まれたバーチャルシンガー。海のように自由な発想でジャンルを泳ぎ回る。',
         'genre': ['J-Pop', 'Electronic'],
         'sameAs': ['https://open.spotify.com/artist/15LulfyOQ38iy3H7ce7Ivr', 'https://music.apple.com/jp/artist/%E3%83%86%E3%82%A3%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%BC/1821365578'],
         'album': [{'@id': 'https://tj-music.com/#uo-uta'}, {'@id': 'https://tj-music.com/#certification-symphony'}, {'@id': 'https://tj-music.com/#dive-drive-collection'}]},
        {'@type': 'MusicAlbum', '@id': 'https://tj-music.com/#uo-uta', 'name': '魚歌 - UO-UTA -', 'alternateName': 'UO-UTA', 'byArtist': tj,
         'datePublished': '2026-07-30', 'numTracks': 19, 'image': 'https://tj-music.com/image/covers/uo-uta-960.webp',
         'albumProductionType': 'https://schema.org/StudioAlbum', 'albumReleaseType': 'https://schema.org/AlbumRelease',
         'description': '海の生き物を一匹ずつ主役にした全19曲。TJの3rdアルバム。',
         'url': 'https://tj-music.com/#album',
         'sameAs': ['https://open.spotify.com/album/5G1wIyHQ07ciJe7HjAq37h', ALBUM_APPLE, 'https://music.amazon.co.jp/albums/B0HC7JG413'],
         'track': {'@type': 'ItemList', 'numberOfItems': 19, 'itemListElement': recs}},
        {'@type': 'MusicAlbum', '@id': 'https://tj-music.com/#certification-symphony', 'name': 'Certification Symphony', 'byArtist': tj,
         'datePublished': '2025-06-23', 'numTracks': 14, 'image': 'https://tj-music.com/image/covers/certification-symphony-960.webp',
         'sameAs': ['https://open.spotify.com/album/2sdUIAIK77Ssz9KQdXlGLN', 'https://music.apple.com/jp/album/certification-symphony/1822452513', 'https://music.amazon.co.jp/albums/B0FF4LTJ9Y']},
        {'@type': 'MusicAlbum', '@id': 'https://tj-music.com/#dive-drive-collection', 'name': 'Dive Drive Collection', 'byArtist': tj,
         'datePublished': '2025-06-18', 'numTracks': 14, 'image': 'https://tj-music.com/image/covers/dive-drive-collection-960.webp',
         'sameAs': ['https://open.spotify.com/album/7e4515POUooa6qcELXusMr', 'https://music.apple.com/jp/album/dive-drive-collection/1821436814', 'https://music.amazon.co.jp/albums/B0FDKRHDN8']},
    ]
    return '<script type="application/ld+json">\n' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=1) + '\n</script>'


def trackdata():
    tr = []
    for no in range(1, 20):
        t = tracks_by_no[no]
        tr.append({'no': no, 't': t['title'], 'c': INFO[str(no)]['c'], 'src': f'audio/uo-uta/uouta-{no:02d}.m4a?v={V}',
                   'sp': t['spotify'], 'am': str(APPLE_IDS[no - 1]), 'bars': [round(b, 2) for b in wf[str(no)]['bars']],
                   'env': wf[str(no)]['env']})
    js = json.dumps({'tracks': tr}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return f'<script type="application/json" id="uo-data">{js}</script>'


def inject(src, name, content):
    pat = re.compile(rf'(<!-- gen:{name}:start -->)(.*?)(\s*<!-- gen:{name}:end -->)', re.S)
    assert pat.search(src), name
    return pat.sub(lambda m: m.group(1) + '\n' + content + m.group(3), src, count=1)


from html.parser import HTMLParser
from urllib.parse import quote

MINCHO_CLASSES = {'hero-uo', 'sec-title', 'full-title', 'cr-name', 'about-title', 'about-tag', 'ft-tag', 'page-title', 'ja'}


class Grab(HTMLParser):
    """明朝体（Shippori Mincho B1）で表示する要素の文字だけを集める。"""
    def __init__(self):
        super().__init__(); self.stack = []; self.chars = set(); self.in_page = False

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'img', 'meta', 'link', 'source', 'use', 'path', 'circle', 'input', 'hr'):
            return
        cls = set((dict(attrs).get('class') or '').split())
        mincho = bool(cls & MINCHO_CLASSES) and 'en' not in cls
        if tag == 'main' and 'page' in cls: self.in_page = True
        if self.in_page and tag == 'h2': mincho = True
        if tag == 'b' and self.stack and self.stack[-1][0] == 'marquee': mincho = True
        self.stack.append(('marquee' if 'marquee-track' in cls else tag, mincho))

    def handle_endtag(self, tag):
        if self.stack: self.stack.pop()

    def handle_data(self, data):
        if any(m for _, m in self.stack):
            self.chars.update(ch for ch in data if not ch.isspace())


def fonts(pages):
    g = Grab()
    for pth in pages:
        g.feed((SITE / pth).read_text())
    text = ''.join(sorted(g.chars)) + '0123456789'
    latin = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@500;600;700;800&display=swap'
    mincho = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@600;800&display=swap&text=' + quote(text)
    out = []
    for u in (latin, mincho):
        u = u.replace('&', '&amp;')
        out.append(f'<link rel="preload" as="style" href="{u}" onload="this.onload=null;this.rel=\'stylesheet\'">')
        out.append(f'<noscript><link rel="stylesheet" href="{u}"></noscript>')
    return '\n'.join(out), len(text)


page = (SITE / 'index.html').read_text()
page = inject(page, 'jsonld', jsonld())
page = inject(page, 'tracklist', tracklist())
page = inject(page, 'gallery', gallery())
page = inject(page, 'trackdata', trackdata())
(SITE / 'index.html').write_text(page)

FONT_TAGS, NCH = fonts(['index.html', 'privacy.html', 'contact.html'])
for pth in ('index.html', 'privacy.html', 'contact.html'):
    t = (SITE / pth).read_text()
    (SITE / pth).write_text(inject(t, 'fonts', FONT_TAGS))
page = (SITE / 'index.html').read_text()
print('ok', len(page), 'bytes', 'mincho glyphs:', NCH)
