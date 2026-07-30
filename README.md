# TJ - AI Virtual Musician Official Website

TJのオフィシャルWebサイトです。最先端AIから生まれたバーチャルシンガーTJの音楽とアートワールドを体験できます。

## 🔧 ローカル開発環境のセットアップ

### 必要な環境
- モダンなWebブラウザ（Chrome, Firefox, Safari, Edge）
- ローカルサーバー（推奨: Live Server）

### 起動手順

#### 1. Visual Studio Code + Live Server（推奨）
```bash
# VS Codeで本プロジェクトフォルダを開く
code .

# Live Server拡張機能をインストール（未インストールの場合）
# 右クリック → "Open with Live Server"
```

#### 2. Python簡易サーバー
```bash
# Python 3.x
python -m http.server 8000

# Python 2.x
python -m SimpleHTTPServer 8000

# ブラウザで http://localhost:8000 にアクセス
```

#### 3. Node.js http-server
```bash
# http-serverをグローバルインストール
npm install -g http-server

# サーバー起動
http-server

# ブラウザで表示されるURLにアクセス
```

## 🖼 画像ファイルの差し替え方法

`assets/` フォルダ内の画像ファイルを差し替えてください：

```
assets/
├── tj-hero.png          # メインビジュアル（推奨サイズ: 1920x1080px）
├── og.jpg              # OGP画像（推奨サイズ: 1200x630px）
├── album-dive-drive.jpg # アルバムジャケット（推奨サイズ: 500x500px）
└── placeholder-album.png # アルバム画像読み込み失敗時の代替画像
```

### 推奨画像仕様
- **メインビジュアル**: 1920x1080px、JPEG/PNG、最大1MB
- **OGP画像**: 1200x630px、JPEG、最大300KB
- **アルバムジャケット**: 500x500px（正方形）、JPEG/PNG、最大200KB

## 🆕 新しいアルバムの追加方法

`script.js` の `albumData` 配列に新しいオブジェクトを追加するだけです：

```javascript
const albumData = [
    {
        // 配信前のアルバム: presave だけを置き、badge / trackCount で
        // 「Coming Soon」バッジと曲数を出す
        id: 3,
        title: "魚歌 - UO-UTA -",
        releaseDate: "2026年 近日配信",
        coverImage: "image/uo-uta-cover.jpg",
        badge: "Coming Soon",
        trackCount: 19,
        streamingLinks: {
            presave: "https://distrokid.com/hyperfollow/5a42201/---uo-uta--"
        }
    },
    {
        // 配信済みのアルバム
        id: 2,
        title: "Certification Symphony",
        releaseDate: "2025年6月25日",
        coverImage: "image/Certification Symphony-cover.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/intl-ja/album/2sdUIAIK77Ssz9KQdXlGLN",
            appleMusic: "https://music.apple.com/jp/album/certification-symphony/1822452513",
            amazonMusic: "https://music.amazon.co.jp/albums/B0FF4LTJ9Y",
            sunoAI: "https://suno.com/playlist/888888c4-2fab-47dd-ad43-11410c0ea1eb"
        }
    }
];
```

### 新アルバム追加の手順
1. `image/` フォルダにアルバムジャケット画像を追加（正方形・800px・150KB以下が目安）
2. `script.js` の `albumData` 配列に新しいオブジェクトを追加
3. `index.html` の以下も更新
   - `#album-promo`（Latest / New Album のプロモ枠）
   - `#listen` のアルバムブロック（配信後は Spotify 埋め込みに差し替え）
   - 構造化データ（`application/ld+json`）の `album` 配列
4. `style.css?v=` / `script.js?v=` の日付を更新してキャッシュを更新
5. ページをリフレッシュして確認

### 「魚歌 - UO-UTA -」が配信開始したらやること
1. `script.js` の該当アルバムから `badge` を削除し、`releaseDate` を実際の配信日に更新
2. `streamingLinks` の `presave` を `spotify` / `appleMusic` / `amazonMusic` に差し替え
3. `index.html`
   - ヒーローの「「魚歌」をプリセーブ」ボタンを Spotify/Apple のアルバムリンクに変更
   - `#album-promo` のプリセーブCTAを各サービスの「聴く」ボタンに変更、`Coming Soon` リボンを削除
   - `#listen` の収録曲リストの下に Spotify 埋め込み iframe を追加
   - 構造化データに `datePublished` を追加
