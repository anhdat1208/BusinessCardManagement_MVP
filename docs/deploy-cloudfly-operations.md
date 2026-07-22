# Vận hành & triển khai — Case demo BusinessCardManagement_MVP

Tài liệu này mô tả cách **triển khai và vận hành** hệ thống danh thiếp (Discord + Slack → Gemini → GAS → Google Sheet/Drive) trên **VPS CloudFly (Ubuntu 24.04)**. Dùng làm **case ví dụ** khi demo quy trình deploy bot 24/7.

> **Không commit** file `.env` hoặc paste token lên chat / git.

---

## 1. Kiến trúc tóm tắt

```
[Discord channel] ──► discord-bot (adapter)
[Slack channel]   ──► slack-bot (adapter)
                           │
                           ▼
                    shared/ (pipeline)
                     OCR → Drive → Sheet
                     → research → enrich
                           │
                           ▼
                    GAS Web App (Google)
                           │
                           ▼
              Sheet 名刺一覧 + file công ty + Drive ảnh
```

| Thành phần | Chạy ở đâu | Ghi chú |
|------------|------------|---------|
| `gas/` | Google Apps Script | Deploy **New version** mỗi lần sửa `.gs` |
| `shared/` | VPS (dependency) | Logic chung, không chạy process riêng |
| `discord-bot/` | VPS (`pm2`) | WebSocket Discord Gateway |
| `slack-bot/` | VPS (`pm2`) | Socket Mode (không cần public URL) |
| Gemini API | Google (cloud) | Quota free; model ví dụ `gemini-3.1-flash-lite` |

**VPS demo (case thực tế):** Ubuntu 24.04, `/opt/bcm/`, quản lý process bằng **pm2**.

---

## 2. Cấu trúc trên server

```
/opt/bcm/
  shared/
  discord-bot/
    .env          ← token Discord + Gemini + GAS (chỉ trên server)
    index.js
  slack-bot/
    .env          ← token Slack + Gemini + GAS
    index.js
```

**Không cần deploy:** thư mục `.superpowers/` (file brief/report của agent), `ocr-test/`, `node_modules` copy từ Windows.

---

## 3. Checklist deploy lần đầu

### 3.1 CloudFly

- [ ] Tạo Cloud Server: **Ubuntu 24.04**, gói tối thiểu (~1 CPU / 1GB RAM đủ MVP)
- [ ] Gắn **SSH key** (hoặc biết password root)
- [ ] Ghi lại **IP public** (ví dụ `222.255.180.177`)
- [ ] Mở SSH (port 22) — mặc định thường đã mở

### 3.2 Trên server (SSH)

```bash
ssh root@<IP_SERVER>

apt update && apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

mkdir -p /opt/bcm
node -v && npm -v && pm2 -v
```

Kỳ vọng: Node **v20.x**, pm2 **7.x**.

### 3.3 Đẩy code từ máy dev (Windows PowerShell)

```powershell
cd C:\Users\DAT\Downloads\Compressed\BusinessCardManagement_MVP

scp -r shared root@<IP_SERVER>:/opt/bcm/
scp -r discord-bot root@<IP_SERVER>:/opt/bcm/
scp -r slack-bot root@<IP_SERVER>:/opt/bcm/
```

Đảm bảo đã có `discord-bot/.env` và `slack-bot/.env` trên máy local trước khi scp (file sẽ lên server; **không** đưa vào git).

### 3.4 Cài dependency trên Linux (quan trọng)

`node_modules` build trên Windows **không** dùng lại trên Linux:

```bash
cd /opt/bcm/shared && rm -rf node_modules && npm install
cd /opt/bcm/discord-bot && rm -rf node_modules && npm install
cd /opt/bcm/slack-bot && rm -rf node_modules && npm install
```

### 3.5 Khởi chạy pm2

```bash
test -f /opt/bcm/discord-bot/.env && echo "discord .env OK"
test -f /opt/bcm/slack-bot/.env && echo "slack .env OK"

cd /opt/bcm/discord-bot && pm2 start index.js --name discord-bot
cd /opt/bcm/slack-bot && pm2 start index.js --name slack-bot

pm2 status
pm2 logs --lines 20
```

