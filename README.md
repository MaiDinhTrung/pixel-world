# Pixel World

Game **action real-time** phong cách pixel art, xây dựng với **Phaser 4 + TypeScript + Vite**.

## Yêu cầu môi trường

- Node.js >= 22 (khuyến nghị bản LTS mới nhất)
- npm >= 10

## Cài đặt

```bash
npm install
```

## Chạy môi trường phát triển

```bash
npm run dev
```

Mở địa chỉ mà Vite in ra trong terminal (mặc định `http://localhost:5173`).

## Build và xem thử bản production

```bash
npm run build     # type-check bằng tsc, sau đó build vào thư mục dist/
npm run preview   # chạy thử bản build
```

## Cấu hình dự án

| Hạng mục              | Giá trị                  |
| --------------------- | ------------------------ |
| Package manager       | npm                      |
| Game engine           | Phaser 4.2.1             |
| Ngôn ngữ              | TypeScript               |
| Build tool            | Vite                     |
| Độ phân giải thiết kế | 480 × 270 (tỉ lệ 16:9)   |
| Scale mode            | `FIT` + `CENTER_BOTH`    |
| Physics               | Arcade Physics           |
| Nhánh Git             | `main`                   |

Các đặc tính pixel art đã bật: `pixelArt: true`, `roundPixels: true`, canvas dùng
`image-rendering: pixelated`.

## Cấu trúc thư mục

```text
pixel-world/
├── index.html              # Trang HTML chứa container của game
├── public/                 # Asset tĩnh (hiện chưa có)
├── src/
│   ├── config/
│   │   └── gameConfig.ts   # Cấu hình Phaser (kích thước, scale, physics, scene)
│   ├── scenes/
│   │   ├── BootScene.ts    # Scene khởi động, nơi tải asset dùng chung
│   │   └── GameScene.ts    # Scene gameplay chính
│   ├── main.ts             # Điểm khởi động game
│   └── style.css           # Style trang, căn giữa canvas
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Trạng thái

**Giai đoạn 0 — Khởi tạo dự án: hoàn thành.**

Đã có khung engine, cấu hình render pixel art và Arcade Physics. Chưa có nhân vật,
bản đồ, quái vật hay hệ thống chiến đấu — những phần này thuộc các giai đoạn sau.
