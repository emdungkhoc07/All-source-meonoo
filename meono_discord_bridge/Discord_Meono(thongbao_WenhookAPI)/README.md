# Meono x Discord Webhook Bridge 🐱💣

Bộ nguồn Backend độc lập kết nối game **Mèo Nổ (Meono)** với **Máy chủ Discord**.  
**Đặc biệt: 100% Không chỉnh sửa, không chèn bất kỳ dòng code nào vào 2 phần `explodingkittens(sever)` và `explodingkittens(clients)`.**

---

## 🌟 Các chức năng tự động gửi Discord

1. **Mở phòng chơi mới**:
   Khi có người truy cập web và vào ngồi vị trí đầu tiên của một phòng trống:
   > 🎮 **[Tên Chủ Phòng]** vừa mở phòng Mèo Nổ!  
   > 👥 Chế độ: **Đấu Rank 5P** | Số lượng: **1/5 người**  
   > 🔗 [👉 BẤM VÀO ĐÂY ĐỂ VÀO PHÒNG NGAY](http://meono.vercel.app/home.html)  
   > @exp

2. **Người chơi mới tham gia phòng**:
   Mỗi khi có thêm 1 người vào phòng đã có chủ:
   > 🚪 **[a]** đã tham gia phòng của **[b]** (2/10 người)

3. **Người chơi bị nổ bom trong trận**:
   Mỗi khi có 1 người bốc phải bom hoặc siêu bom mà không có gỡ bom:
   > 💣 **Quá đớn đau!**  
   > Người chơi **[Tên]** vừa bị nổ tung!

4. **Kết thúc trận đấu**:
   Sau khi ván đấu kết thúc, hệ thống tự động tổng kết:
   > 🏆 **KẾT THÚC TRẬN ĐẤU MÈO NỔ!**  
   > 🥇 **Người sống sót cuối cùng:** **[Tên Winner]** (+25 điểm rank) (1250 điểm hiện tại).  
   >  
   > 💀 **Danh sách "liệt sĩ" (+điểm)(hoặc - điểm)(số điểm từng người hiện tại):**  
   > 1. **[Tên 2]** (+10 điểm) (1050 điểm hiện tại)  
   > 2. **[Tên 3]** (-15 điểm) (985 điểm hiện tại)  
   >  
   > 💣 **Số bom đã nổ trong trận:** 3 quả.

---

## ⚙️ Cài đặt & Cấu hình

### 1. Cài đặt thư viện
Mở terminal trong thư mục `meono_discord_bridge`:
```bash
cd meono_discord_bridge
npm install
```

### 2. Cấu hình file `.env`
Kiểm tra file `.env` (đã điền sẵn Webhook và Server Render của bạn):
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1552391179486892092/9L0zh_OVFOgfvtNLN8jPcQbwFMbJxhm7PHmdDk51-e_sq2JWLuOfdqypeUZjmnQFD0up
GAME_SERVER_URL=https://explodingkitten-sever.onrender.com
GAME_WEB_URL=http://meono.vercel.app/home.html
DISCORD_ROLE_TAG=@exp
```

---

## 🚀 Hướng dẫn khởi chạy trên máy (Windows)

### Cách đơn giản nhất: Dùng file `.bat`
Chỉ cần nhấp đúp vào file:
👉 **`start_discord_bridge.bat`** (ở ngay thư mục gốc ngoài cùng của dự án) hoặc **`meono_discord_bridge/start.bat`**.

Giao diện sẽ hiện menu cho bạn chọn:
- **[1] Kết nối tới Game Server trên Render.com (Mặc định)**: Kết nối trực tiếp tới Server Render online `https://explodingkitten-sever.onrender.com`, tự động ping đánh thức và duy trì server không bị ngủ đông.
- **[2] Chạy Local Game Server + Discord Hook (Offline Dev)**: Tự động khởi động Game Server Mèo Nổ local (Port 3000) kèm Discord Hook.

---

## 🌐 Triển khai lên Render.com chạy 24/7 hoàn toàn miễn phí

Bạn **HOÀN TOÀN CÓ THỂ** đẩy folder `meono_discord_bridge` này lên **Render.com** để chạy 24/7:

### 1. Cách tạo Web Service trên Render:
1. Đẩy code lên GitHub (riêng repo hoặc cùng repo).
2. Trên dashboard Render.com, chọn **New +** ➔ **Web Service**.
3. Cấu hình:
   - **Root Directory**: `meono_discord_bridge`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `DISCORD_WEBHOOK_URL`: (Link Webhook của bạn)
     - `GAME_SERVER_URL`: `https://explodingkitten-sever.onrender.com`
     - `GAME_WEB_URL`: `http://meono.vercel.app/home.html`
     - `DISCORD_ROLE_TAG`: `@exp`

### 2. Cách giữ cho Service chạy 24/7 không bị Sleep:
Trong `index.js`, hệ thống đã tích hợp sẵn một HTTP Server siêu nhẹ lắng nghe cổng của Render và cung cấp endpoint `/ping`.
1. Vào trang miễn phí như **[cron-job.org](https://cron-job.org)** hoặc **[UptimeRobot](https://uptimerobot.com)**.
2. Tạo 1 HTTP Ping định kỳ **mỗi 5 hoặc 10 phút** trỏ tới:
   ```
   https://ten-service-cua-ban.onrender.com/ping
   ```
3. Render sẽ luôn nhận được request HTTP và **KHÔNG BAO GIỜ bị rơi vào chế độ ngủ (Sleep)**, giúp bot Discord hoạt động liên tục 24/7!