Kỳ vọng trong log:

- `Discord bot ready. Logged in as ...`
- `Slack bot ready (Socket Mode)`

### 3.6 Tự khởi động lại khi reboot VPS

```bash
pm2 save
pm2 startup
# Chạy thêm dòng lệnh systemctl mà pm2 in ra (nếu có)
```

### 3.7 Smoke test

- [ ] Up **1 ảnh danh thiếp** trên Discord (đúng channel trong `.env`)
- [ ] Up **1 ảnh** trên Slack (đúng `SLACK_CHANNEL_ID`)
- [ ] Kiểm tra Sheet **名刺一覧** có dòng mới (`source=discord` / `source=slack`)
- [ ] Kiểm tra Drive có ảnh + file công ty được enrich

---

## 4. Vận hành hàng ngày

### 4.1 Lệnh pm2 thường dùng

| Lệnh | Mục đích |
|------|----------|
| `pm2 status` | Xem bot online / memory / restart count |
| `pm2 logs` | Xem log realtime (Ctrl+C thoát) |
| `pm2 logs discord-bot --lines 50` | Log Discord 50 dòng |
| `pm2 logs slack-bot --lines 50` | Log Slack |
| `pm2 restart discord-bot` | Restart Discord |
| `pm2 restart slack-bot` | Restart Slack |
| `pm2 restart all` | Restart cả hai |
| `pm2 stop discord-bot` | Dừng Discord (Slack vẫn chạy) |

### 4.2 Khi nào cần restart?

- Đổi `.env` trên server
- Deploy code mới (sau `npm install` + `pm2 restart`)
- Bot “treo” hoặc không phản hồi (restart count `↺` tăng bất thường)

### 4.3 Tắt bot local sau khi lên VPS

Trên máy Windows, **không** chạy song song `npm start` Discord/Slack — tránh 2 instance cùng token (hành vi không ổn định).

---

## 5. Cập nhật code (deploy mới)

### Cách 1: scp từng folder (đơn giản, phù hợp MVP)

**Windows:**

```powershell
cd C:\Users\DAT\Downloads\Compressed\BusinessCardManagement_MVP
scp -r shared root@<IP_SERVER>:/opt/bcm/
scp -r discord-bot root@<IP_SERVER>:/opt/bcm/
scp -r slack-bot root@<IP_SERVER>:/opt/bcm/
```

**Server:**

```bash
cd /opt/bcm/shared && npm install
cd /opt/bcm/discord-bot && npm install
cd /opt/bcm/slack-bot && npm install
pm2 restart all
pm2 logs --lines 15
```

> Nếu chỉ sửa `shared/`, vẫn nên `npm install` ở `discord-bot` và `slack-bot` (link `file:../shared`) rồi `pm2 restart all`.

### Cách 2: git (khuyến nghị khi project lớn hơn)

1. Khởi tạo repo, `.gitignore` có `.env`, `node_modules/`
2. Trên server: `git clone` → `npm install` từng package → `pm2 restart`

---

## 6. Cập nhật GAS (Google Apps Script)

1. Sửa file local: `gas/CompanyEnrichment.gs` (và file GAS liên quan)
2. Copy vào editor Apps Script trên Google
3. **Deploy → Manage deployments → New version** (bắt buộc mỗi lần sửa)
4. **Không** đổi Web App URL nếu deployment cùng ID — bot `.env` `GAS_WEBAPP_URL` giữ nguyên

Bot trên VPS **không cần restart** chỉ vì GAS đổi logic (trừ khi đổi URL webhook).

---

## 7. Biến môi trường (`.env`)

| File | Biến chính |
|------|------------|
| `discord-bot/.env` | `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, `GEMINI_*`, `GAS_WEBAPP_URL`, `ENABLE_GOOGLE_SEARCH` |
| `slack-bot/.env` | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_CHANNEL_ID`, `GEMINI_*`, `GAS_WEBAPP_URL` |

