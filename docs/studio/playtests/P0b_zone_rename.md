# PLAYTEST_CHECKLIST — P0b: đổi tên Region → Zone

Nhiệm vụ: P0b (đổi tên thuần trong code; **không đổi gameplay**). Mục tiêu của buổi chơi thử: xác nhận game chạy **y hệt trước P0b**, không hỏng save, không mất biển tên vùng.
Baseline: HEAD `aebd6bc` + thay đổi chưa commit của P0b. Ngày lập: 2026-11-17.

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`npx tsc --noEmit` sạch · `npm run build` qua · `npm test` 632/632 qua (trước P0b: 626) · phạm vi git đúng danh sách · không còn ký hiệu cũ · giá trị số/văn bản không đổi (QA đọc diff) · `validateWorld` hợp lệ · id vùng khoá bằng test · save v8 mặc định không chứa id vùng.
**Chưa kiểm được bằng máy** (là lý do có checklist này): biển tên hiện đúng khi chơi, vào/ra Arena, Elite, nạp save nhân vật cũ thật.

## Cách chạy
1. `npm run dev` trong thư mục dự án, mở địa chỉ Vite in ra (thường `http://localhost:5173`).
2. Chọn **nhân vật đã có tiến trình từ trước** (đã có cấp độ, đồ, vàng) cho PT-01; các mục khác chơi bằng nhân vật bất kỳ.
3. Mẹo: phím `N` đổi ngày/đêm; `?time=day` trên URL để luôn ban ngày. Mở DevTools (F12) → tab Console để xem lỗi (PT-12).

## Cách ghi kết quả
Mỗi mục: đánh dấu một ô — `[x] PASS` / `[x] FAIL` / `[x] NOT TESTED`; ghi chú hoặc bằng chứng (ảnh chụp) nếu FAIL. Khi xong, gửi lại file này (hoặc dán các mục FAIL). Mọi lỗi/nhận xét ngoài checklist ghi ở mục cuối.

---

## A. Save và khởi động

### PT-01 — Nhân vật cũ nạp đúng
- **Thao tác:** Ở màn chọn nhân vật, chọn nhân vật đã chơi trước đây và vào game.
- **Mong đợi:** Cấp độ, túi đồ, trang bị đang mặc, vàng, ngọc, kỹ năng đúng như lần chơi trước; không có thông báo lỗi.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-02 — Lưu rồi nạp lại vẫn đúng
- **Thao tác:** Nhặt vài vàng/đồ (hoặc mua một món ở cửa hàng làng), tải lại trang (F5), chọn lại nhân vật đó.
- **Mong đợi:** Thay đổi vừa rồi còn nguyên sau khi nạp lại.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

## B. Biển tên vùng (Zone banner)

### PT-03 — Biển tên ở làng
- **Thao tác:** Vào game (hoặc đứng trong làng, đi ra rồi quay lại khi biển cũ đã mờ, hơn khoảng 20 giây).
- **Mong đợi:** Biển "Làng Khởi Nguyên" (không có ◆) hiện dần phía trên giữa màn hình, giữ vài giây, mờ dần; không nhấp nháy.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-04 — Biển tên vùng gần
- **Thao tác:** Đi ra khỏi làng một đoạn ngắn (vùng đồng hoang gần làng).
- **Mong đợi:** Biển "Đồng Hoang Úa" kèm **1 ◆** và dòng "Gió lạnh mang mùi tử khí".
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-05 — Biển tên vùng xa
- **Thao tác:** Đi xa hơn nữa, ra rìa bản đồ.
- **Mong đợi:** Biển "Hoang Địa Sâu" kèm **2 ◆** và dòng "Kẻ yếu không trở về".
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-06 — Không nhấp nháy, không lặp liên tục ở biên
- **Thao tác:** Đứng sát ranh giới giữa hai vùng, bước qua lại vài lần liên tiếp.
- **Mong đợi:** Biển không nhấp nháy; cùng một vùng không hiện lại ngay (có thời gian chờ ~20 giây).
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

## C. Quái và Elite theo vùng

