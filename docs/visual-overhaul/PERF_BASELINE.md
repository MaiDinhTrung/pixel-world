# PERF BASELINE — mẫu đo `?perf` (gói G0)

Trạng thái: **CHƯA ĐO** — mẫu trống, người dùng điền số. Không điền số ước lượng.
Mục đích: mốc so sánh cho các gói sau (FEATURE_SPEC §4.5, ngưỡng PF). Mọi gói đổi hình ảnh phải đo lại cùng kịch bản và so với bảng này.

## Cách đo

1. `npm run dev`, mở địa chỉ Vite in ra, thêm `?perf` vào URL (kèm `&time=night` cho kịch bản đêm).
2. Mỗi kịch bản: để ổn định ~10 giây, rồi ghi số trong ít nhất 60 giây.
3. Máy đo, trình duyệt, kích thước cửa sổ, chế độ (PC / cảm ứng) giữ nguyên giữa các lần đo.
4. Đo trước khi áp art mới (baseline), và sau từng gói để so.

## Môi trường đo (điền)

| Mục | Giá trị |
|---|---|
| Ngày đo | |
| Commit (HEAD) | |
| Máy / CPU / GPU | |
| Trình duyệt + phiên bản | |
| Kích thước cửa sổ / FIT scale | |
| PC hay cảm ứng | |

## Kết quả baseline (điền)

| Kịch bản | FPS trung bình | Frame time p95 (ms) | Bước vật lý | `getActiveCount()` (pool VFX) | Ghi chú |
|---|---|---|---|---|---|
| Làng, ban ngày | | | | | |
| Làng, ban đêm (`?time=night`) | | | | | |
| 18 quái + búa tích lực (đã sẵn sàng/đập) | | | | | Mục tiêu R10: `getActiveCount()` < 80 |

Cột "Bước vật lý": ghi đúng đại lượng `?perf` hiển thị (đơn vị theo bảng điều khiển perf), ghi rõ tên nhãn đã đọc.

## Ngưỡng chấp nhận cho các gói sau (đề xuất, theo FEATURE_SPEC §4 mục PF; người dùng duyệt)

- Frame time p95 không tệ hơn baseline quá +10%.
- FPS trung bình không giảm quá 5% so với baseline.
- `VFX_MAX_SPRITES = 80` và `VFX_MAX_PARTICLES = 250` không tăng; kịch bản 18 quái + búa tích lực: `getActiveCount()` < 80.
- Mobile (cảm ứng, hạt x0.6) kiểm riêng, đo bảng riêng cùng cột.

## Bảng so sánh sau mỗi gói (sao chép khi cần)

| Gói | Commit | Kịch bản | FPS TB | p95 (ms) | Bước vật lý | `getActiveCount()` | Đạt PF? |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
