# 人生の棚卸し年表 (jibun-nenpyo)

自分の歴史と社会のニュースをリンクした美しい年表を作成・閲覧できるWebアプリです。

🔗 **公開URL:** https://kenken6291.github.io/jibun-nenpyo/

---

## 特徴

- 📅 **年表エディタ** — 年・月・出来事・カテゴリ・メモを追加・編集・削除
- 🔢 **年齢自動計算** — 生年月日を入力すると各年の年齢を自動表示
- 📰 **社会ニュースとの連動** — 1950〜2024年の日本の重大ニュースを自動表示
- 💾 **データ永続化** — localStorageに自動保存、JSON入出力対応
- 🌙 **ダーク/ライトモード切替**
- 📱 **レスポンシブ対応** — PC（2カラム）・スマホ（タブ切替）

## 技術スタック

- React 18 + Vite
- Tailwind CSS
- Lucide React（アイコン）
- 完全静的SPA（APIキー・バックエンド不要）

---

## ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/kenken6291/jibun-nenpyo.git
cd jibun-nenpyo

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:5173/jibun-nenpyo/ を開きます。

---

## GitHub Pages へのデプロイ手順

### ① リポジトリを作成する

1. GitHubで新しいリポジトリを作成
   - リポジトリ名: `jibun-nenpyo`
   - Public に設定

### ② GitHub Actions を有効化する

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を `GitHub Actions` に設定（`Deploy from a branch` ではなく）

### ③ コードをプッシュする

```bash
git init
git add .
git commit -m "初回コミット"
git remote add origin https://github.com/kenken6291/jibun-nenpyo.git
git branch -M main
git push -u origin main
```

mainブランチへのpushで自動的にビルド・デプロイが実行されます。

### ④ 公開URLを確認する

デプロイ完了後、以下のURLで公開されます：
```
https://kenken6291.github.io/jibun-nenpyo/
```

---

## ディレクトリ構成

```
jibun-nenpyo/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions自動デプロイ
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.jsx      # ヘッダー（ダークモード・保存ボタン）
│   │   ├── Editor.jsx      # 出来事入力エディタ
│   │   └── Timeline.jsx    # 年表プレビュー
│   ├── data/
│   │   └── historicalEvents.json  # 1950〜2024年の日本の重大ニュース
│   ├── App.jsx             # メインアプリコンポーネント
│   ├── main.jsx            # エントリポイント
│   └── index.css           # Tailwind + カスタムスタイル
├── index.html
├── vite.config.js          # base: '/jibun-nenpyo/' を設定済み
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## データについて

- ユーザーデータはブラウザの `localStorage` に自動保存されます
- サーバーへの送信は一切ありません
- **JSONとして保存** ボタンでバックアップ、**読込** ボタンで復元できます
- 社会ニュースデータ（`historicalEvents.json`）は静的ファイルで、1950〜2024年の日本の政治・経済・文化・流行をカバーしています

---

## ユーザー名の変更

`vite.config.js` の `base` および README の URL をあなたのGitHubユーザー名に合わせて変更してください：

```js
// vite.config.js
base: '/your-username-here/jibun-nenpyo/' を適宜変更
// 例: あなたのユーザー名が "tanaka123" の場合
base: '/jibun-nenpyo/',  // リポジトリ名が同じなのでこのままでOK
```

GitHubユーザー名が `kenken6291` 以外の場合は、公開URLが変わります：
```
https://{あなたのGitHubユーザー名}.github.io/jibun-nenpyo/
```