### PT-07 — Làng an toàn
- **Thao tác:** Đứng trong làng (trong tường thành) khoảng 30 giây.
- **Mong đợi:** Không có quái sinh ra trong làng.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-08 — Quái khác nhau giữa vùng gần và vùng xa
- **Thao tác:** Quan sát quái ở vùng gần, rồi ở vùng xa.
- **Mong đợi:** Có cả quái nhỏ nhanh (Swarmer) ở cả hai vùng; quái nặng (Brute) thấy rõ hơn ở vùng xa; vùng xa mạnh hơn vùng gần như trước P0b.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-09 — Elite xuất hiện ở cả hai vùng
- **Thao tác:** Hạ liên tục quái ở vùng gần cho tới khi đủ khoảng 25 con; lặp lại ở vùng xa.
- **Mong đợi:** Mỗi vùng sinh Elite có dấu hiệu nhận biết (vòng chân/biểu tượng), đếm theo từng vùng riêng; hạ Elite có thưởng như trước.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

## D. Cổng và Arena

### PT-10 — Vào Arena
- **Thao tác:** Đi tới cổng đỏ (ngoài làng, sát cổng thành phía Bắc), nhấn `F` (hoặc chạm nút đánh trên điện thoại) và chờ sạc đầy.
- **Mong đợi:** Màn hình mờ chuyển, vào Đấu Trường Boss; HP, giáp, năng lượng và hồi chiêu skill giữ như lúc rời; **không** có biển tên vùng ở Arena.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-11 — Cổng về khóa khi Boss còn sống
- **Thao tác:** Trong Arena, khi Boss đã xuất hiện và còn sống, lại gần cổng về.
- **Mong đợi:** Cổng ghi "(KHÓA)" và có thông báo "CỔNG KHÓA — HẠ TRÙM ĐỂ MỞ".
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:** (Boss xuất hiện sau khoảng 2 phút kể từ đầu lượt chơi; nếu chưa kịp thì ghi NOT TESTED.)

### PT-12 — Về map chính
- **Thao tác:** Hạ Boss (hoặc khi cổng đã mở), qua cổng về.
- **Mong đợi:** Về đúng điểm xuất hiện cũ ở làng (giữa làng), HP/hồi chiêu giữ nguyên; biển "Làng Khởi Nguyên" hiện lại.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-13 — Chết thì hồi sinh ở làng
- **Thao tác:** Để nhân vật chết ở map chính (và nếu được, một lần ở Arena).
- **Mong đợi:** Hồi sinh ở làng như trước, lượt chơi mới (không lỗi).
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

## E. Hồi quy chung

### PT-14 — Không có lỗi trong Console
- **Thao tác:** Mở F12 → Console trước khi chơi; chơi qua các mục A–D.
- **Mong đợi:** Không có lỗi đỏ mới (cảnh báo chunk/asset cũ nếu có thì ghi lại).
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

### PT-15 — Hệ thống lân cận vẫn chạy
- **Thao tác:** Nhấn `N` đổi ngày/đêm; mở cửa hàng làng (Thương nhân/Thợ rèn); mở panel nhân vật (Stats/Túi/Skills).
- **Mong đợi:** Cả ba hoạt động bình thường như trước.
- **Trạng thái:** [ ] PASS  [ ] FAIL  [ ] NOT TESTED
- **Ghi chú/bằng chứng:**

---

## Giới hạn nói thẳng
- Agent không chơi được game; các mục trên chỉ bạn kiểm được. Tôi sẽ **không** tự đánh dấu PASS.
- QA xác nhận "không đổi hành vi" bằng đọc diff và test, không so sánh được runtime với bản trước P0b; phát hiện lệch hành vi dựa vào bạn.
- Không kiểm được `localStorage` thật của bạn trước khi chơi (PT-01/PT-02 là bằng chứng duy nhất).
- Ghi chú không chặn từ QA: chú thích dòng đầu `worldGraph.ts`/`worldConfig.ts` hơi dài (chỉ là comment).
- Số liệu (tier vùng xa, ngưỡng Elite 25) là giá trị khởi điểm đã có từ W3/M3, **không đổi** ở P0b.

## Nhận xét ngoài checklist
(Ghi bất kỳ điều gì lạ, khó chịu hoặc đề xuất.)

---

## Kết quả người dùng gửi (2026-11-17)
15 Đạt, 0 Không đạt, 0 Chưa kiểm tra / 15 (PT-01 … PT-15, bản tick được trên trang artifact).
Ghi chú ở PT-13: "Quái và vật phẩm vẫn giữ nguyên, hoạt động bình thường khi mình chết". Không được báo là lỗi; P0b không sửa mã chết/chơi lại. Chờ người dùng xác nhận đó là hành vi mong muốn hay muốn xem xét riêng (ngoài phạm vi P0b).
