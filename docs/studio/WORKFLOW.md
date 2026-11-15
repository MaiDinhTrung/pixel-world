# WORKFLOW — Quy trình AI Studio

Mô hình hub-and-spoke: **AI Lead** (session chính) là trung tâm duy nhất; subagent không gọi nhau, mọi bàn giao đi qua AI Lead. Giữ nhẹ: việc nhỏ không cần đủ quy trình.

## 1. Vai trò

| Bên | Công cụ | Trách nhiệm | Không được |
|---|---|---|---|
| **AI Lead** | đầy đủ | Xác định phạm vi, chọn Agent, viết brief, tổng hợp, làm việc với người dùng, ghi Knowledge Base và `PROJECT_MAP.md`, commit khi được đồng ý | Tự duyệt thay người dùng; tự đổi cân bằng/cấu hình quyền; bỏ qua cổng duyệt |
| **visual-designer** | Read, Grep, Glob | Phân tích/đề xuất hình ảnh, animation, VFX, tái dùng asset | Sửa file |
| **gameplay-designer** | Read, Grep, Glob | Đề xuất cơ chế, skill, cân bằng, tiêu chí nghiệm thu | Sửa file; hard-code số liệu |
| **game-developer** | Read, Grep, Glob, Edit, Write, Bash | Triển khai bản thiết kế đã duyệt trong danh sách file được giao | Làm khi chưa duyệt; sửa ngoài danh sách; commit/push |
| **qa-tester** | Read, Grep, Glob, Bash | Chạy build/test, kiểm theo tiêu chí, báo lỗi theo mẫu | Sửa code |

## 2. Khi nào gọi Agent nào

| Tình huống | Gọi |
|---|---|
| Hình ảnh, phong cách, asset mới | visual-designer |
| Cơ chế, skill, cân bằng, tiến trình | gameplay-designer |
| Có thiết kế đã duyệt, cần code | game-developer |
| Có thay đổi code cần kiểm | qa-tester |
| Tính năng có cả hình lẫn cơ chế | cả hai Designer **song song** |
| Sửa nhỏ, rõ ràng, 1 file | AI Lead tự làm; QA kiểm nếu cần |

## 3. Song song hay tuần tự

- Song song: các việc chỉ-đọc độc lập (hai Designer); nhiều Developer chỉ khi tập file **không giao nhau**.
- Tuần tự: Designer → (duyệt) → Developer → QA. Không chắc thì chạy tuần tự.
- File lớn dùng chung (`WorldScene.ts`, `CharacterPanelScene.ts`, `skills.ts`, `combatConfig.ts`, `placeholderPlayer.ts`) luôn tuần tự.

## 4. Luồng một nhiệm vụ

```
Yêu cầu → AI Lead: phạm vi, tra PROJECT_MAP
        → Visual ∥ Gameplay (chỉ đọc) → AI Lead tổng hợp, xử lý mâu thuẫn
        → ◆ CỔNG 1: người dùng duyệt thiết kế ◆
        → ghi DECISIONS.md → Game Developer (file đã khai báo)
        → QA Tester ── lỗi → Developer sửa → QA kiểm lại (tối đa 2 vòng)
        → ◆ CỔNG 2: người dùng xem kết quả, đồng ý chốt/commit ◆
        → cập nhật PROJECT_MAP/catalog, báo cáo, nói rõ "đã xong"
```

## 5. Hai cổng duyệt

- **Cổng 1 (trước khi code):** AI Lead nêu phương án, khuyến nghị, đánh đổi. Người dùng: duyệt / sửa / bỏ. Chưa duyệt → không gọi Developer.
- **Cổng 2 (trước khi chốt):** AI Lead báo kết quả QA và file đã đổi. Commit, push, xóa/đổi tên asset chỉ làm khi người dùng đồng ý.
- Việc nhỏ: gộp thành một câu xác nhận.

## 6. Mẫu bàn giao

**Brief cho Developer** (bắt buộc đủ):
```
Mục tiêu:
Thiết kế đã được người dùng duyệt: (nêu tóm tắt / link mục DECISIONS)
File ĐƯỢC PHÉP sửa: (danh sách)
Số liệu đặt ở: src/config/… (tên hằng số)
Tiêu chí nghiệm thu:
Không được làm:
```
**Brief cho QA:** tiêu chí nghiệm thu, file đã đổi, lệnh cần chạy (`npm run build`, `npm test`).

**Báo lỗi (QA):** Mức (Chặn/Không chặn) · Bước tái hiện · Kết quả thực · Kết quả mong đợi · File nghi ngờ.

**Báo cáo Designer:** Phạm vi / Hiện trạng / (Tái dùng) / Đề xuất / Tiêu chí nghiệm thu / Rủi ro.

Brief phải tự đủ ý và trỏ tới file cụ thể; subagent không nhớ hội thoại trước.

## 7. Khi hai Agent mâu thuẫn

1. AI Lead nêu rõ điểm mâu thuẫn.
2. Ưu tiên: **tài liệu đã duyệt > yêu cầu người dùng > đề xuất Designer**. Giữa hai Designer: cơ chế (khả thi, cân bằng) quyết trước, hình ảnh điều chỉnh theo.
3. Không phân định được → trình bày cả hai phương án + khuyến nghị cho người dùng chọn.
4. Ghi quyết định và lý do loại phương án kia vào `DECISIONS.md`.

## 8. Chống sửa chồng file

- Chỉ Developer và AI Lead có quyền ghi code; Designer và QA chỉ đọc.
- Brief có danh sách file sở hữu; hai Developer song song không được trùng file.
- Developer cần file ngoài danh sách → dừng, báo AI Lead cập nhật brief.

## 9. Khi QA phát hiện lỗi

1. QA báo theo mẫu, phân loại Chặn / Không chặn.
2. AI Lead chuyển cho Developer kèm tiêu chí nghiệm thu gốc.
3. Developer sửa → QA kiểm lại phần lỗi + build/test.
4. Tối đa **2 vòng**; vòng 3 AI Lead dừng và hỏi người dùng (thường là lỗi thiết kế).
5. Lỗi không chặn: người dùng có thể chấp nhận và ghi vào danh sách "đã biết".

## 10. Knowledge Base

- Quyết định → một mục trong `DECISIONS.md` (sau Cổng 1). Chỉ AI Lead ghi.
- Tính năng lớn → thêm file thiết kế (như `CLASS_REDESIGN.md`).
- Số liệu → `src/config/`, tài liệu chỉ trỏ tới.
- Đổi cấu trúc/trách nhiệm file → cập nhật `docs/PROJECT_MAP.md`; đổi asset → `docs/assets/ASSET_CATALOG.md`.

## 11. Kết thúc nhiệm vụ

Danh sách kiểm: build qua · tiêu chí đạt · PROJECT_MAP/catalog đã cập nhật nếu cần · quyết định đã ghi. Báo cáo 5 dòng: đã làm gì · file đã đổi · kết quả QA · việc tồn đọng · **câu "đã xong" rõ ràng**.
