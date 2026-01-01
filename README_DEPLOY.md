
# 整合至現有 Ubuntu Nginx 環境指南

您的主機已經設定好 SSL (HTTPS) 並且有 `linebot.letoy.com.tw` 的網域。以下是整合步驟：

### 1. 準備程式碼
在您的 Ubuntu 主機上：
```bash
# 進入您平常放專案的目錄
cd /home/ubuntu 

# 複製專案
git clone <您的_GITHUB_網址>
cd taipei-parkright

# 安裝並編譯
npm install
npm run build
```
執行完後，您會得到一個 `/home/ubuntu/taipei-parkright/dist` 資料夾。

### 2. 修改您現有的 Nginx 設定
編輯您的設定檔：
`sudo nano /etc/nginx/sites-available/linebot.letoy.com.tw` (或是您現有的檔名)

在 `server` 區塊（listen 443 裡面）加入以下內容：

```nginx
    # 將停車場 App 設為根目錄 (取代原本被註解掉的 location /)
    location / {
        root /home/ubuntu/taipei-parkright/dist; # 請確保路徑正確
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 如果您想把 App 放在次路徑，例如 https://linebot.letoy.com.tw/parking/
    # 則將上面的 location / 改為 location /parking/
    # 並且 root 指向 dist 的上一層，或是使用 alias
```

### 3. 設定資料夾權限
Nginx 需要讀取權限才能進入您的 `dist` 資料夾。請執行：
```bash
# 讓 Nginx (www-data 用戶) 可以訪問該路徑
chmod -R 755 /home/ubuntu/taipei-parkright
```

### 4. 測試並重啟
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

### 注意事項
1. **API 安全**：因為這個 App 使用的是台北市政府的公開 JSON，沒有任何 API Key，所以上傳到 GitHub 是完全安全的。
2. **CORS 代理**：目前 `parkingService.ts` 使用了 `corsproxy.io`。如果您的 Ubuntu 主機有嚴格的出站防火牆，請確保主機可以訪問該網址。
3. **靜態資源路徑**：如果您選擇將 App 放在次路徑（如 `/parking/`），請記得修改 `vite.config.ts` 中的 `base: '/parking/'` 並重新 `npm run build`。如果放在根路徑 `/` 則不需要改動。
