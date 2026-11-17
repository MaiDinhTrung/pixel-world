# WORKFLOW — Quy trình AI Studio

Mô hình hub-and-spoke: **AI Lead** (session chính) là trung tâm duy nhất; subagent không gọi nhau, mọi bàn giao đi qua AI Lead. Giữ nhẹ: việc nhỏ không cần đủ quy trình; phân cấp S/M/L/XL (Lean) ở §12; vòng đời nhiệm vụ + Task Map + Codebase Map ở §13; chế độ tự chủ ở §14.

## 0. Khởi động phiên (AI Lead)
1. Đọc `docs/studio/CURRENT_TASK.md` → chỉ đọc Task Map của nhiệm vụ đang làm (`docs/studio/tasks/<ID>_*.md`). Không đọc Task Map khác, không đọc lại DECISIONS/brief cũ trừ khi Task Map trỏ tới.
2. `git status` + `git log -3` để đối chiếu với Task Map (bước nào đã DONE, có gì chưa commit).
3. Nhiệm vụ mới → §13. Định dạng mọi đầu ra: `docs/studio/templates/README.md`.

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
Yêu cầu → AI Lead: phạm vi, tra PROJECT_MAP → codemap, tạo Task Map (§13)
        → Visual ∥ Gameplay (chỉ đọc) → AI Lead tổng hợp, xử lý mâu thuẫn
        → ◆ CỔNG 1: người dùng duyệt thiết kế ◆
        → ghi DECISIONS.md → BASELINE Git (§6a: cây tracked phải sạch)
        → Game Developer (ĐƯỢC SỬA / ĐƯỢC TẠO đã khai báo)
        → QA Tester (nhận baseline + 2 danh sách, tự git diff/status) ── lỗi → Developer sửa → QA kiểm lại (tối đa 2 vòng, baseline giữ nguyên)
        → PLAYTEST (§9a): Lead hướng dẫn chạy game + checklist → người dùng chơi thử
        → có phản hồi → FEEDBACK LOOP (§9b): phân tích → đề xuất + tiêu chí → ◆ người dùng duyệt ◆ → Developer sửa → QA kiểm lại → người dùng chơi thử lại (lặp tới khi nghiệm thu)
        → ◆ CỔNG 2: người dùng đã nghiệm thu, đồng ý chốt/commit ◆
        → cập nhật codemap/PROJECT_MAP/catalog, đóng Task Map, báo cáo, nói rõ "đã xong"
