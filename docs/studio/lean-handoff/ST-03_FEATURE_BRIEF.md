# FEATURE BRIEF + QA Plan — ST-03: Reuse Intelligence & Knowledge Maintenance

Cấp: **L** (đổi WORKFLOW + `.claude/agents/`; chỉ tài liệu). Cổng 1: người dùng duyệt 2026-11-18 (DECISIONS "ST-03"). Task Map: `docs/studio/tasks/ST-03_reuse_intelligence.md`. Báo cáo QA **≤ 10 dòng** theo `docs/studio/templates/AGENT_REPORTS.md` (mục QA). Việc triển khai do **Lead** làm (Developer bị cấm sửa `.claude/`); QA chỉ kiểm, **không sửa file**.

BASELINE: HEAD=7b7c23a0def65ebccff47e242d23ffad29f6df74 · nhánh=main · tracked sạch trước ST-03 (HEAD sạch lúc mở nhiệm vụ) · untracked có sẵn: `docs/references/visual/**`, `docs/perf/**`, `docs/studio/lean-handoff/M4_*` (51, không phải kết quả ST-03) · tài liệu Lead: `docs/**`, `.claude/agents/*.md`, `CLAUDE.md` (Lead sửa trực tiếp, không có Developer)
Test baseline: `npx tsc --noEmit` sạch (đã chạy sau khi sửa tài liệu).

## 1. Mục tiêu
Kiểm các tài liệu ST-03 có **áp dụng được thực tế** (7 tình huống dưới) và không phá quy trình/quyền hiện có. Không đổi code game.

## 2. Tham chiếu
`docs/studio/WORKFLOW.md` §13.4, §13.5, §5; `docs/studio/templates/{TASK_MAP,LEAD,FEATURE_BRIEF,AGENT_REPORTS,README}.md`; `docs/assets/{ASSET_CATALOG,README}.md`; `.claude/agents/*.md`; `CLAUDE.md` mục 7b; `docs/PROJECT_MAP.md` §3 hàng "Tìm cái đã có". Sự thật: `src/config/assets.ts`, `src/world/{town,witheredWoods}.ts`, `src/config/witheredWoodsConfig.ts`, `public/assets/village/`.

## 3. Phạm vi (Lead đã sửa)
ĐƯỢC SỬA (tracked): `CLAUDE.md`; `.claude/agents/{game-developer,gameplay-designer,qa-tester,visual-designer}.md`; `docs/PROJECT_MAP.md`; `docs/assets/{ASSET_CATALOG,README}.md`; `docs/studio/{WORKFLOW,AI_STUDIO_PROCESS_MAP,CURRENT_TASK,DECISIONS}.md`; `docs/studio/templates/{TASK_MAP,LEAD,FEATURE_BRIEF,AGENT_REPORTS,README}.md`.
ĐƯỢC TẠO: `docs/studio/tasks/ST-03_reuse_intelligence.md`, `docs/studio/lean-handoff/ST-03_FEATURE_BRIEF.md`.
KHÔNG đụng: `.claude/settings*.json`, `.claude/hooks/**`, front-matter `tools:` của agent, `src/**`, `public/**`, `package*.json`, `docs/codemap/**` (không đổi vì không có thay đổi cấu trúc code), `docs/references/**`, `docs/perf/**`. Không commit/push.

## 5. Tiêu chí nghiệm thu
**A (máy):**
- A1 `npm run build` + `npm test` qua (không đổi số test: 778).
- A2 Phạm vi §6a: HEAD == baseline; đường dẫn đổi ⊂ §3; `git diff HEAD -- .claude/agents` **không** đổi dòng `tools:` / `name:` / `description:` (chỉ thân văn bản); `.claude/settings*.json`, `.claude/hooks/**` không đổi; `src/`, `public/` không đổi.
- A3 Mọi đường dẫn/khóa trong `ASSET_CATALOG.md` mục 1 và 5 có thật: Grep/Glob đối chiếu `public/assets/village/**` (37 file) và `src/config/assets.ts`; không có bản sao asset mới.
**Q (QA đọc độc lập, nêu `file:dòng`) — dry-run 7 tình huống.** Với mỗi tình huống, vạch ra Lead sẽ làm gì **chỉ theo tài liệu hiện có** và nêu chỗ tài liệu mơ hồ/thiếu/mâu thuẫn; lỗi = tài liệu không đủ để áp dụng:
- Q1 *Tạo map mới dựa trên map cũ*: Lead tìm được builder mẫu (`witheredWoods.ts`), asset `VILLAGE.*`, cổng dùng chung, config? Có chỉ ra bảng REUSE/MODIFY/CREATE (vd `bridge` chưa dùng) không?
- Q2 *Quái mới dựa trên enemy có sẵn*: phân tách phần kế thừa (archetype/sheet/layout) và phần mới (bảng màu/scale) từ catalog + codemap enemies; nhãn EXTEND/HYBRID.
- Q3 *Cơ chế gameplay chưa tồn tại*: quy trình cho phép CREATE khi tái dùng gây coupling/sai kiến trúc (§13.4 "Không tái dùng bằng mọi giá"), kèm ghi kết quả tìm kiếm; không ép dùng hệ thống sai.
- Q4 *Đổi cấu trúc một hệ thống (vd đổi tên file trong `src/world/`)*: chuỗi CẤU TRÚC ĐỔI → A/D/R → Lead chọn đúng codemap `world.md` (+ `PROJECT_MAP` nếu đổi bảng "Tìm file…"); §13.5.
- Q5 *Chỉ đổi thông số cấu hình (vd giá trị `WOODS_*`, không phải combat/enemy balance)*: một câu xác nhận, không cập nhật codemap/tài liệu hàng loạt; và trường hợp `combatConfig/enemyConfig` vẫn ≥ L + Cổng 1 — hai quy tắc không mâu thuẫn §12.1/§14.
- Q6 *Asset Catalog*: trỏ tới file/key thật, mục "Tái dùng nhanh" dẫn đúng chỗ, không mô tả hình từ tên file, nhãn [CÓ] đúng; mục 5 (Rừng Úa) khớp code (`witheredWoods.ts`, `witheredWoodsConfig.ts`).
- Q7 *Task nhỏ (S)*: không bị buộc Reuse Analysis/Cổng 1 đầy đủ; bảng "Cấp S: bỏ qua" nhất quán với §12.1 và `TASK_MAP.md`.
- Q8 Nhất quán: không mâu thuẫn mới giữa WORKFLOW, `templates/`, 4 file agent, `CLAUDE.md`, `PROJECT_MAP` (đối chiếu từng nơi nhắc "Reuse"/§13.4/§13.5); số mục WORKFLOW đúng.
**Hồi quy không bỏ:** các cổng §5, baseline §6a, vùng cấm §8, ngưỡng 2 vòng §9, playtest §9a–9b còn nguyên; WORKFLOW không bị xoá/đổi chỗ khác ngoài các mục đã khai (`git diff HEAD -- docs/studio/WORKFLOW.md`).
**P (người dùng):** checklist ở `docs/studio/playtests/ST-03_*.md` (Lead viết sau QA).
**Cấu trúc:** không thêm/xoá/đổi tên file code; ghi codemap không đổi.

## 6. Rủi ro
Dry-run chỉ đọc tài liệu: không chứng minh hành vi Lead ở phiên thật. Giới hạn ghi ở mục "Chưa kiểm được".

## 7. Báo cáo
QA: mục "QA" trong `AGENT_REPORTS.md`, lỗi Chặn trước; mỗi tình huống Q1–Q8 một dòng ngắn. Chỉ Bash trong allowlist hook.
