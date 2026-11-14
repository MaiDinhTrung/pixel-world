# Visual Reference Library — Pixel World

Thư viện ảnh tham chiếu hình ảnh cho Pixel World. Đây là nơi **chỉ chứa ảnh tham chiếu và ghi chú đi kèm**, không chứa asset dùng trong game.

## 1. Mục đích

- Gom hình ảnh tham chiếu về phong cách, bố cục, ánh sáng, nhân vật, vũ khí, VFX và UI để cả người dùng lẫn các Subagent (đặc biệt `visual-designer`) cùng nhìn vào một nguồn.
- Giúp trao đổi định hướng bằng hình thay vì chỉ bằng mô tả chữ.
- Làm cơ sở để phân tích và đề xuất thiết kế mới. Kết quả phân tích mới là thứ được phê duyệt, không phải bản thân ảnh tham chiếu.

## 2. Định hướng nghệ thuật

**Diablo-inspired Dark Fantasy Pixel Art.**

- Thế giới medieval fantasy u tối, khắc nghiệt, nguy hiểm; môi trường cổ xưa, hoang tàn, ma quái.
- Bảng màu nền thiên về xám than, nâu đất, xanh rêu tối; màu nóng dành cho nguồn sáng và nguy hiểm.
- Nhân vật, quái vật và vũ khí có thiết kế rõ ràng, cá tính, dễ đọc silhouette.
- VFX ma thuật nổi bật trên nền tối nhưng không lạm dụng neon.
- Dùng ánh sáng, sương mù và tương phản để tạo chiều sâu.

"Diablo-inspired" nghĩa là lấy **cảm giác, tinh thần và nguyên tắc** (u tối, ánh sáng điểm, tương phản, silhouette), không phải sao chép hình ảnh của game đó.

## 3. Cấu trúc thư mục

| Thư mục | Chứa gì |
|---|---|
| `01-environment/` | Môi trường: địa hình, nền, công trình, prop, bố cục khu vực, tileset, cây cối, đổ nát, nghĩa địa. |
| `02-characters/` | Nhân vật người chơi, NPC, quái thường, tinh anh, boss: silhouette, tỉ lệ, bảng màu, tư thế. |
| `03-weapons/` | Vũ khí và trang bị: hình dạng, chất liệu, độ sáng, phần ma thuật, biểu tượng. |
| `04-combat-vfx/` | Hiệu ứng chiến đấu: vệt chém, đạn, va chạm, vụ nổ, hệ lửa/băng/sét/gió/bóng tối, độc, trạng thái. |
| `05-lighting-atmosphere/` | Ánh sáng và không khí: ánh sáng điểm, sương mù, vignette, bóng đổ, độ tương phản, màu môi trường. |
| `06-ui/` | Giao diện: HUD, khung, thanh máu, số sát thương, inventory, menu, font. |

## 4. Hướng dẫn đặt ảnh (cho người dùng)

1. Chọn đúng thư mục theo chủ đề chính của ảnh. Ảnh có nhiều chủ đề thì đặt vào thư mục quan trọng nhất và ghi rõ trong ghi chú.
2. Đặt tên theo dạng `<chủ-đề>-<mô-tả-ngắn>-<số>.png`, chữ thường, nối bằng dấu gạch ngang, không dấu, ví dụ `ruined-chapel-fog-01.png`. Định dạng ưu tiên: PNG; chấp nhận JPG, WEBP.
3. Mỗi ảnh nên có một file ghi chú cùng tên, đuôi `.md` (ví dụ `ruined-chapel-fog-01.md`) gồm:
   - **Nguồn:** tên tác giả/game/trang và đường dẫn nếu có.
   - **Giấy phép / quyền sử dụng:** CC0, tự vẽ, ảnh chụp màn hình để tham khảo, hay chưa rõ.
   - **Vì sao chọn:** điểm muốn học (màu, ánh sáng, silhouette, bố cục...).
   - **Điểm KHÔNG muốn lấy:** phần không phù hợp với Pixel World.
