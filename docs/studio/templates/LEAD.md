# MẪU — AI Lead (brief khảo sát · đề xuất Cổng 1 · báo cáo Cổng 2 · đóng nhiệm vụ)

Người dùng: **AI Lead**. Brief cho Developer/QA: dùng `FEATURE_BRIEF.md`. Task Map: `TASK_MAP.md`. Playtest: `PLAYTEST.md`.

## A. Brief khảo sát cho Designer (gửi gameplay-designer / visual-designer)
Khi: nhiệm vụ cần chuyên môn cơ chế/cân bằng hoặc hình ảnh/asset (WORKFLOW §2, §12.2); không gọi để "xác nhận" việc đã rõ. Hai Designer chạy song song, không phân tích trùng một thứ.
```
Nhiệm vụ: <ID> — <tên> · Task Map: docs/studio/tasks/<ID>_<slug>.md
Câu hỏi cần trả lời: 1) … 2) …
Ràng buộc đã biết: (quyết định người dùng, asset không được tạo, số liệu đã chốt…)
Đọc: docs/codemap/<hệ thống>.md → file cụ thể <đường dẫn ~dòng>; (Visual) docs/assets/ASSET_CATALOG.md
Không cần đọc: <tài liệu không liên quan>
Báo cáo: mục "<Gameplay|Visual> Designer" trong docs/studio/templates/AGENT_REPORTS.md, ≤ 10 dòng. Chỉ đọc, không sửa file.
```

## B. Đề xuất Cổng 1 (gửi người dùng; lưu `lean-handoff/<ID>_DESIGN_PROPOSAL.md` khi ≥ L)
Khi: trước mọi thiết kế mới / thay đổi kiến trúc (WORKFLOW §5). Việc S: gộp thành một câu xác nhận.
```
# <ID> — Đề xuất (Cổng 1)
Trạng thái: CHỜ DUYỆT · Cấp: <S/M/L/XL> · Nguồn: <Designer nào, ngày>
## 1. Khuyến nghị (3–6 dòng: làm gì, người chơi thấy gì)
## 2. Phương án bị loại (mỗi phương án 1 dòng + lý do)
## 3. Đánh đổi / rủi ro
## 4. Phạm vi dự kiến: hệ thống (codemap) · file ĐƯỢC SỬA / ĐƯỢC TẠO · KHÔNG đụng
## 5. Tiêu chí nghiệm thu chính (A / Q / P)
## 6. Câu hỏi cần chọn (mỗi câu có mặc định khuyến nghị trong ngoặc)
```
Sau khi duyệt: ghi mục `DECISIONS.md` (mẫu ở đầu file đó; trường **Trạng thái** chỉ 1 dòng + link Task Map), đổi dòng Trạng thái thành "ĐÃ DUYỆT (<ngày>, "<trích lời>")".

## C. Báo cáo Cổng 2 (gửi người dùng, xin commit)
Khi: sau khi người dùng nghiệm thu (hoặc việc không có playtest đã tự kiểm/QA xong).
```
Nghiệm thu: <ACCEPTED ngày / lời người dùng>
QA: <PASS, số test, phạm vi sạch> · Tồn đọng không chặn: <NB…>
Commit đề xuất: <message> · File: <bảng nhóm code / tài liệu>
KHÔNG đưa vào commit: <file + lý do, chờ quyết>
Push: không (cần đồng ý riêng)
```

## D. Đóng nhiệm vụ (WORKFLOW §11, §13 bước 7)
1. Task Map: mọi bước DONE (hoặc ghi lý do bỏ), Trạng thái tổng `CLOSED`, ngày đóng.
2. `TASK_HISTORY.md`: thêm 3–5 dòng (kết quả · commit · tài liệu · tồn đọng).
3. `CURRENT_TASK.md`: xoá hàng.
4. `TOKEN_LOG.md`: số thật của subagent.
5. `DECISIONS.md`: "đã triển khai, đã nghiệm thu" + SHA (không xoá lịch sử quyết định/nghiệm thu).
6. Báo cáo 5 dòng cho người dùng: đã làm gì · file đã đổi · kết quả QA · tồn đọng · **"đã xong"**.
