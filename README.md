# NextEngine価格更新システム

田中貴金属の価格情報に基づいてNextEngineの金製品価格を自動更新するVercel完全自動化システム

## 🚀 特徴

- **完全自動化**: ローカルPC不要、Vercel上で完結
- **72時間ルール対応**: 12時間ごとのキープアライブでトークン維持
- **自動価格更新**: 平日10:00 JST に自動実行
- **管理画面**: システム状態を一目で確認可能
- **ログ機能**: 実行履歴・エラー追跡

## 📦 技術スタック

- **Framework**: Next.js 15 + TypeScript
- **Database**: PostgreSQL + Prisma
- **Deployment**: Vercel
- **Scheduling**: Vercel Cron
- **Styling**: Tailwind CSS

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数設定

`.env.local`ファイルを作成：

```env
NE_CLIENT_ID=your_nextengine_client_id
NE_CLIENT_SECRET=your_nextengine_client_secret
DATABASE_URL=postgresql://username:password@hostname:port/database
BASE_URL=https://your-app-name.vercel.app
CRON_SECRET=your_random_secret_string
```

### 3. データベースセットアップ

```bash
npx prisma generate
npx prisma db push
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## 🚀 Vercelデプロイ

### 1. Vercelプロジェクト作成

```bash
npm install -g vercel
vercel
```

### 2. 環境変数設定

Vercel Dashboard → Settings → Environment Variables で以下を設定：

- `NE_CLIENT_ID`
- `NE_CLIENT_SECRET`
- `DATABASE_URL`
- `BASE_URL`
- `CRON_SECRET`

### 3. データベースマイグレーション

```bash
vercel env pull .env.local
npx prisma generate
npx prisma db push
```

## 🔐 認証設定

### 1. NextEngine Developer Console

1. https://base.next-engine.org にアクセス
2. アプリケーション登録
3. リダイレクトURI: `https://your-app-name.vercel.app/api/nextengine/callback`
4. Client ID & Secret を取得

### 2. 初回認証

1. デプロイ後、アプリにアクセス
2. 「認証開始」ボタンをクリック
3. NextEngineで認証許可
4. コールバックでトークンが自動保存される

## ⏰ 自動実行スケジュール

### キープアライブ (12時間ごと)
```
0 */12 * * *  # 00:00, 12:00 UTC
```

### 価格更新 (平日10:00 JST)
```  
0 1 * * 1-5   # 平日01:00 UTC = 10:00 JST
```

## 🎯 更新対象商品

以下の条件を満たす商品のみ更新：
- 商品名が「【新品】」または「【新品仕上げ】」で始まる
- 商品名に「K18」を含む

## 📊 API エンドポイント

- `GET /api/nextengine/auth` - OAuth認証開始
- `GET /api/nextengine/callback` - OAuth認証コールバック
- `GET /api/nextengine/keepalive` - キープアライブ実行
- `GET /api/nextengine/price-update` - 価格更新実行

## 🔍 監視・運用

### システム状態確認
- 管理画面: `https://your-app-name.vercel.app`
- ヘルスチェック: `/api/nextengine/callback?health=1`

### ログ確認
- Vercel Dashboard → Functions → Logs
- データベース: `execution_logs`, `keepalive_logs`テーブル

### 手動実行
緊急時は管理画面から手動実行可能

## 🚨 トラブルシューティング

### トークンエラー
1. `/api/nextengine/keepalive` で状態確認
2. エラーの場合は再認証: `/api/nextengine/auth`

### 価格更新失敗
1. 実行ログ確認
2. 営業日・価格変動チェック
3. NextEngine API制限確認

## 📝 運用ノート

- **72時間ルール**: API呼び出しが72時間途切れるとトークン失効
- **営業日判定**: 土日祝日は自動スキップ
- **価格変動閾値**: 軽微な変動でも更新実行
- **10円切り上げ**: 計算後価格は10円単位で切り上げ

## 🔄 従来システムからの移行

1. launchdサービス停止: `launchctl unload ~/Library/LaunchAgents/com.goldprice.nextengine.plist`
2. Pythonキープアライブ停止
3. Vercelシステムで認証・動作確認
4. 旧システム削除

## 📞 サポート

システムに問題が発生した場合：
1. Vercel Function Logsを確認
2. データベースログテーブルを確認
3. 必要に応じて手動認証・実行を実施