4. Ảnh không rõ nguồn hoặc giấy phép vẫn có thể dùng làm tham chiếu nội bộ, nhưng phải ghi "chưa rõ" trong ghi chú.
5. Không đặt ảnh tham chiếu vào `public/` hay `src/`. Thư viện này không phải nơi chứa asset của game.
6. Giữ kích thước tệp hợp lý; tránh ảnh quá lớn không cần thiết.

## 5. Hướng dẫn cho Subagent

Áp dụng cho `visual-designer` và mọi agent được giao phân tích ảnh tham chiếu.

1. Đọc `docs/assets/ASSET_CATALOG.md` và README thư mục trước, sau đó mới xem ảnh trong thư mục liên quan. Dùng Glob để liệt kê ảnh, Read để mở từng ảnh, và đọc file `.md` ghi chú đi kèm.
2. Báo rõ ảnh nào **đã mở xem** và ảnh nào **chưa**. Không nhận xét ảnh chưa mở.
3. Mô tả những gì thấy được, không bịa chi tiết. Hex chính xác chỉ ghi khi đã đo được; nhận xét bằng mắt phải ghi là ước lượng, và thiếu dữ liệu thì ghi **"Chưa xác định"**.
4. Phân tích **nguyên tắc** có thể học: silhouette, bảng màu và tỉ lệ giá trị sáng tối, mật độ pixel, ánh sáng, tương phản, bố cục, nhịp animation.
5. Chuyển nguyên tắc thành đề xuất cho Pixel World (dùng được với asset hiện có, cần thay thế, hay cần tạo mới), kèm lý do. Ưu tiên tái sử dụng asset hiện có trước khi đề xuất tạo mới.
6. Chỉ phân tích và đề xuất. Không sửa file, không đổi tên hay xóa ảnh trong thư viện.
7. Không mô tả theo kiểu "vẽ lại y hệt ảnh này". Đề xuất phải là thiết kế mới của Pixel World.

## 6. Ảnh tham chiếu và tài liệu đã phê duyệt

| | Ảnh tham chiếu (thư mục này) | Tài liệu thiết kế đã phê duyệt |
|---|---|---|
| Vai trò | Nguồn cảm hứng, minh họa | Quy chuẩn ràng buộc cho triển khai |
| Trạng thái | Tham khảo, không ràng buộc | Đã được người dùng duyệt |
| Vị trí | `docs/references/visual/` | `docs/assets/` và các tài liệu thiết kế khác |
| Dùng để | Phân tích, thảo luận, đối chiếu | Làm theo khi viết code và tạo asset |

- Một ảnh nằm trong thư viện **không có nghĩa là đã được chấp thuận** để làm theo.
- Khi hai thứ mâu thuẫn, tài liệu đã phê duyệt luôn thắng.
- Muốn biến một nguyên tắc rút ra từ ảnh tham chiếu thành quy chuẩn, phải qua bước đề xuất và được người dùng phê duyệt, rồi mới ghi vào tài liệu thiết kế.

## 7. Bản quyền và tài sản độc quyền

- Ảnh tham chiếu chỉ để **học phong cách và nguyên tắc**.
- **Không sao chép nguyên bản** tài sản độc quyền từ game khác (sprite, tileset, icon, nhân vật, quái, vũ khí, VFX, UI, font, âm thanh), kể cả khi chỉnh sửa nhẹ.
- Không đưa ảnh trong thư viện vào `public/` hoặc dùng trực tiếp làm texture trong game.
- Asset dùng trong game phải là tự tạo, sinh bằng code, hoặc từ nguồn có giấy phép cho phép (ví dụ CC0), và phải theo quy trình ở `docs/assets/README.md`, `ASSET_NAMING.md` và cập nhật `ASSET_CATALOG.md`.
- Nếu không chắc về quyền sử dụng một ảnh, ghi chú "chưa rõ" và không dùng ảnh đó làm cơ sở để tạo asset.