Sửa trên server:

```bash
nano /opt/bcm/discord-bot/.env
nano /opt/bcm/slack-bot/.env
pm2 restart discord-bot
pm2 restart slack-bot
```

Tham chiếu placeholder: `discord-bot/.env.example`, `slack-bot/.env.example`.

---

## 8. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Hướng xử lý |
|-------------|------------------------|-------------|
| `pm2 status` = **errored**, ↺ tăng | Sai token, thiếu `.env`, lỗi import | `pm2 logs <tên-bot> --err` |
| Discord OK, Slack không | Thiếu `xapp`, bot chưa vào channel | Kiểm tra Slack App Socket Mode + invite bot |
| OCR / research lỗi 429 | Hết quota Gemini free | Đổi model / đợi reset / billing |
| GAS error JSON | Web App chưa deploy version mới | Deploy New version trên GAS |
| Ảnh trùng, không gọi Gemini | Đúng thiết kế (SHA-256) | Thông báo duplicate cho user |
| RAM cao trên VPS 1GB | 2 bot + peak OCR | `free -h`; cân nhắc gói 2GB nếu hay OOM |
| Bot local + VPS cùng chạy | 2 process một token | Tắt local, chỉ giữ pm2 |

### Kiểm tra nhanh trên server

```bash
pm2 status
free -h
df -h /opt/bcm
curl -sI https://script.google.com | head -1   # mạng ra ngoài OK?
```

---

## 9. CloudFly — trial, billing, dừng dịch vụ

- **Dùng thử 3 ngày:** trước hết hạn → chọn gói trả phí (VNĐ) **hoặc** xóa server nếu không dùng
- **STOP server:** CloudFly có thể vẫn tính phí một phần khi STOP chủ động — đọc chính sách billing hiện tại trên portal
- **Hết tiền / hết trial:** VPS tắt → bot offline; Sheet/Drive/GAS vẫn giữ dữ liệu cũ
- **Xóa hẳn:** destroy instance trên `my.cloudfly.vn` khi không cần nữa

---

## 10. Bảo mật (tối thiểu cho demo)

- [ ] `.env` chỉ trên server và máy dev cá nhân
- [ ] SSH: ưu tiên **key**, tắt password login nếu biết cách (`sshd_config`)
- [ ] Không commit token vào git / không gửi token chat
- [ ] GAS Web App: chỉ POST từ bot (URL không public rộng vẫn nên coi là secret)
- [ ] Backup: export Sheet / copy folder `gas/` định kỳ

---

## 11. Phạm vi MVP vs việc làm sau

| Đã xong (MVP) | Tùy chọn sau |
|---------------|--------------|
| Discord + Slack + shared pipeline | Bật `ENABLE_GOOGLE_SEARCH` / Tavily (billing) |
| Dedupe SHA-256, enrich GAS | CI/CD, git repo chính thức |
| pm2 24/7 trên CloudFly | Monitoring (Uptime Kuma, alert) |
| `ENABLE_GOOGLE_SEARCH=false` | Gộp retry Gemini, helper text progress chung |

---

## 12. Checklist vận hành nhanh (in ra dán tường)

**Hàng tuần (nhẹ):**

- [ ] `pm2 status` — cả hai **online**, ↺ = 0 hoặc thấp
- [ ] Test up 1 ảnh (Discord hoặc Slack) nếu nghi ngờ

**Sau khi sửa code bot:**

- [ ] scp / git pull
- [ ] `npm install` (shared → discord → slack)
- [ ] `pm2 restart all`
- [ ] `pm2 logs --lines 20`

**Sau khi sửa GAS:**

- [ ] Deploy **New version**
- [ ] Test 1 ảnh end-to-end

**Trước khi hết trial CloudFly:**

- [ ] Quyết định: trả phí tiếp **hoặc** migrate / tắt server

---

*Tài liệu case demo — cập nhật lần cuối: 2026-07-22. IP và hostname trong ví dụ thay bằng server thực tế của bạn.*