```

## 5. Hai cổng duyệt

- **Cổng 1 (trước khi code):** AI Lead nêu phương án, khuyến nghị, đánh đổi. Người dùng: duyệt / sửa / bỏ. Chưa duyệt → không gọi Developer.
- **Cổng 2 (trước khi chốt):** AI Lead báo kết quả QA, kết quả Playtest (§9a–§9b) và file đã đổi. Chỉ chốt sau khi người dùng đã chơi thử và nghiệm thu. Commit, push, xóa/đổi tên asset chỉ làm khi người dùng đồng ý.
- Việc nhỏ: gộp thành một câu xác nhận.

## 6. Mẫu bàn giao

Mẫu là nguồn duy nhất cho định dạng (không chép lại ở đây): **`docs/studio/templates/`** — bảng "agent nào dùng mẫu nào, khi nào, đầu vào, đầu ra, ai nhận" ở `templates/README.md`.
- **Brief cho Developer và QA:** một file `templates/FEATURE_BRIEF.md` (Brief + QA Plan). Bắt buộc đủ: mục tiêu · dòng "đã duyệt" · BASELINE nguyên văn (§6a) · ĐƯỢC SỬA · ĐƯỢC TẠO · số liệu ở `src/config/` · tiêu chí · không được làm (luôn gồm commit/push, ngoài hai danh sách, vùng cấm §8). **Không** đưa danh sách "file đã đổi" do Developer khai cho QA: QA tự lấy từ git (§6a).
- **Brief khảo sát cho Designer, đề xuất Cổng 1, báo cáo Cổng 2, đóng nhiệm vụ:** `templates/LEAD.md`.
- **Báo cáo Developer / QA / Gameplay / Visual + mẫu báo lỗi** (Mức · Bước tái hiện · Kết quả thực · Kết quả mong đợi · File nghi ngờ): `templates/AGENT_REPORTS.md`.
- **Checklist playtest:** `templates/PLAYTEST.md`. **Task Map:** `templates/TASK_MAP.md`.

Brief phải tự đủ ý và trỏ tới file cụ thể (codemap + đường dẫn); subagent không nhớ hội thoại trước.

## 6a. Baseline Git và kiểm phạm vi

**Lead lập baseline trước khi giao Developer:**
1. Chạy `git rev-parse HEAD`, `git branch --show-current`, `git status --porcelain --untracked-files=no`.
2. **Cây tracked phải sạch** (lệnh thứ ba không in gì). Chưa sạch → Lead **không** gọi Developer: báo người dùng file nào đang dơ và xin ý kiến (commit / stash / hoàn tác / chấp nhận). Lead không tự quyết.
   - **Ngoại lệ có chủ đích:** nếu người dùng chỉ thị rõ vẫn tiếp tục khi cây chưa sạch, baseline phải liệt kê từng file tracked đang dơ kèm `git hash-object <file>` (và hash của file untracked mà Developer được phép SỬA). QA đối chiếu hash từng file; file không đổi hash coi như không bị đụng. Ghi ngoại lệ này vào báo cáo.
   - **Tài liệu Lead (ST-02):** Lead ưu tiên commit tài liệu của mình **trước** khi lập baseline (Cổng 2 gọn, một câu xác nhận). Nếu buộc phải sửa tài liệu **trong lúc** Developer làm (Task Map, DECISIONS, PROJECT_MAP/codemap, playtest…), dòng BASELINE thêm `· tài liệu Lead: <mẫu đường dẫn>` — chỉ được nằm trong `docs/**` (vd `docs/studio/**`, `docs/codemap/**`, `docs/PROJECT_MAP.md`). Các đường dẫn này: Developer **không** được sửa/tạo (nằm trong KHÔNG đụng của brief); QA xếp loại **"Lead"** (không phải "ngoài phạm vi", không phải lỗi) và ghi một dòng trong báo cáo; đường dẫn đổi ngoài mẫu đã khai vẫn là lỗi Chặn. File đã dơ **trước** khi lập baseline không thuộc quy tắc này — vẫn theo ngoại lệ hash ở trên.
3. Chạy `git ls-files --others --exclude-standard` để biết file untracked có sẵn; ghi dưới dạng mẫu thư mục (ví dụ `docs/references/visual/**`, kèm số lượng). Đây không phải kết quả của Developer.
4. Dán một dòng vào mọi brief của nhiệm vụ:
```
BASELINE: HEAD=<sha đầy đủ> · nhánh=<tên> · tracked sạch · untracked có sẵn: <mẫu> (<số lượng>) [· tài liệu Lead: <mẫu docs/**>]
```
Baseline lập **một lần cho cả nhiệm vụ** và giữ nguyên qua hai vòng sửa lỗi (§9); chỉ lập lại khi bắt đầu nhiệm vụ mới.

**QA tự kiểm phạm vi** (không dùng lời khai của Developer):
1. `git rev-parse HEAD` phải bằng HEAD trong baseline. Khác = có commit ngoài ý muốn → lỗi **Chặn**.
2. `git diff --name-status HEAD` → file tracked bị sửa / xóa / đổi tên.
3. `git ls-files --others --exclude-standard` (hoặc `git status --porcelain --untracked-files=all`) → file mới; **trừ** các mẫu untracked có sẵn trong baseline. Lưu ý: git bọc đường dẫn có ký tự ngoài ASCII hoặc khoảng trắng trong dấu `"` kèm escape; bỏ dấu `"` đầu dòng khi so với mẫu baseline, kẻo file cũ bị tính nhầm là file mới.
4. Phân loại từng đường dẫn đã đổi:
   - file tracked nằm trong ĐƯỢC SỬA, hoặc file mới nằm trong ĐƯỢC TẠO → Đạt;
   - khớp mẫu `tài liệu Lead` đã khai trong BASELINE → loại **"Lead"**, ghi chú, không phải lỗi;
   - ngoài cả hai danh sách (và ngoài mẫu tài liệu Lead) → lỗi **Chặn** "ngoài phạm vi";
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
- Đổi cấu trúc/trách nhiệm file → cập nhật `docs/codemap/<hệ thống>.md` (+ `docs/PROJECT_MAP.md` nếu đổi L1/"Tìm file…", §13.3); đổi asset → `docs/assets/ASSET_CATALOG.md`.
- Tiến độ nhiệm vụ → Task Map (`docs/studio/tasks/`), danh sách đang làm `CURRENT_TASK.md`, lịch sử ngắn `TASK_HISTORY.md` (§13).

## 11. Kết thúc nhiệm vụ

Danh sách kiểm: build qua · tiêu chí đạt · người dùng đã chơi thử và nghiệm thu (§9a–§9b) · Task Map đóng, TASK_HISTORY + CURRENT_TASK cập nhật (§13) · codemap/PROJECT_MAP/catalog đã cập nhật nếu cần · quyết định đã ghi. Báo cáo 5 dòng: đã làm gì · file đã đổi · kết quả QA · việc tồn đọng · **câu "đã xong" rõ ràng**.

## 12. Lean AI Workflow (phân cấp S/M/L/XL)

Trạng thái: **ĐÃ DUYỆT (người dùng, 2026-11-17)**. Mục tiêu: giảm token, tránh agent đọc/phân tích lặp. §12 **thu hẹp** (không thay) §2–§4: luồng đầy đủ ở §4 là luồng của cấp L/XL. Mọi quy tắc lõi giữ nguyên: hai cổng (§5), baseline Git và kiểm phạm vi (§6a), vùng cấm và quyền (§8), playtest (§9a–9b), Knowledge Base (§10).
Hiệu lực: chỉ cho nhiệm vụ **bắt đầu sau khi duyệt**; không đổi nhiệm vụ đã xong (P0b, P1 chạy theo luồng cũ). Nhiệm vụ đầu tiên áp dụng: từ P2 trở đi.

### 12.1 Phân cấp nhiệm vụ

| Cấp | Dùng khi | Ai làm | Kiểm tra | Cổng |
|---|---|---|---|---|
| **S** | Sửa nhỏ, rõ, ≤ ~2 file, không thuộc "rủi ro cao" | Developer (hoặc Lead nếu quá nhỏ) triển khai và **tự kiểm** (tsc/test/build + đọc `git diff`) | Không QA độc lập | Một câu xác nhận (§5) |
| **M** | Một hệ thống, ≤ ~5 file, tiêu chí rõ | Developer triển khai | QA **kiểm mục tiêu khi cần** (tiêu chí + phạm vi + hồi quy liên quan); Lead ghi lý do gọi/không gọi QA | Cổng 1 gọn + Cổng 2 |
| **L** | Nhiều file/hệ thống, hoặc **rủi ro cao** | Developer | **QA độc lập đầy đủ** (§6a, hai danh sách) | Cổng 1 + Cổng 2 + playtest |
| **XL** | Tính năng lớn, đổi kiến trúc, nhiều gói | **Lead điều phối**, Designer khi cần, Developer | QA độc lập từng gói | Cổng 1 + Cổng 2 + playtest, chia gói |

- **Rủi ro cao (luôn ≥ L)** [đã duyệt cùng §12]: đụng `WorldScene.ts`/`CharacterPanelScene.ts`; save/`progression/`; số liệu cân bằng chiến đấu (`combatConfig.ts`, `enemyConfig.ts`); `.claude/` hoặc hook; quyết định kiến trúc đã duyệt; đổi tên/di chuyển hàng loạt. Nghi ngờ thì chọn cấp cao hơn.
- **Lead phân cấp** và ghi cấp vào brief; người dùng có thể đổi cấp bất cứ lúc nào.
- Baseline (§6a) lập mỗi khi **subagent** Developer sửa file (cấp S giao subagent vẫn lập, chỉ một dòng); Lead tự sửa thì không cần.

### 12.2 Vai trò
- **Lead:** điều phối, xác định phạm vi, phân cấp, viết brief, tổng hợp; làm việc có thể xong bằng một lần Grep/Read thay vì gọi agent.
- **Developer:** chịu trách nhiệm chính về triển khai và tự kiểm kỹ thuật.
- **QA:** kiểm độc lập, tập trung vào phạm vi thay đổi.
- **Visual/Gameplay Designer:** chỉ gọi khi nhiệm vụ thực sự cần chuyên môn của họ (hình ảnh/asset; cơ chế/cân bằng); không gọi để "xác nhận" việc đã rõ.

### 12.3 Tối ưu context và token
- Không đọc lại toàn bộ dự án; chỉ đọc tài liệu/source liên quan trực tiếp (Index First §13.2: `docs/PROJECT_MAP.md` → `docs/codemap/`, Grep rồi đọc theo offset/limit).
- **Một Feature Brief + một QA Plan dùng chung** (Developer và QA cùng đọc, không viết brief riêng cho từng bên): mẫu `docs/studio/templates/FEATURE_BRIEF.md`; báo cáo `templates/AGENT_REPORTS.md` (thay `lean-handoff/QA_PLAN_TEMPLATE.md`, `REPORT_TEMPLATE.md` từ ST-01). Brief tự đủ ý, trỏ tới file cụ thể, không chép lại spec đã có.
- Việc tuần tự được thì không gọi nhiều agent song song; không để hai agent phân tích cùng một thứ. Hỏi tiếp việc cùng phạm vi bằng `SendMessage` tới agent cũ (còn context) thay vì gọi agent mới.
- **Báo cáo agent tối đa 10 dòng**: mỗi mục một dòng, kết luận trước, lỗi Chặn trước. File agent ở `.claude/agents/` trỏ tới `templates/AGENT_REPORTS.md` (từ ST-01); brief vẫn nhắc lại giới hạn.
- **Tối đa 2 vòng tự sửa** rồi báo vấn đề cho Lead (§9); Lead vòng 3 thì dừng và hỏi người dùng.

### 12.4 QA lean
- QA kiểm dựa trên **Feature Brief, tiêu chí nghiệm thu, `git diff` và QA Plan**; không khảo sát lại toàn dự án, không dựa vào danh sách file do Developer khai (§6a).
- Cấp L/XL: QA luôn độc lập. Cấp M: QA khi tiêu chí không tự kiểm được bằng máy hoặc vùng liên quan hồi quy.
- **Không bỏ hồi quy liên quan** (hệ thống/vũ khí lân cận, gameplay invariants); danh sách hồi quy nằm trong QA Plan mục C.

### 12.5 Playtest (giữ nguyên)
Theo §9a–9b và quy trình playtest-handover: Developer tự kiểm kỹ thuật, QA xong trước khi bàn giao; Lead tạo checklist riêng cho người dùng (ID ổn định, một hành vi một mục, thao tác, mong đợi, PASS/FAIL/NOT TESTED) ở `docs/studio/playtests/`, kèm bản tick được khi hữu ích; người dùng chơi và nghiệm thu; có lỗi thì Lead tiếp nhận, sửa, tạo checklist kiểm lại chỉ gồm mục bị ảnh hưởng và hồi quy. Lead không tự đánh dấu PASS thay người dùng.

### 12.6 Quyền hạn (giữ nguyên)
Không tự đổi kiến trúc đã duyệt; không commit/push khi chưa được đồng ý; không xóa/sửa thay đổi ngoài phạm vi.

### 12.7 Đo lường
Chỉ ghi số liệu **có thật**, vào `docs/studio/lean-handoff/TOKEN_LOG.md` (mỗi nhiệm vụ một hàng): input tokens, cache read/write, output tokens, token subagent. Nguồn hiện có: thông báo hoàn tất của subagent (`subagent_tokens`, `tool_uses`, `duration_ms`). Số của session chính (input/cache/output) **chỉ ghi khi người dùng cung cấp** (ví dụ từ `/cost`); không có thì để trống, không suy đoán. Số liệu chỉ để so sánh xu hướng, không dùng để kết luận chất lượng.

## 13. Vòng đời nhiệm vụ: Task Map + Codebase Map (ST-01)

Trạng thái: **ĐÃ DUYỆT (người dùng, 2026-11-17)**. Bổ sung (không thay) §4/§12: §4 vẫn là luồng của cấp L/XL; §13 thêm cách theo dõi và cách định vị.

### 13.1 Bảy bước của AI Lead
| # | Bước | Mẫu / tài liệu | Cập nhật Task Map |
|---|---|---|---|
| 1 | Nhận yêu cầu; phân cấp S/M/L/XL (§12.1) | — | — |
| 2 | Đọc bản đồ: `docs/PROJECT_MAP.md` (L1) → **một** `docs/codemap/<hệ thống>.md` → tài liệu thiết kế nó trỏ tới | Codebase Map | — |
| 3 | Tạo Task Map + hàng trong `CURRENT_TASK.md` (mọi cấp; cấp S có thể chỉ 3–4 bước) | `templates/TASK_MAP.md` | tạo |
| 4 | Gọi Agent phù hợp (§2, §12.2) với brief đúng mẫu; Cổng 1 khi có thiết kế mới | `templates/LEAD.md`, `FEATURE_BRIEF.md` | mỗi lần gọi / nhận kết quả |
| 5 | Theo dõi: bước xong → `DONE` + đầu ra; vướng → `BLOCKED` + lý do + chờ ai; cập nhật **ngay**, không gom cuối nhiệm vụ; `CURRENT_TASK.md` theo bước hiện tại | Task Map | liên tục |
| 6 | QA (§6a, §12.4) → Playtest handover (§9a–9b) | `AGENT_REPORTS.md`, `PLAYTEST.md` | mỗi vòng |
| 7 | Đóng: Codebase Map, Cổng 2, TASK_HISTORY, xoá khỏi CURRENT_TASK, TOKEN_LOG, báo cáo 5 dòng | `LEAD.md` §C–§D | `CLOSED` |
Chỉ Lead ghi Task Map / CURRENT_TASK / TASK_HISTORY (subagent không ghi). Tiến độ nằm ở Task Map; `DECISIONS.md` chỉ ghi quyết định + kết quả nghiệm thu (trường Trạng thái 1 dòng + link Task Map). Đóng nhiệm vụ **không** xoá Task Map, mục DECISIONS hay checklist playtest.

### 13.2 Index First, Read on Demand
- Tra chỉ mục trước (PROJECT_MAP → codemap → Grep), chỉ đọc file/đoạn liên quan; không đọc lại toàn dự án, không đọc tài liệu không liên quan tới nhiệm vụ.
- **Bản đồ không phải nguồn sự thật.** Trước khi sửa code (Lead, Developer) và trước khi viết brief có đường dẫn/dòng: đọc file thật, Grep người gọi/phụ thuộc cần thiết. Dấu hiệu lỗi thời — dòng "Kiểm lỗi thời" của codemap có commit mới, đường dẫn/ký hiệu không còn, số dòng lệch nhiều — thì tin code, không tin bản đồ, và ghi vào mục "Codebase Map cần cập nhật" của Task Map.
- Agent nhận trong brief đúng file codemap cần đọc; không tự đọc cả thư mục `docs/codemap/`.

### 13.3 Giữ Codebase Map đúng
- **Kích hoạt:** thêm/xoá/đổi tên/di chuyển file, đổi trách nhiệm module, thêm hệ thống, hoặc thấy bản đồ lệch.
- **Chuỗi phát hiện:** Developer khai dòng "CẤU TRÚC ĐỔI" (`AGENT_REPORTS.md`) → QA đối chiếu file A/D/R trong `git diff --name-status` → Lead đánh dấu file codemap ở Task Map → Lead cập nhật codemap (+ PROJECT_MAP nếu đổi L1, + bảng "Tìm file…") và đổi `Xác minh: HEAD <sha>` **trước Cổng 2**, cùng commit với thay đổi code.
- Khung một file codemap và quy tắc ghi: `docs/PROJECT_MAP.md` §6.

## 14. Chế độ tự chủ (ST-02)

Trạng thái: **ĐÃ DUYỆT (người dùng, 2026-11-17)**. Người dùng bật chế độ này từ 2026-11-17 để chỉ tập trung chơi thử và phản hồi. Chế độ tự chủ **bỏ việc xin duyệt từng bước kỹ thuật**, không bỏ cổng nào ở §5. Người dùng tắt/bật bằng một câu; khi tắt, mọi bước quay về hỏi như §4.

**Lead tự quyết (không hỏi):**
- Chọn việc tiếp theo trong backlog theo thứ tự ưu tiên người dùng đã nêu: (1) việc còn dở của gói đang làm, (2) tính năng chưa được chơi thử, (3) lỗi đã biết theo mức nghiêm trọng, (4) chuẩn bị gói kế tiếp theo kiến trúc đã duyệt, (5) tiếp tục theo Feature Brief + Lean (§12).
- Các bước kỹ thuật **trong phạm vi đã duyệt**: phân cấp, gọi Designer/Developer/QA, viết brief, lập baseline, tự kiểm, tối đa 2 vòng sửa (§9), cập nhật Task Map/codemap, viết checklist playtest. Không dừng chỉ để báo tiến độ.
- Chỉnh thông số nhỏ sau phản hồi playtest khi người dùng đã nêu hướng rõ (vd "quá khó") — vẫn báo giá trị cũ → mới trong checklist kiểm lại.

**Vẫn phải qua cổng / hỏi người dùng:**
- **Cổng 1:** thiết kế mới, đổi kiến trúc đã duyệt, đổi số liệu cân bằng chiến đấu ngoài phản hồi playtest, gói mới chưa có thiết kế (vd M4, Visual Overhaul), mọi thay đổi `.claude/` (quyền, hook, agent).
- **Cổng 2:** commit (sau nghiệm thu); **push** là đồng ý riêng, chỉ sau khi đã `git fetch` và rà toàn bộ tập commit.
- Cây tracked dơ khi lập baseline (§6a.2), vòng sửa thứ 3 (§9.4), cần file ngoài danh sách đã duyệt (§8).

**Không bao giờ (kể cả khi tự chủ):**
- Xoá hoặc ghi đè save/dữ liệu người chơi; xoá/ghi đè file untracked không rõ nguồn; `git clean/reset --hard`, xoá asset.
- Tự đánh PASS playtest hoặc tuyên bố "đã nghiệm thu" khi người dùng chưa xác nhận (§9a); bỏ qua QA ở cấp L/XL.

**Mỗi nhiệm vụ tự chủ:** Task Map (§13) · nhãn trạng thái READY FOR PLAYTEST / NEEDS REVISION / ACCEPTED · tự rà trước khi bàn giao: đúng yêu cầu? trái kiến trúc? ảnh hưởng ngoài phạm vi? hồi quy? tiêu chí nào chưa kiểm? · báo cáo ≤ 10 dòng, không khẳng định PASS khi chưa chạy kiểm tra tương ứng.
