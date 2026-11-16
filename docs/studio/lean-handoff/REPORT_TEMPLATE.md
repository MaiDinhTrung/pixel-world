# MẪU BÁO CÁO AGENT (Lean Handoff, thử nghiệm)

Áp dụng cho Developer, QA và Designer từ M4. Tối đa **10 dòng** (WORKFLOW §12.3; thay giới hạn ~40 dòng thử nghiệm; mỗi mục dưới đây một dòng). Viết theo ID tiêu chí của Feature Brief; không chép lại brief hay spec. Lead chỉ đọc bản này; chi tiết thêm Lead hỏi lại bằng tin nhắn tiếp theo cho cùng agent.

## Khung chung (mọi vai)
```
Vai: <Developer|QA|Designer> · Gói: <ID> · Brief: <đường dẫn>
KẾT LUẬN: <ĐẠT | CHƯA ĐẠT (nêu số lỗi Chặn) | DỪNG (cần file ngoài danh sách)>
BASELINE: <HEAD đã kiểm> (khớp/không khớp)
```
Nhãn bắt buộc: **[XM]** đã kiểm bằng lệnh/đọc code, **[SUY]** suy luận, **[?]** chưa biết. Không trộn.

## Developer
```
1. FILE: sửa <n> / tạo <m> — liệt kê đường dẫn (không mô tả từng file)
2. LỆNH: build <đạt/lỗi> · tsc <đạt/lỗi> · test <số đạt>/<tổng>/<số file>
3. TIÊU CHÍ: <ID>: <Đạt/Không/Chưa kiểm> — bằng chứng 1 dòng (tên test hoặc lệnh)
4. LỆCH SO VỚI BRIEF: <rỗng hoặc từng mục 1–2 dòng>
5. CHƯA KIỂM ĐƯỢC: <các mục chỉ chơi thật/ngoài khả năng>
6. CẦN LEAD: <cập nhật tài liệu, quyết định, file ngoài danh sách>
```

## QA
Báo cáo QA điền **mục E của QA Verification Plan** (`QA_PLAN_TEMPLATE.md`; ví dụ `M4_QA_PLAN.md`): PASS/BLOCKED, passed/failed theo ID `QA-xx`, findings ngoài checklist, chưa thể xác minh, kết luận độc lập. Khung dưới là cách trình bày gọn của cùng nội dung.
```
1. LỆNH: build/tsc/test (số) · HEAD khớp baseline? (Có/Không)
2. PHẠM VI (từ git, không từ lời khai Developer): <n> sửa / <m> tạo / D,R: 0 / ngoài danh sách: 0 / vùng cấm: 0
   — chỉ liệt kê đường dẫn nếu có điểm bất thường
3. TIÊU CHÍ A (xác định): <ID>: Đạt/Không — 1 dòng
4. TIÊU CHÍ Q (độc lập): <ID>: Đạt/Không/Rủi ro — nêu bằng chứng (file:dòng)
5. LỖI: mức · bước tái hiện · thực tế · mong đợi · file — chỉ lỗi thật; ghi chú không chặn gộp 1 dòng/mục
6. CHƯA KIỂM ĐƯỢC (P): <danh sách>
```
QA vẫn **không** nhận danh sách "file đã đổi" của Developer (WORKFLOW §6a).

## Designer
```
1. QUYẾT ĐỊNH ĐỀ XUẤT: <bảng ngắn: mục / khuyến nghị / phương án bị loại>
2. SỐ LIỆU: <hằng src/config/ + giá trị khởi điểm> [XM]/[SUY]
3. TIÊU CHÍ NGHIỆM THU: A (xác định) / Q (độc lập) / P (chơi thật)
4. RỦI RO và [?]: <tối đa 5 dòng>
5. CẦN NGƯỜI DÙNG CHỌN: <câu hỏi + khuyến nghị>
```

## Quy tắc chung
- Tối đa 10 dòng; bảng và danh sách ngắn thay đoạn văn. Không lặp tên file nhiều lần.
- Không đính kèm nội dung file hay log dài; chỉ số, đường dẫn:dòng, tên test.
- Lỗi Chặn lên đầu. Nếu báo cáo vượt 10 dòng, ưu tiên: kết luận, lỗi Chặn, lệch so với brief, chưa kiểm được.
- Kiểm tự động (build/tsc/test, `git diff`, phạm vi file) ghi bằng số; phần đánh giá hành vi/thiết kế vẫn do QA độc lập làm và không được bỏ.
