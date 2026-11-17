# Codemap — Save / Load

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/progression/{CharacterProgress,ProgressRepository,LocalStorageRepository,ProgressStore,ItemInstance,ItemIds,saveV8,saveMigration,saveBridge,RunSession}.ts src/config/progressConfig.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/progression src/config/progressConfig.ts`

**Vai trò:** lưu tiến trình nhân vật vào localStorage (định dạng v8, revision, sao lưu), migration v7 → v8; trạng thái lượt chơi tạm (RunSession) không nằm trong save.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Kho lưu (interface) | `loadAll`, `save(id, dataV8, expectedRevision)`, `SaveResult` (`io`/`conflict`/`readonly`) | `progression/ProgressRepository.ts` | — |
| localStorage | Nơi **duy nhất** chạm `localStorage`; đọc-sửa-ghi đồng bộ; so revision; sao lưu v7 nguyên văn (`PROGRESS_BACKUP_V7_KEY`, không ghi đè), JSON hỏng → `corrupt-<timestamp>` | `progression/LocalStorageRepository.ts` + test | `config/progressConfig` |
| Store | Cache v8 + hàng đợi ghi nối tiếp; `hydrate/get/getAll/commit/flush/onError`; khoá chỉ-đọc theo nhân vật; export `progressStore` (hydrate ở `PreloadScene`) | `progression/ProgressStore.ts` + test | Repository, `saveMigration` |
| Định dạng v8 | `CharacterSaveV8`, `validateSaveV8`; item instance + uid | `progression/saveV8.ts`, `ItemInstance.ts`, `ItemIds.ts` (+ test) | — |
| Migration | `migrateV7ToV8`, `migrateToLatest` (idempotent), `v8ToV7Shape` | `progression/saveMigration.ts` + test | — |
| Dạng v7 / chuẩn hoá | `CharacterSave`, `SAVE_VERSION` (7), `normalizeCharacterSave` | `progression/CharacterProgress.ts` | `config/*`, `skills/*` |
| Cầu nối (công cụ khôi phục/test) | `applyV7ShapeToV8` — từ C4 không mã chạy game nào gọi | `progression/saveBridge.ts` + test | — |
| RunSession | HP/giáp/EN, hồi chiêu, dash, đồng hồ Boss của lượt chơi; `captureRunSession` → dữ liệu `scene.start` → `applyRunSessionToPlayer` | `progression/RunSession.ts` + test | `entities/Player` (qua interface) |

## L3 — Nối vào game
Nạp: `PlayerState.fromSave(progressStore.get(id), …)` trong `WorldScene.create`; lưu: `WorldScene.saveProgress` → `progressStore.commit(id, playerState.toSave(economy, base))`. `CharacterSelectScene` đọc `progressStore`. Migration lười: nhân vật v7 chỉ thành v8 ở lần `commit` đầu.

## Ghi chú khi thay đổi
- **Rủi ro cao ⇒ ≥ L.** Không bao giờ xoá/ghi đè dữ liệu người chơi; đổi định dạng ⇒ tăng version + migration + test.
- Save **không** chứa map/region/vị trí (D5).
- Khoá/tiền tố: `config/progressConfig.ts` (`PROGRESS_STORAGE_KEY`, `SAVE_VERSION_V8`, `*_UID_PREFIX`, `INITIAL_REVISION`).
- Thiết kế: `docs/DATA_ARCHITECTURE.md` (Gói A, B, C); DECISIONS "Kiến trúc dữ liệu người chơi", "Gói B1/B2/C".
