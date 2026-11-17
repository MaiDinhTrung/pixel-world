# MẪU — Báo cáo của Agent (≤ 10 dòng)

Mọi subagent trả kết quả cho **AI Lead** đúng khung của vai mình dưới đây; không tự thiết kế định dạng khác. Tối đa **10 dòng**, mỗi mục một dòng, kết luận trước, lỗi Chặn trước (WORKFLOW §12.3). Không dán log/nội dung file dài; chỉ số, `đường dẫn:dòng`, tên test.
Nhãn bằng chứng: **[XM]** đã kiểm bằng lệnh/đọc code · **[SUY]** suy luận · **[?]** chưa biết. Không trộn.
Lead cần thêm chi tiết → hỏi lại cùng agent bằng `SendMessage`, không gọi agent mới.

Dòng đầu chung cho mọi vai:
```
Vai: <Developer|QA|Gameplay|Visual> · Gói: <ID> · Brief: <đường dẫn> · KẾT LUẬN: <ĐẠT | CHƯA ĐẠT (n lỗi Chặn) | DỪNG (lý do)>
```

## Developer (game-developer) → Lead
Đầu vào: Feature Brief (`templates/FEATURE_BRIEF.md`). Nhận: Lead (chuyển QA, không kèm mục 1).
```
1. FILE: sửa <n> / tạo <m> — đường dẫn (không mô tả từng file)
2. LỆNH: build <đạt/lỗi> · tsc <đạt/lỗi> · test <đạt>/<tổng>/<số file>
3. TIÊU CHÍ: <ID A>: Đạt/Không/Chưa kiểm — bằng chứng 1 dòng
4. CẤU TRÚC ĐỔI: <không | file thêm/xoá/đổi tên/đổi trách nhiệm → codemap <file>.md>
5. LỆCH SO VỚI BRIEF: <rỗng | từng mục>
6. CHƯA KIỂM ĐƯỢC: <mục chỉ chơi thật>
7. CẦN LEAD: <quyết định, file ngoài danh sách, tài liệu>
```

## QA (qa-tester) → Lead
Đầu vào: cùng Feature Brief (BASELINE + 2 danh sách nguyên văn). Nhận: Lead (→ Developer nếu lỗi; → playtest nếu ĐẠT).
QA tự lấy phạm vi từ git (WORKFLOW §6a), **không** dùng danh sách file của Developer.
```
1. LỆNH: build/tsc/test (số) · HEAD khớp baseline? Có/Không
2. PHẠM VI (git): <n> sửa / <m> tạo / D,R: <k> / Lead (mẫu đã khai): <l> / ngoài danh sách: <x> / vùng cấm: <y> — chỉ liệt kê đường dẫn khi bất thường
3. TIÊU CHÍ A: <ID>: Đạt/Không — 1 dòng
4. TIÊU CHÍ Q: <ID>: Đạt/Không/Rủi ro — file:dòng
5. HỒI QUY: <mục C>: Đạt/Rủi ro
6. LỖI: mỗi lỗi 1 dòng — Mức (Chặn/Không chặn) · bước tái hiện · thực tế · mong đợi · file:dòng
7. CẤU TRÚC: diff có A/D/R? → codemap cần cập nhật: <file | không>
8. FINDINGS NGOÀI CHECKLIST + CHƯA KIỂM ĐƯỢC (P): …
9. KẾT LUẬN ĐỘC LẬP: PASS (không lỗi Chặn) / BLOCKED
```
Mục 8–9 bắt buộc kể cả khi mọi tiêu chí Đạt.

## Gameplay Designer (gameplay-designer) → Lead
Đầu vào: brief khảo sát (`templates/LEAD.md` §A). Nhận: Lead (tổng hợp vào đề xuất Cổng 1).
```
1. HIỆN TRẠNG: <cơ chế hiện có, file:dòng> [XM]
2. ĐỀ XUẤT: mục · khuyến nghị · phương án bị loại (vì…)
3. SỐ LIỆU: hằng src/config/<file> = giá trị khởi điểm [XM]/[SUY]
4. FILE ẢNH HƯỞNG: <đường dẫn> (codemap: <file>.md)
5. TIÊU CHÍ: A (máy) / Q (QA đọc) / P (chơi thật)
6. RỦI RO + [?]: ≤ 3 dòng
7. CẦN NGƯỜI DÙNG CHỌN: câu hỏi + khuyến nghị
```

## Visual Designer (visual-designer) → Lead
Đầu vào: brief khảo sát (`templates/LEAD.md` §A) + `docs/assets/ASSET_CATALOG.md`. Nhận: Lead.
```
1. HIỆN TRẠNG: asset/texture/anim liên quan, key + file [XM]
2. TÁI DÙNG: key có sẵn dùng được (catalog) — ưu tiên trước asset mới
3. ĐỀ XUẤT: mục · khuyến nghị · phương án bị loại
4. ASSET MỚI (nếu không tránh được): tên theo ASSET_NAMING.md · kích thước · frame · palette (COLOR_PALETTE.md)
5. SỐ LIỆU HÌNH: hằng src/config/<vfxConfig|…> = giá trị khởi điểm
6. TIÊU CHÍ P (nhìn thấy khi chơi) + rủi ro hiệu năng mobile
7. CẦN NGƯỜI DÙNG CHỌN: câu hỏi + khuyến nghị
```

## Mẫu báo lỗi (một lỗi) — dùng chung QA và playtest
`Mức: Chặn/Không chặn · Bước tái hiện · Kết quả thực · Kết quả mong đợi · File nghi ngờ (đường dẫn:dòng, đã xác nhận)`
Chặn = build hỏng, crash, tiêu chí cốt lõi hỏng, ngoài phạm vi, vùng cấm, HEAD khác baseline.
