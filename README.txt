BloodPressure PWA V6

V6 修正：
- 完全移除 navigator.share 分享流程。
- 不會再產生額外的「文字」檔。
- 完全移除 iPhone 捷徑相依性。
- 匯出 CSV 檔名固定為 BloodPressure.csv。
- 保留本機紀錄、趨勢、統計、搜尋、排序、編輯、刪除、匯入、深色模式與離線功能。

GitHub Pages 更新：
1. 解壓縮 ZIP。
2. 將所有檔案上傳並覆蓋 Repository 根目錄。
3. 等待 GitHub Pages 部署。
4. 刪除舊主畫面 App。
5. iPhone：設定 → Safari → 進階 → 網站資料。
6. 搜尋 phyen1126.github.io 並刪除網站資料。
7. 用 Safari 重新開啟網站，再加入主畫面。

重要限制：
- iOS 若下載資料夾已有同名檔案，可能自動命名成 BloodPressure 2.csv。
- 這是 iOS 下載管理行為，PWA 無法強制覆蓋既有檔案。
- V6 的核心資料保存在瀏覽器本機，請定期下載 CSV 備份。
