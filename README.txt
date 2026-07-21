BloodPressure PWA V7 — Google Drive 同步版

重要：V7 需要你自己的 Google OAuth Client ID。

Google Cloud 設定：
1. 到 Google Cloud Console 建立 Project。
2. APIs & Services → Library → 啟用 Google Drive API。
3. OAuth consent screen：
   - 選 External。
   - App name 可填 BloodPressure。
   - Testing 模式時，把你的 Google 帳號加入 Test users。
4. Credentials → Create credentials → OAuth client ID。
5. Application type 選 Web application。
6. Authorized JavaScript origins 加入：
   https://phyen1126.github.io
7. 複製 Client ID。
8. 編輯 config.js，把 Client ID 貼入 GOOGLE_CLIENT_ID。

部署：
- 將全部檔案上傳並覆蓋 GitHub Repository 根目錄。
- 等 GitHub Pages 部署後，清除舊版網站快取並重新加入主畫面。

同步：
- 第一次按「連線 Google Drive」並授權。
- V7 使用 drive.file 權限，只管理此 App 建立或存取的檔案。
- Google Drive 會建立或更新同一份 BloodPressure.csv。
- 每次同步會先下載、依 record_id 合併，再上傳。
- iPhone 與 Android 使用同一個 Google 帳號即可共用紀錄。

限制：
- 純瀏覽器 OAuth access token 會過期；過期後需再次按「連線 Google Drive」。
- V7 目前跨裝置刪除沒有 tombstone（刪除標記），因此刪除本機資料後，遠端舊紀錄可能在下次同步回來。
