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
        → ghi DECISIONS.md → BASELINE Git (§6a: cây tracked phải sạch)
        → Game Developer (ĐƯỢC SỬA / ĐƯỢC TẠO đã khai báo)
        → QA Tester (nhận baseline + 2 danh sách, tự git diff/status) ── lỗi → Developer sửa → QA kiểm lại (tối đa 2 vòng, baseline giữ nguyên)
        → PLAYTEST (§9a): Lead hướng dẫn chạy game + checklist → người dùng chơi thử
        → có phản hồi → FEEDBACK LOOP (§9b): phân tích → đề xuất + tiêu chí → ◆ người dùng duyệt ◆ → Developer sửa → QA kiểm lại → người dùng chơi thử lại (lặp tới khi nghiệm thu)
        → ◆ CỔNG 2: người dùng đã nghiệm thu, đồng ý chốt/commit ◆
        → cập nhật PROJECT_MAP/catalog, báo cáo, nói rõ "đã xong"
```

## 5. Hai cổng duyệt

- **Cổng 1 (trước khi code):** AI Lead nêu phương án, khuyến nghị, đánh đổi. Người dùng: duyệt / sửa / bỏ. Chưa duyệt → không gọi Developer.
- **Cổng 2 (trước khi chốt):** AI Lead báo kết quả QA, kết quả Playtest (§9a–§9b) và file đã đổi. Chỉ chốt sau khi người dùng đã chơi thử và nghiệm thu. Commit, push, xóa/đổi tên asset chỉ làm khi người dùng đồng ý.
- Việc nhỏ: gộp thành một câu xác nhận.

## 6. Mẫu bàn giao

**Brief cho Developer** (bắt buộc đủ):
```
Mục tiêu:
Thiết kế đã được người dùng duyệt: (nêu tóm tắt / link mục DECISIONS)
BASELINE: (dán nguyên văn dòng baseline từ §6a)
File ĐƯỢC SỬA (đã tồn tại): (danh sách đường dẫn)
File ĐƯỢC TẠO (chưa tồn tại): (đường dẫn hoặc mẫu; gồm cả PROJECT_MAP/catalog nếu cần cập nhật)
Số liệu đặt ở: src/config/… (tên hằng số)
Tiêu chí nghiệm thu:
Không được làm: (luôn gồm: commit/push; sửa hoặc tạo ngoài hai danh sách; vùng cấm ở §8)
```
**Brief cho QA** (bắt buộc đủ): tiêu chí nghiệm thu · BASELINE nguyên văn · hai danh sách ĐƯỢC SỬA / ĐƯỢC TẠO nguyên văn như đã duyệt · lệnh cần chạy (`npm run build`, `npm test`, `npx tsc --noEmit`). **Không** đưa danh sách "file đã đổi" do Developer khai: QA tự lấy từ git (§6a) để phép kiểm không bị vòng tròn.

**Báo lỗi (QA):** Mức (Chặn/Không chặn) · Bước tái hiện · Kết quả thực · Kết quả mong đợi · File nghi ngờ.

**Báo cáo Designer:** Phạm vi / Hiện trạng / (Tái dùng) / Đề xuất / Tiêu chí nghiệm thu / Rủi ro.

Brief phải tự đủ ý và trỏ tới file cụ thể; subagent không nhớ hội thoại trước.

## 6a. Baseline Git và kiểm phạm vi

**Lead lập baseline trước khi giao Developer:**
1. Chạy `git rev-parse HEAD`, `git branch --show-current`, `git status --porcelain --untracked-files=no`.
2. **Cây tracked phải sạch** (lệnh thứ ba không in gì). Chưa sạch → Lead **không** gọi Developer: báo người dùng file nào đang dơ và xin ý kiến (commit / stash / hoàn tác / chấp nhận). Lead không tự quyết.
   - **Ngoại lệ có chủ đích:** nếu người dùng chỉ thị rõ vẫn tiếp tục khi cây chưa sạch, baseline phải liệt kê từng file tracked đang dơ kèm `git hash-object <file>` (và hash của file untracked mà Developer được phép SỬA). QA đối chiếu hash từng file; file không đổi hash coi như không bị đụng. Ghi ngoại lệ này vào báo cáo.
3. Chạy `git ls-files --others --exclude-standard` để biết file untracked có sẵn; ghi dưới dạng mẫu thư mục (ví dụ `docs/references/visual/**`, kèm số lượng). Đây không phải kết quả của Developer.
4. Dán một dòng vào mọi brief của nhiệm vụ:
```
BASELINE: HEAD=<sha đầy đủ> · nhánh=<tên> · tracked sạch · untracked có sẵn: <mẫu> (<số lượng>)
```
Baseline lập **một lần cho cả nhiệm vụ** và giữ nguyên qua hai vòng sửa lỗi (§9); chỉ lập lại khi bắt đầu nhiệm vụ mới.

**QA tự kiểm phạm vi** (không dùng lời khai của Developer):
1. `git rev-parse HEAD` phải bằng HEAD trong baseline. Khác = có commit ngoài ý muốn → lỗi **Chặn**.
2. `git diff --name-status HEAD` → file tracked bị sửa / xóa / đổi tên.
3. `git ls-files --others --exclude-standard` (hoặc `git status --porcelain --untracked-files=all`) → file mới; **trừ** các mẫu untracked có sẵn trong baseline. Lưu ý: git bọc đường dẫn có ký tự ngoài ASCII hoặc khoảng trắng trong dấu `"` kèm escape; bỏ dấu `"` đầu dòng khi so với mẫu baseline, kẻo file cũ bị tính nhầm là file mới.
4. Phân loại từng đường dẫn đã đổi:
   - file tracked nằm trong ĐƯỢC SỬA, hoặc file mới nằm trong ĐƯỢC TẠO → Đạt;
   - ngoài cả hai danh sách → lỗi **Chặn** "ngoài phạm vi";
   - thuộc vùng cấm (§8) → lỗi **Chặn**, kể cả khi có trong brief;
   - có trong danh sách nhưng không đổi, hoặc đặt sai danh sách (mới mà ở ĐƯỢC SỬA, v.v.) → ghi chú, không phải lỗi chặn.
5. Giới hạn phải ghi vào mục "Chưa kiểm được": file bị `.gitignore` (`dist/`, `*.local`) không hiện trong git. `git diff` cũng **không thấy** file untracked bị sửa; với file untracked trong ĐƯỢC SỬA hoặc trong baseline, QA so `git hash-object` với hash ghi trong baseline.
6. **Dọn file tạm:** Developer và QA không có công cụ xóa. File tạm/thử nghiệm do Developer tạo (nếu có trong ĐƯỢC TẠO) do AI Lead xóa sau khi QA xong và đã báo người dùng; file đã xóa không còn là bằng chứng nên Lead ghi tên file vào báo cáo trước khi xóa. Lead chỉ xóa đúng các đường dẫn nằm trong ĐƯỢC TẠO.
7. Brief thiếu BASELINE hoặc thiếu một trong hai danh sách → tiêu chí phạm vi là "Chưa kiểm được"; QA không tự suy ra danh sách.

## 7. Khi hai Agent mâu thuẫn

1. AI Lead nêu rõ điểm mâu thuẫn.
2. Ưu tiên: **tài liệu đã duyệt > yêu cầu người dùng > đề xuất Designer**. Giữa hai Designer: cơ chế (khả thi, cân bằng) quyết trước, hình ảnh điều chỉnh theo.
3. Không phân định được → trình bày cả hai phương án + khuyến nghị cho người dùng chọn.
4. Ghi quyết định và lý do loại phương án kia vào `DECISIONS.md`.

## 8. Chống sửa chồng file và cưỡng chế quyền

- Chỉ Developer và AI Lead có quyền ghi code; Designer và QA chỉ đọc.
- Brief có hai danh sách ĐƯỢC SỬA / ĐƯỢC TẠO; hai Developer song song không được trùng file.
- Developer cần file ngoài hai danh sách → dừng, báo AI Lead cập nhật brief.
- **Developer không tự quyết commit/push.** Commit chỉ ở Cổng 2, do AI Lead làm sau khi người dùng đồng ý.

**Cưỡng chế ở tầng harness** (`.claude/settings.json` + hook `.claude/hooks/studio-guard.mjs`, không chỉ dựa vào prompt):
- `qa-tester`, `game-developer` và mọi subagent khác chỉ chạy được Bash trong allowlist: `npm test`, `npm run build`, `npx tsc --noEmit`, `npx vitest run --root . [src/**/*.test.ts]`, và git chỉ-đọc (`status`, `diff`, `log`, `show`, `ls-files`, `rev-parse`, `hash-object`, `branch --show-current`). Hook kiểm **toàn bộ chuỗi lệnh**: không ghép lệnh (`; & |`), không chuyển hướng (`< >`), không `$()`/backtick, không dấu nháy/xuống dòng, không `git -C`/`-c`, không tham số ghi file (`--output`…), không PowerShell. Cần lệnh khác → báo AI Lead.
- Chỉ `game-developer` được Edit/Write. Vùng cấm với Developer: `.claude/`, `CLAUDE.md`, `docs/studio/DECISIONS.md`, `.git/`, `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.*`, `.env*`, `.gitignore`, `node_modules/`, `dist/`. Hook **không** kiểm hai danh sách ĐƯỢC SỬA/ĐƯỢC TẠO; phần đó do brief + QA đối chiếu (§6a).
- Subagent thiếu `agent_type`, payload hỏng hoặc hook lỗi → chặn (fail-closed). AI Lead không bị hook can thiệp; luật quyền trong settings vẫn áp dụng cho Lead.
- `git clean` bị deny; `git add/commit/push/reset/checkout/restore/stash/rebase/merge/branch -D` ở mức ask.
- Hook **không phải sandbox**: Developer vẫn viết được mã chạy qua `npm test`/`npm run build`. Lớp phát hiện còn lại là QA đối chiếu git diff với danh sách đã duyệt.
- Đổi `.claude/settings.json`, hook hoặc Agent là việc của AI Lead/người dùng qua Cổng 1, Developer không được sửa.

## 9. Khi QA phát hiện lỗi

1. QA báo theo mẫu, phân loại Chặn / Không chặn.
2. AI Lead chuyển cho Developer kèm tiêu chí nghiệm thu gốc.
3. Developer sửa → QA kiểm lại phần lỗi + build/test + phạm vi (§6a). **Baseline và hai danh sách giữ nguyên** qua cả hai vòng; muốn đổi danh sách thì AI Lead cập nhật brief và báo người dùng.
4. Tối đa **2 vòng**; vòng 3 AI Lead dừng và hỏi người dùng (thường là lỗi thiết kế).
5. Lỗi không chặn: người dùng có thể chấp nhận và ghi vào danh sách "đã biết".

## 9a. Playtest (sau khi QA đạt)

QA và Developer không chơi được game; phần hình ảnh, cảm giác, cân bằng và cảm ứng chỉ người dùng kiểm được. Khi QA đạt (không còn lỗi Chặn), AI Lead **không** chốt mà đưa người dùng đi chơi thử:
1. **Cách chạy:** `npm run dev`, mở địa chỉ Vite in ra ở terminal. Nêu rõ điều kiện cần để thấy tính năng (nhân vật, vũ khí/kỹ năng cần có và cách lấy, vị trí trong game) và tham số URL hữu ích nếu liên quan (ví dụ `?time=night`, `?perf`, phím N đổi ngày/đêm).
2. **Checklist chơi thử:** mỗi dòng một hành động + kết quả mong đợi. Lấy từ tiêu chí nghiệm thu loại "phải chơi thật" và mọi mục QA ghi "Chưa kiểm bằng cách chơi thật"; thêm ca biên và hồi quy liên quan (vũ khí/hệ thống lân cận), PC và cảm ứng nếu có.
3. **Giới hạn nói thẳng:** agent không chơi được game; thông số mới chỉ là giá trị khởi điểm (nêu file `src/config/` để chỉnh); lỗi đã biết còn tồn đọng.
4. **Mẫu phản hồi:** từng mục Đạt / Chưa đạt + mô tả cảm nhận hoặc bước tái hiện (ảnh chụp nếu có).
AI Lead không tuyên bố "đạt" phần hình ảnh/cảm giác khi người dùng chưa xác nhận; `DECISIONS.md` ghi trạng thái "chờ chơi thử" cho tới khi nghiệm thu.

## 9b. Feedback Loop (phản hồi sau Playtest)

1. **Tiếp nhận:** ghi lại nguyên phản hồi, phân loại: *Lỗi* (sai tiêu chí đã duyệt) · *Chỉnh thông số* (giá trị ở `src/config/`) · *Đổi thiết kế* (khác thiết kế đã duyệt) · *Ngoài phạm vi* (ghi lại, không làm lần này).
2. **Phân tích:** AI Lead đọc code liên quan, nêu nguyên nhân; cần chuyên môn hình ảnh/cân bằng thì gọi Designer tương ứng (chỉ đọc).
3. **Đề xuất:** phương án + đánh đổi + khuyến nghị, danh sách ĐƯỢC SỬA / ĐƯỢC TẠO (cập nhật brief) và **tiêu chí nghiệm thu mới kiểm chứng được**.
4. **◆ Chờ người dùng duyệt.** Chưa duyệt → không gọi Developer. Đổi thiết kế thì ghi `DECISIONS.md`; chỉnh thông số nhỏ có thể gộp thành một câu xác nhận (§5).
5. **Developer sửa** đúng phạm vi đã duyệt. Baseline: nếu tính năng chưa commit thì giữ baseline cũ kèm hash các file đang dơ (§6a); đã commit thì lập baseline mới.
6. **QA kiểm lại:** phần đã sửa + build/test + hồi quy + phạm vi (§6a).
7. **Người dùng chơi thử lại** (§9a rút gọn: mục đã sửa + hồi quy). Chưa đạt → quay lại bước 1; đạt → **nghiệm thu**.
Mỗi vòng phản hồi là vòng riêng, không tính vào trần 2 vòng sửa lỗi của §9.
Nghiệm thu xong mới sang Cổng 2; `DECISIONS.md` cập nhật "đã triển khai, đã nghiệm thu".

## 10. Knowledge Base

- Quyết định → một mục trong `DECISIONS.md` (sau Cổng 1). Chỉ AI Lead ghi.
- Tính năng lớn → thêm file thiết kế (như `CLASS_REDESIGN.md`).
- Số liệu → `src/config/`, tài liệu chỉ trỏ tới.
- Đổi cấu trúc/trách nhiệm file → cập nhật `docs/PROJECT_MAP.md`; đổi asset → `docs/assets/ASSET_CATALOG.md`.

## 11. Kết thúc nhiệm vụ

Danh sách kiểm: build qua · tiêu chí đạt · người dùng đã chơi thử và nghiệm thu (§9a–§9b) · PROJECT_MAP/catalog đã cập nhật nếu cần · quyết định đã ghi. Báo cáo 5 dòng: đã làm gì · file đã đổi · kết quả QA · việc tồn đọng · **câu "đã xong" rõ ràng**.
