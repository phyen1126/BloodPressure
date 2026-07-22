# BloodPressure V9

## 部署
將 ZIP 解壓後全部上傳到 GitHub Repository 根目錄。

## Google Cloud 設定
OAuth JavaScript origin:
`https://phyen1126.github.io`

API Key website restriction:
`https://phyen1126.github.io/*`

API restrictions:
- Google Drive API
- Google Picker API

測試模式請把使用者 Gmail 加入 Test users；公開使用需把 OAuth App 發布為 Production。

## 使用流程
登入 Google → 選擇既有 CSV 或建立新 CSV → 後續更新同一個 fileId。

CSV 含 record_id、updated_at_iso 與 deleted 欄位，可跨裝置合併、編輯與刪除。

## 安全
前端 Client ID、Browser API Key、Project Number 可公開，但不可放 Client Secret、Refresh Token 或服務帳戶金鑰。
