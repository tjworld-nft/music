# TJ（ティージェー）Official — tj-music.com

AIバーチャルシンガー TJ の公式サイト。静的HTML（ビルド不要）。`main` に push すると GitHub Actions が Xserver へ FTP で反映する（`.github/workflows/deploy.yml`、`_dev/` はアップロードしない）。

## 構成（2026-09-27「魚歌」リリース版）

| パス | 役割 |
|---|---|
| `index.html` | トップ（1ページ）。`<!-- gen:NAME:start/end -->` の間は `_dev/build.py` が生成するので手で書かない |
| `css/site.css` | 全ページ共通のデザイン（トークンは `:root`） |
| `js/main.js` | 試聴プレーヤー・メニュー・スクロール演出・Spotify/Apple埋め込み（押したときだけ読み込む） |
| `js/ocean.js` | WebGL2の海（ヒーロー絵の2.5D視差・屈折・コースティクス・光の柱・マリンスノー・波紋）。**音に合わせて揺れる** |
| `audio/uo-uta/uouta-NN.m4a` | 『魚歌』各曲のサビ30秒（AAC 160k・−14 LUFS）。`env.json` は30fpsの帯域エンベロープ（演出用） |
| `image/kv/` | キービジュアル（横＝PC／縦＝スマホ）と奥行きマップ |
| `image/covers/` | 3作のジャケット（Apple Musicの配信アートワークから作成） |
| `image/creatures/` | 生き物写真（三浦 海の学校「海の生き物図鑑」より） |
| `_dev/` | 生成スクリプトとデータ（本番には上げない） |

## よくある更新

### 収録曲の一言・生き物名を直す
`_dev/data/track_notes.json` を直して、

```bash
python3 _dev/build.py
```

収録曲リスト・生き物ギャラリー・構造化データ（JSON-LD）・プレーヤー用データ・明朝体フォントの文字サブセットが作り直される（何度実行しても同じ結果）。

### ローカルで確認（音声のシークに Range 対応が要るので付属サーバーを使う）

```bash
python3 _dev/serve.py . 8987
```

→ http://localhost:8987/ 。`?gl=off` で WebGL の海を止めた状態を確認できる。

### CSS/JS/画像を変えたら
サーバーは画像・音声を30日、CSS/JSを7日キャッシュする（`.htaccess`）。変更したファイルを参照している箇所の `?v=YYYYMMDD` を上げること。

## 一時ファイル（2026-10-31 以降に削除してよい）

`style.css` / `script.js` / `preload.js` はリニューアル前のページがブラウザのキャッシュに残っていた人向けの橋渡し（旧ページで読まれると最新ページを読み直す）。旧サイトはHTMLにキャッシュ指定が無く、最大で数日キャッシュされるため。

## 実装メモ

- **フォント**: 英字は Instrument Serif / Manrope、見出しの和文は Shippori Mincho B1（`text=` で使っている字だけを配信）、本文の和文は端末のフォント（ヒラギノ／Noto）。いずれも非ブロッキング読み込み。
- **WebGLの海**: ページ読み込み後に遅延起動。`failIfMajorPerformanceCaveat` とレンダラー名でソフトウェア描画（GPUなし）を検出したら起動しない。フレーム時間を見て解像度を自動で下げ、画面外・無音のときは30fps、タブが裏なら停止。`prefers-reduced-motion`・省データ設定では読み込まない。
- **試聴と演出の同期**: 音声を Web Audio に通さず、事前計算した `env.json`（低域・中域・高域・アタック）を再生位置で引いている。iPhoneのマナーモードでも音が止まらない。
- **Lighthouse（2026-09-27・ローカル）**: モバイル 89 / 100 / 100 / 100、デスクトップ 99 / 100 / 100 / 100。

© 2025–2026 TJ Project / AquaBit LAB
