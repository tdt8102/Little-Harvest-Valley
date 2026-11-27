# Little Harvest Valley

Game nông trại 2D top-down chạy trong trình duyệt với Phaser 3, TypeScript, Vite và LocalStorage. Sprite, tile, vật phẩm và hiệu ứng âm thanh được tạo từ mã nguồn của dự án. Game ưu tiên WebGL và có chế độ Canvas khi thiết bị không hỗ trợ WebGL.

## Chạy game

Dự án dùng Node.js 24 và pnpm 11.25.0. Từ thư mục dự án, chạy:

```sh
pnpm install
pnpm dev
```

Mở địa chỉ được Vite in ra, mặc định là http://127.0.0.1:5173. Chọn **New Game**, nhập tên nhân vật và nông trại rồi chọn **Begin Spring**. Nút **Continue** xuất hiện khi trình duyệt có bản lưu.

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

## Điều khiển

| Phím | Thao tác |
| --- | --- |
| WASD hoặc phím mũi tên | Di chuyển |
| Chuột trái hoặc Space | Dùng công cụ ở ô được trỏ hoặc ô trước mặt |
| 1–9, 0, [, ] | Chọn một trong 12 ô công cụ |
| E | Tương tác ở cửa nhà, quầy hàng hoặc gần Mira |
| I / C / J / K | Túi đồ / chế tạo / nhiệm vụ / lịch |
| Esc | Đóng bảng hoặc tạm dừng |

Luống đất nằm phía nam nhà. Dùng cuốc (1), gieo củ cải (6) rồi tưới (2). Sau mỗi ngày, trở về cửa nhà và nhấn E để ngủ. Củ cải cần hai đêm được tưới. Chạm vào cây trưởng thành hoặc dùng Space khi đứng trước cây để thu hoạch. Quầy của Mira ở phía đông. Đứng trước cửa quầy, nhấn E, rồi dùng hai thẻ **Buy** và **Sell**.

Dùng rìu (3) với cây hoặc gốc cây và cuốc chim (4) với đá. Dùng cần (5) từ bờ hồ, nhắm vào mặt nước và kéo cần khi thông báo cá cắn xuất hiện. Dùng bình tưới tại bờ hồ để lấy nước. Chọn vật phẩm trong **Inventory** để gán vào ô công cụ đang chọn. Hoàn thành mục tiêu và nhận thưởng trong **Quest Journal**.

Game tự lưu sau các hành động thay đổi tiến trình, khi ngủ, định kỳ trong lúc chơi và khi trang bị ẩn. Có thể lưu thủ công từ menu tạm dừng.

## Cấu trúc

| Thư mục trong `src/` | Vai trò |
| --- | --- |
| `Core`, `Config`, `Components`, `Entities` | Trạng thái nông trại, hằng số, tọa độ và kiểu dữ liệu |
| `Farming`, `Items`, `Inventory` | Dữ liệu cây trồng, danh mục, công thức và túi đồ |
| `World`, `NPC`, `Quests`, `Economy` | Địa hình, nhân vật, nhiệm vụ và giá |
| `Systems`, `Network` | Luật chơi, đồng hồ và kiểu lệnh có thể tuần tự hóa |
| `Scenes`, `Assets` | Phaser, bàn phím, con trỏ, camera và đồ họa pixel |
| `UI`, `Audio`, `Save` | Giao diện HTML/CSS, hiệu ứng âm thanh Web Audio và lưu cục bộ |

`Gameplay` xử lý trạng thái và lệnh mà không phụ thuộc Phaser hoặc DOM. Để thêm cây trồng, cập nhật danh mục, bảng cây, chợ và sprite liên quan. Nhiệm vụ và công thức được khai báo trong bảng dữ liệu. Module `Network` chứa kiểu lệnh để chuẩn bị cho co-op. Phiên bản hiện tại chơi đơn và không cần máy chủ.
