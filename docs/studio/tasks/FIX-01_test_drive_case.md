# FIX-01 — `npm test` lỗi khi cwd là ổ đĩa chữ thường (`d:\`) trên Windows

| Mục | Giá trị |
|---|---|
| Cấp | S (2 file: `package.json` + script mới; không đổi gameplay/test) |
| Trạng thái tổng | CLOSED |
| Tiến độ | 5/5 bước |
| Mở | 2026-11-17 · Đóng: 2026-11-17 |
| BASELINE | Lead tự làm. HEAD `65710e9` (đã push) |

## Mục tiêu
`npm test` cho kết quả giống nhau dù terminal/agent mở thư mục dự án là `d:\…` hay `D:\…`.

## Phạm vi
- ĐƯỢC SỬA: `package.json` (chỉ script `test`), `docs/codemap/` không cần; `docs/PROJECT_MAP.md` (dòng stack nhắc `npm test`), Task Map/CURRENT_TASK/TASK_HISTORY
- ĐƯỢC TẠO: `scripts/run-vitest.mjs`
- KHÔNG đụng: `src/**`, test, `vite.config.ts`, `.claude/**`

## Điều kiện hoàn thành
- [x] Từ cwd `d:\Projects\pixel-world`: `npm test` 44/44 file, 778/778
- [x] Từ cwd `D:\…`: như trên; `npm test` không nhận thêm đối số vẫn chạy toàn bộ (hook giữ nguyên)
- [x] Người dùng đồng ý commit

## Các bước
| # | Bước | Agent | Trạng thái | Đầu ra | Ghi chú |
|---|---|---|---|---|---|
| 1 | Tái hiện + tìm nguyên nhân | Lead | DONE | cwd `d:\` → `castleWall.test.ts`, `mapBuilders.test.ts` lỗi `window is not defined` (vi.mock không áp); cwd `D:\` → qua | chỉ 2 file này dùng `vi.mock` |
| 2 | Thử cách sửa | Lead | DONE | `--root` chữ hoa: không đủ; chdir trong config: không đủ; **chdir về `realpathSync.native` trước khi spawn vitest: qua** | thử bằng file tạm ở scratchpad |
| 3 | Sửa: script khởi động + `package.json` | Lead | DONE | `scripts/run-vitest.mjs`; `package.json` `"test": "node scripts/run-vitest.mjs"` | |
| 4 | Tự kiểm 2 kiểu cwd + tsc + build | Lead | DONE | cwd `d:\` và `D:\`: 44/44 file, 778/778; `tsc` sạch; build qua | |
| 5 | Cổng 2 commit + đóng | người dùng / Lead | DONE | `git log --grep=FIX-01` | người dùng đồng ý commit + push |

## Codebase Map cần cập nhật
- [x] `docs/PROJECT_MAP.md` dòng stack: `npm test` chạy qua `scripts/run-vitest.mjs`

## Nhật ký
- 2026-11-17 — Push `51d6d0e..65710e9` xong trước khi mở FIX-01.
- Giới hạn: lệnh trực tiếp `npx vitest run --root . <file>` (allowlist hook cho subagent) vẫn phụ thuộc chữ hoa/thường của cwd; 2 file test có `vi.mock` có thể lỗi giả nếu chạy riêng từ `d:\`.
- 2026-11-17 — Người dùng đồng ý commit + push FIX-01; đóng nhiệm vụ.
