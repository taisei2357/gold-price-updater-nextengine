# NextEngine 価格更新制御ガイド

## 🎛️ 価格更新の停止・再開方法

### 1. 管理ページでの操作

**URL:** `https://your-app.vercel.app/admin`

- 現在の状態確認
- 停止・再開の実行
- 環境変数の確認

### 2. Vercel環境変数での直接制御

#### 停止する場合:
```
1. Vercel Dashboard を開く
2. プロジェクトを選択
3. Settings → Environment Variables
4. Add New:
   - Name: PRICE_UPDATE_ENABLED
   - Value: false
   - Environment: Production
5. Save
6. 次回のCron実行時から停止
```

#### 再開する場合:
```
1. Vercel Dashboard を開く
2. Settings → Environment Variables
3. PRICE_UPDATE_ENABLED を削除 または true に変更
4. 次回のCron実行時から再開
```

### 3. APIでの制御

#### 現在の状態確認:
```bash
curl https://your-app.vercel.app/api/nextengine/toggle-update
```

#### 停止:
```bash
curl -X POST https://your-app.vercel.app/api/nextengine/toggle-update \
  -H "Content-Type: application/json" \
  -d '{"action": "stop", "secret": "your-secret-key"}'
```

#### 再開:
```bash
curl -X POST https://your-app.vercel.app/api/nextengine/toggle-update \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "secret": "your-secret-key"}'
```

## 🔒 セキュリティ設定

### シークレットキーの設定:
```
Vercel Environment Variables:
- Name: TOGGLE_SECRET
- Value: your-secret-key-here
- Environment: Production
```

## 📊 実行スケジュール

- **時刻**: JST 10:00 (UTC 01:00)
- **頻度**: 平日のみ（月〜金）
- **祝日**: 自動スキップ
- **Cron**: `0 1 * * 1-5`

## 🏷️ 対象商品

### 金商品:
- `【新品】` + `K18` を含む商品
- `【新品仕上げ中古】` + `K18` を含む商品

### プラチナ商品:
- `【新品】` + `Pt` を含む商品  
- `【新品仕上げ中古】` + `Pt` を含む商品

## 📝 ログ確認

価格更新の実行ログは以下で確認できます:
- Vercel Function Logs
- データベースの `ExecutionLog` テーブル

## ⚠️ 注意事項

1. **環境変数変更**: Vercelでの環境変数変更は次回のデプロイまたはCron実行時に反映
2. **停止確認**: 管理ページまたはAPIで停止状態を確認可能
3. **緊急停止**: 管理ページから即座に状態確認が可能
4. **セキュリティ**: API操作にはシークレットキーが必要