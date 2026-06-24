# NPO法人TASUKI 公式サイト

`index.html` をブラウザで開くとサイトを確認できます。

## 管理画面

公開サイト最下部の著作権表記から `admin.html` を開けます。

管理画面では以下を操作できます。

- お知らせの作成・修正・削除
- 活動写真の掲載（最大8枚）
- PDF資料のアップロード
- 公開・下書きの切り替え

写真・PDF・投稿データはSupabaseに保存します。最初に `supabase/setup.sql` をSupabaseのSQL Editorで実行してください。

Vercelプロジェクトには以下の環境変数が必要です。

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

パスワードはソースコードへ直接記載しないでください。

## 公開前に設定するもの

- お問い合わせフォームの送信先
- 必要に応じて電話番号・メールアドレス・SNS
- 正式なロゴがある場合は現在の簡易ロゴから差し替え

## 使用フォント

Google Fontsの「BIZ UDPGothic（UD BIZゴシック）」を読み込んでいます。
