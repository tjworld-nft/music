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
        id: 1,
        title: "Dive Drive Collection",
        releaseDate: "2024",
        coverImage: "assets/album-dive-drive.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/intl-ja/album/7e4515POUooa6qcELXusMr",
            appleMusic: "https://music.apple.com/us/album/dive-drive-collection/1821436814",
            sunoAI: "https://suno.ai/playlist/tj-dive-drive-collection"
        }
    },
    // 👇 新しいアルバムを追加
    {
        id: 2,
        title: "Ocean Waves Symphony",
        releaseDate: "2025",
        coverImage: "assets/album-ocean-waves.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/album/your-album-id",
            appleMusic: "https://music.apple.com/album/your-album-id",
            sunoAI: "https://suno.ai/playlist/your-playlist"
        }
    }
];
```

### 新アルバム追加の手順
1. `assets/` フォルダにアルバムジャケット画像を追加
2. `script.js` の `albumData` 配列に新しいオブジェクトを追加
3. ストリーミングサービスのURLを更新
4. ページをリフレッシュして確認

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