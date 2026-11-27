# Little Harvest Valley

Game nông trại 2D top-down chạy trong trình duyệt với Phaser 3, TypeScript, Vite và LocalStorage. Sprite, tile, vật phẩm và hiệu ứng âm thanh được tạo từ mã nguồn của dự án. Game ưu tiên WebGL và có chế độ Canvas khi thiết bị không hỗ trợ WebGL.

## Chạy game

Dự án dùng Node.js 24 và pnpm 11.25.0. Từ thư mục dự án, chạy:

```sh
pnpm install
pnpm dev
```

Mở địa chỉ được Vite in ra, mặc định là http://127.0.0.1:5173. Chọn **Chơi mới**, nhập tên nhân vật và nông trại rồi chọn **Bắt đầu mùa xuân**. Nút **Tiếp tục** xuất hiện khi trình duyệt có bản lưu.

Game mặc định dùng tiếng Việt. Bạn có thể đổi sang **English** trong **Cài đặt → Ngôn ngữ** ở menu chính hoặc menu tạm dừng. Trình duyệt lưu lựa chọn ngôn ngữ riêng với tiến trình nông trại.

Trong **Cài đặt**, bạn có thể bật hoặc tắt và chỉnh âm lượng riêng cho **Nhạc nền** và **Hiệu ứng âm thanh**. Nhạc bắt đầu sau thao tác đầu tiên, tự chuyển giữa *Nắng trên luống* và *Hồ Liễu về đêm*. Tùy chọn **Giảm chuyển động** cũng áp dụng cho bóng mây và cá trong hồ.

Lần đầu vào nông trại, game mở hướng dẫn theo thiết bị. Bạn có thể mở lại mục **Hướng dẫn** bất cứ lúc nào. Trên điện thoại, giữ cụm phím trái để di chuyển, chạm một ô trên thanh công cụ để chọn vật phẩm rồi chạm **Dùng** hoặc chạm trực tiếp ô cần thao tác. Nút **Tương tác** dùng khi đứng trước cửa nhà, cửa hàng hoặc Mira.

```sh
pnpm test
pnpm build
pnpm preview
```

Bản production nằm trong `dist/` và có thể phục vụ bằng máy chủ web tĩnh. Tiến trình thuộc về trình duyệt và địa chỉ trang đang chơi.

## Triển khai trên Vercel

1. Mở [Vercel New Project](https://vercel.com/new), kết nối GitHub và chọn **Import** cho repo `tdt8102/Little-Harvest-Valley`.
2. Giữ **Root Directory** tại thư mục gốc. `vercel.json` chọn Vite, cài dependencies từ lockfile, chạy `npm run build` và xuất `dist/`. Game không cần biến môi trường.
3. Chọn **Deploy**. Khi deployment thành công, dùng địa chỉ production Vercel cấp để chia sẻ game.

## Chơi co-op qua Internet

Máy host chạy server cho tối đa 4 người. Mọi người cùng canh tác trên một bản đồ, có túi đồ và vàng riêng. Khi mọi người đang kết nối cùng chọn ngủ ở nhà, nông trại chuyển sang ngày mới.

**Người host**

1. Cài [cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/) và bảo đảm lệnh `cloudflared --version` chạy được.
2. Tại thư mục game, chạy `pnpm install`, `pnpm build` rồi `pnpm host:share`.
3. Gửi liên kết HTTPS `.trycloudflare.com` và mã phòng in trong terminal cho bạn bè. Người host có thể mở địa chỉ `http://127.0.0.1:8080/` in trong cùng terminal.
4. Giữ terminal chạy trong khi chơi. Khi chạy lại, gửi liên kết tunnel mới. Bản lưu nông trại nằm tại `.valley-host/farm.json`. Nếu cần chọn cổng khác, chạy `pnpm host:share --port=8081`.

**Người tham gia**

1. Mở liên kết HTTPS của host trên máy tính hoặc điện thoại.
2. Chọn **Chơi co-op**, nhập mã phòng và tên nhân vật. Nếu đang ở bản Vercel, có thể dùng cùng menu và dán liên kết HTTPS của host.
3. Dùng lại cùng trình duyệt và mã phòng để trở về nhân vật đã lưu, kể cả khi host nhận được liên kết tunnel mới nếu bạn vào lại từ cùng trang Vercel. Nếu thường xuyên đổi URL tunnel, nên vào qua bản Vercel để trình duyệt truy cập được khóa nối lại đã lưu.

Dùng `pnpm host` để chạy server chỉ trên máy host. `pnpm host:share` tạo [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) để bạn bè kết nối từ xa. Bản triển khai Vercel phục vụ giao diện game. Trạng thái co-op được xử lý và lưu trên máy host.

## Điều khiển

| Phím | Thao tác |
| --- | --- |
| WASD hoặc phím mũi tên | Di chuyển |
| Chuột trái hoặc Space | Dùng công cụ ở ô được trỏ hoặc ô trước mặt |
| 1–9, 0, [, ] | Chọn một trong 12 ô công cụ |
| E | Tương tác ở cửa nhà, quầy hàng hoặc gần Mira |
| I / C / J / K | Túi đồ / chế tạo / nhiệm vụ / lịch |
| Esc | Đóng bảng hoặc tạm dừng |

Luống đất nằm phía nam nhà. Dùng cuốc (1), gieo củ cải (6) rồi tưới (2). Sau mỗi ngày, trở về cửa nhà và nhấn E để ngủ. Củ cải cần hai đêm được tưới. Nhấp vào cây trưởng thành hoặc dùng phím cách khi đứng trước cây để thu hoạch. Cửa hàng Mira ở phía đông. Đứng trước cửa hàng, nhấn E, rồi dùng hai thẻ **Mua** và **Bán**.

Dùng rìu (3) với cây hoặc gốc cây và cuốc chim (4) với đá. Dùng cần (5) từ bờ hồ, nhắm vào mặt nước và kéo cần khi thông báo cá cắn xuất hiện. Dùng bình tưới tại bờ hồ để lấy nước. Chọn vật phẩm trong **Túi đồ** để gán vào ô công cụ đang chọn. Hoàn thành mục tiêu và nhận thưởng trong **Nhật ký nhiệm vụ**.

Game tự lưu sau các hành động thay đổi tiến trình, khi ngủ, định kỳ trong lúc chơi và khi trang bị ẩn. Có thể lưu thủ công từ menu tạm dừng.

## Cấu trúc

| Thư mục trong `src/` | Vai trò |
| --- | --- |
| `Core`, `Config`, `Components`, `Entities` | Trạng thái nông trại, hằng số, tọa độ và kiểu dữ liệu |
| `Farming`, `Items`, `Inventory` | Dữ liệu cây trồng, danh mục, công thức và túi đồ |
| `World`, `NPC`, `Quests`, `Economy` | Địa hình, nhân vật, nhiệm vụ và giá |
| `Systems`, `Network` | Luật chơi, đồng hồ, giao thức WebSocket và kết nối co-op |
| `Scenes`, `Assets` | Phaser, bàn phím, con trỏ, camera và đồ họa pixel |
| `UI`, `Audio`, `Save` | Giao diện HTML/CSS, hiệu ứng âm thanh Web Audio và lưu cục bộ |

`Gameplay` xử lý trạng thái và lệnh độc lập với Phaser và DOM. `server/room.ts` dùng lại các luật đó để xử lý lệnh từ khách. Phaser dựng hiệu ứng theo kết quả đã xử lý. Để thêm cây trồng, cập nhật danh mục, bảng cây, chợ và sprite liên quan. Nhiệm vụ và công thức được khai báo trong bảng dữ liệu.
