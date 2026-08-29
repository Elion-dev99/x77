# LiveNova — 次世代ライブ配信プラットフォーム

X77Live を超える機能を備えた、本格的なライブ配信サービスです。

**公開URL:** https://livenova.clear-chronometer.workers.dev

## 完成機能一覧

### 視聴者向け
- 年齢確認ゲート（4言語）
- ライブ配信一覧・検索・カテゴリフィルター
- WebRTC 超低遅延視聴
- リアルタイムチャット + 絵文字リアクション + ギフトアニメーション
- フォロー / 配信者プロフィール
- 2ショットリクエスト
- プライベートルーム（パスワード保護）
- プレミアム配信（分課金）
- ポイント購入（ウォレット）
- 通知センター
- ピクチャーインピクチャー
- 通報機能

### 配信者向け
- 配信スタジオ（カメラ/マイク ON/OFF）
- 配信作成（カテゴリ、料金、プライベート、スケジュール）
- リアルタイムチャット確認
- 2ショットリクエスト管理（承認/拒否）
- アナリティクスダッシュボード
- ギフト内訳

### インフラ
- **Cloudflare Workers** — API + 静的配信
- **D1** — SQLite データベース
- **Durable Objects** — WebSocket リアルタイム通信

## クイックスタート

```bash
npm install
npm run dev          # Cloudflare Worker ローカル (port 8787)
npm run dev:local    # 従来 Express サーバー (port 3001 + 5173)
```

## デモアカウント

| ロール | ユーザー名 | パスワード |
|--------|-----------|-----------|
| 視聴者 | `demo_viewer` | `demo1234` |
| 配信者 | `sakura_live` | `demo1234` |

## Cloudflare デプロイ

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
./scripts/deploy-cloudflare.sh
```

## プロジェクト構成

```
livenova/
├── apps/
│   ├── web/          # React 19 + Tailwind 4 フロントエンド
│   ├── worker/       # Cloudflare Workers (本番)
│   └── server/       # Express (ローカル開発用)
├── scripts/          # デプロイスクリプト
└── .github/workflows # CI/CD
```

## ページ一覧

| パス | 説明 |
|------|------|
| `/` | ホーム（ライブ一覧） |
| `/stream/:id` | 配信視聴 |
| `/u/:username` | 配信者プロフィール |
| `/studio` | 配信スタジオ |
| `/analytics` | 配信者アナリティクス |
| `/wallet` | ポイント購入 |
| `/notifications` | 通知・2ショット管理 |
| `/settings` | プロフィール設定 |
| `/login` | ログイン/登録 |

## Tech Stack

- Frontend: React 19, TypeScript, Tailwind CSS 4, Vite, i18next
- Backend: Hono on Cloudflare Workers, D1, Durable Objects
- Streaming: WebRTC + WebSocket signaling

## License

MIT
