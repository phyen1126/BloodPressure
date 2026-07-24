# BloodPressure V11.2.1

- 歷史紀錄標題顯示「目前顯示 / 總筆數」，例如 `歷史紀錄（10/128）`。
- 載入更多後會即時更新，例如 `20/128`。
- 本機備份改為可收合。
- 本機備份預設收合。
- 本機備份會記住上次展開／收合狀態。

# BloodPressure V11.2

- 趨勢圖移到歷史紀錄上方並維持展開。
- 歷史紀錄移到趨勢圖下方，整區可收合。
- 歷史紀錄預設收合，並記住上次狀態。

# BloodPressure V11.1

- 版本號只顯示於頁面最底部。
- 「關於 BloodPressure」移至 Google Drive 區塊前方。
- About 區塊預設展開並可收合。
- 收合狀態會保存在目前裝置。
- 首頁上半部直接顯示 App 用途、Google Drive 資料用途與醫療免責聲明。
- 保留 V11 的離線待同步、多裝置合併、日期／狀態篩選與 JSON 備份。

# BloodPressure V11

- 離線待同步狀態與恢復網路後同步
- 多裝置依 ID 與更新時間合併
- 日期區間與異常篩選
- 完整 JSON 備份／復原
- V10 資料與 Drive 綁定遷移

# BloodPressure V10.4

- 將「歷史紀錄顯示設定」移到歷史紀錄標題下方。
- 顯示設定列會顯示目前選擇的筆數。
- 表格緊接在顯示設定區下方。

# BloodPressure V10.3

- 歷史紀錄預設顯示 10 筆。
- 可收合「歷史紀錄顯示設定」，選擇 10、20、50 筆或全部。
- 支援逐批載入更多。
- 「關於 BloodPressure」移到頁面最下方。

# BloodPressure V10.2 — OAuth Verification Edition

此版本針對 Google OAuth 品牌驗證調整：

- 首頁正式名稱統一為 `BloodPressure`
- 首頁公開說明應用程式用途
- 公開說明 Google Drive 資料用途
- 新增 `privacy.html`
- 新增 `terms.html`
- Manifest、頁面標題及 iPhone App 名稱保持一致
- 預留 Search Console 驗證標記位置

請閱讀 `GOOGLE_OAUTH_VERIFICATION_SETUP.txt`。

# BloodPressure V10.1

本版更新：

- 開啟 App 時更新目前日期與時間。
- 從背景回到前景時更新時間。
- 編輯既有紀錄時保留原日期時間。
- 使用者已開始輸入時，不會突然覆蓋日期時間。
- 保留已綁定的 Google Drive fileId。
- 啟動時嘗試用既有 Google Session 恢復授權並自動同步。
- 若瀏覽器不允許無互動恢復，按鈕會顯示「重新連線 Google」，不需重新選 CSV。

注意：純前端 PWA 無法永久保存 Google Access Token；Safari/Chrome 是否允許無感恢復，仍由 Google Session、Cookie 與瀏覽器彈窗政策決定。

# BloodPressure V10

`BloodPressure.csv` 現在只包含：

- 日期
- 時間
- 收縮壓
- 舒張壓
- 心跳
- 備註

跨裝置同步所需的 record ID、更新時間與刪除標記，改存於同資料夾的 `BloodPressure.sync.json`。請勿手動刪除該系統檔案。

V10 可讀取 V9 舊格式 CSV；第一次同步後會轉成乾淨的六欄格式。

# BloodPressure V9.5

未登入時頂端只顯示登入；登入後管理功能移至本機備份上方並預設收合；加入最後同步時間與同步成功提示。

# BloodPressure V9.4

未登入只顯示登入按鈕；登入後依是否綁定 CSV 顯示必要操作；同步期間鎖定操作。

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