4. `sitemap.xml` の `lastmod` を更新

## 🌊 ヒーロー演出（three.js + WebGPU）

ヒーローの光の粒・水面のコースティクス・光の柱は `hero-gpu.js` が描いています。

- **描画**: three.js `WebGPURenderer`。WebGPU対応ブラウザではGPUコンピュートシェーダでパーティクルを実際に流体的に動かし、非対応ブラウザでは自動的にWebGL2にフォールバック（この場合は頂点シェーダ内の解析的な動きに切り替わり、見た目はほぼ同じ）
- **three.js本体**: `vendor/three.webgpu.min.js` + `vendor/three.core.min.js`（v0.185.1・MITライセンス・自前ホスト）。CDNに依存しない。バージョンを上げるときは `npm pack three` で取り出した `build/` の2ファイルを差し替える
- **読み込み**: `script.js` の `initHeroVisual()` が初回描画後（`requestIdleCallback`）に動的importする。ファーストビューの表示速度には影響しない
- **段階的フォールバック**: WebGPU → WebGL2 → 動画ヒーロー（`image/tj-hero-loop.mp4`）→ 静止画。GPUが遅い端末では粒の数を自動的に半減させ、それでも重い場合は動画に切り替える
- **省電力**: ヒーローが画面外・タブが非アクティブのときは描画を停止。`prefers-reduced-motion` や通信量セーバー時はGPU演出も動画も読み込まない

### デバッグ用URLパラメータ
| パラメータ | 効果 |
|---|---|
| `?gl=1` | WebGPUを使わずWebGL2フォールバックを強制（見た目の確認用） |
| `?gpuhero=off` | GPU演出を止めて従来の動画ヒーローにする |

ブラウザのコンソールでは `window.TJHero` から `backend`（webgpu / webgl2）・`count`（粒の数）・`pulse()`（ソナー波を手動発射）が確認できます。

## 📤 デプロイ方法

### GitHub Pages
```bash
# 1. GitHubリポジトリにプッシュ
git add .
git commit -m "Add TJ official website"
git push origin main

# 2. GitHub Pages設定
# リポジトリ設定 → Pages → Source: Deploy from a branch
# Branch: main / (root) を選択
```

### Vercel
```bash
# 1. Vercel CLIインストール
npm i -g vercel

# 2. デプロイ
vercel

# または、GitHubリポジトリをVercelに接続してワンクリックデプロイ
```

### Netlify
```bash
# 1. ビルドフォルダを作成（不要だが、念のため）
mkdir dist
cp -r * dist/

# 2. Netlify CLIでデプロイ
npx netlify-cli deploy --prod --dir .
```

## 🎨 カスタマイズ

### カラーテーマの変更
`style.css` の CSS変数を編集：
```css
:root {
    --color-white: #FFFFFF;
    --color-accent: #4F7CFF;  /* メインカラー */
    --color-dark: #101010;
    --color-gray: #666666;
    --color-light-gray: #F8F9FA;
}
```

### フォントの変更
Google Fontsの読み込み部分とCSS変数を編集：
```css
:root {
    --font-primary: 'Poppins', sans-serif;
    --font-japanese: 'Noto Sans JP', sans-serif;
}
```

## 📱 レスポンシブ対応

- **モバイル**: 360px〜767px
- **タブレット**: 768px〜1199px  
- **デスクトップ**: 1200px〜

## 🔍 SEO対策

- OGPメタタグ完備
- Twitter Card対応
- 構造化データ準備済み
- レスポンシブ対応
- パフォーマンス最適化済み

## 📞 サポート

技術的な質問やカスタマイズのご相談は、開発チームまでお気軽にお問い合わせください。

---

**© 2025 TJ Project / AquaBit LAB**