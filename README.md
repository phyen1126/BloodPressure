# BloodPressure V9.3

新增全新 iOS 風格心電圖＋血滴 App Icon，支援 iPhone、Android、Windows PWA 與瀏覽器 favicon。

更新 GitHub 後，請刪除舊主畫面 App、清除該網站資料，再重新加入主畫面，才會看到新圖示。

# BloodPressure V9.2

修正 Google 登入與 CSV 匯入造成整份 JavaScript 無法載入的語法錯誤。

# BloodPressure V9.1

修正 V9 的 JavaScript 語法錯誤，並加入 Google OAuth 彈窗錯誤提示。

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
