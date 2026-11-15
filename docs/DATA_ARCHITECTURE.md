# DATA_ARCHITECTURE — Kiến trúc dữ liệu người chơi (Single-player trước, Multiplayer sau)

Trạng thái: **Feature Specification, chờ duyệt Cổng 1** (bản cuối, 2026-11-15). Chưa có code. Quyết định ghi ở `docs/studio/DECISIONS.md`. Số liệu/khóa đặt ở `src/config/progressConfig.ts` (sẽ tạo).

Mục tiêu: Player Data độc lập Scene, có Repository trung gian, đồ/nhân vật có ID ổn định, về sau chuyển được sang server. Ba gói tuần tự A → B → C; mỗi gói tự build/test/rollback được. Không tái cấu trúc ngoài phạm vi này.

## 0. Hiện trạng đã xác minh bằng đọc code (Lead)

- `CharacterProgress.ts`: `STORAGE_KEY='pixel-world:progress:v1'`, `SAVE_VERSION=7`. Một blob JSON keyed theo `CharacterId`. `getCharacterSave` = `readData()` (đọc localStorage mỗi lần) + normalize từng trường; `saveCharacterSave` = đọc blob, gán một khóa, ghi lại (read-modify-write đồng bộ, nuốt lỗi). Chỉ 3 nơi gọi: `WorldScene.ts:698` (load, trong `create()`), `WorldScene.ts:2479` (`saveProgress`, gọi ở ~23 chỗ), `CharacterSelectScene.ts:33` (`getAllCharacterSaves`, chỉ đọc `level`/`statPoints`).
- Luồng scene: `Boot → Preload → MainMenu → CharacterSelect → World ⇄ BossArena`. `PreloadScene.create()` đồng bộ, kết thúc bằng `this.scene.start(menu)` (dòng 319). `WorldScene.create()` đồng bộ, không thể `await`. Nên mọi dữ liệu phải **có sẵn trong bộ nhớ trước khi vào menu**.
- `BossArenaScene extends WorldScene` nên đi cùng đường load/save. `saveProgress()` chạy ngay trước `scene.start` khi qua cổng; scene đích đọc lại, nên đọc sau ghi phải thấy bản mới nhất.
- Kho đồ **vốn là tập hợp, không có bản sao trùng**: `normalizeInventory`/`normalizeGearInventory` loại trùng (`!includes`), mọi đường thêm đồ (`WorldScene` ~1557, ~3795–3817) đều kiểm `includes`; `grantBossLoot` khi đã có thì nâng level. Nên mỗi nhân vật có tối đa một món cho mỗi `WeaponId`/`GearId` → khớp quyết định "nhặt trùng chỉ nâng level".
- `gearLevels` và `gearSockets` đang keyed theo `GearId`; `VillageService` giữ `gold`/`gems`/`sockets`, đụng túi qua `VillageHost` (`addWeapon/removeWeapon/ownsGear/getGearLevel/setGearLevel…`, tất cả theo id loại). `VillageShopScene` chỉ đọc `world.getVillageInventory()` + `village.getSockets(id)`.
- Không có test cho CharacterProgress; có vitest (`npm test`, `*.test.ts` cạnh file).

## 1. Quyết định đã chốt (người dùng, 2026-11-15)

1. Gear trùng loại: nhặt lại **chỉ nâng level**, không tạo món riêng.
2. Nạp save sớm tại **`PreloadScene`**.
3. Bản sao lưu save v7 **giữ vĩnh viễn**, không tự xóa/ghi đè.
4. Khóa save vẫn là **`CharacterId`** cho tới khi cần nhiều nhân vật cùng lớp.
5. `revision` xung đột: **từ chối ghi và thông báo**, không ghi đè dữ liệu mới hơn.

---

## 2. GÓI A — ProgressRepository + ProgressStore (không đổi định dạng save)

### 2.1 Cấu trúc

```ts
// ProgressRepository.ts (không import Phaser)
type RawProgress = Partial<Record<CharacterId, unknown>>;   // chưa normalize
type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'io' | 'conflict' | 'readonly'; message: string };

interface ProgressRepository {
  loadAll(): Promise<RawProgress>;
  save(id: CharacterId, data: CharacterSave): Promise<SaveResult>;
}
```
(`conflict`/`readonly` đã có trong kiểu để Gói B không đổi chữ ký; Gói A chỉ trả `ok` hoặc `io`.)

- `LocalStorageRepository(getStorage: () => Storage)`: `loadAll` đọc blob; `save` = đọc blob → `blob[id]=data` → `setItem`. **Hợp đồng bắt buộc: toàn bộ đọc-sửa-ghi chạy đồng bộ ngay lúc gọi `save`** (không `await` giữa `getItem` và `setItem`), rồi mới trả Promise đã resolve. Nhờ vậy ghi đầu tiên không bị mất khi đóng tab, và hai lệnh ghi trong cùng tab không đan xen. Khóa nhân vật khác trong blob được giữ **nguyên văn** (không normalize lại).
- `normalizeCharacterSave(id, raw): CharacterSave`: tách nguyên thân hàm `getCharacterSave` (từ sau `readData()`), **không đổi logic**. `createDefaultSave` giữ nguyên.
- `ProgressStore` (cache + hàng đợi ghi) và export `progressStore` dùng chung (`new ProgressStore(new LocalStorageRepository(() => window.localStorage))`; lấy `window.localStorage` lười để import được trong test Node). Test tạo `ProgressStore` riêng với repo giả.

### 2.2 Hợp đồng của ProgressStore (trả lời: cache, thứ tự, lỗi bất đồng bộ)

Trạng thái: `idle → loading → ready | degraded`. `degraded` = vẫn dùng được trong bộ nhớ nhưng lưu trữ hỏng/bị chặn.

| Thao tác | Hành vi |
|---|---|
| `hydrate(): Promise<void>` | Idempotent; nhiều lần gọi cùng lúc dùng chung một Promise. `repo.loadAll()` → `normalizeCharacterSave` cho **mọi** `CharacterId` (nhân vật chưa có save nhận mặc định, chưa ghi ra đĩa). **Không bao giờ reject**: lỗi đọc → `degraded` + cache toàn mặc định, `lastError` được ghi, `persistent=false`. |
| `get(id)` / `getAll()` | Đồng bộ, **chỉ đọc cache, không bao giờ chạm repo**. Trả bản sao sâu (`structuredClone`) nên scene sửa object không làm hỏng cache. Gọi khi state là `idle`/`loading` → **ném `ProgressNotReadyError`** (lỗi rõ ràng, không trả mặc định âm thầm). |
| `commit(id, save)` | Đồng bộ: cập nhật cache **ngay** (nên đọc sau ghi luôn thấy bản mới, kể cả khi `scene.start` ngay sau đó), rồi xếp hàng ghi. Gọi khi chưa sẵn sàng → ném `ProgressNotReadyError` (không bao giờ ghi trước khi nạp xong → không thể ghi đè save thật bằng mặc định). |
| Hàng đợi ghi | Một hàng đợi nối tiếp cho cả store; mỗi `id` chỉ giữ **bản mới nhất đang chờ** (gộp). Bắt đầu ghi ngay lập tức nếu rảnh (không debounce) để tận dụng hợp đồng đồng bộ ở trên. Không bao giờ có hai `repo.save` cùng chạy → không đảo thứ tự: bản cũ không thể ghi sau bản mới. |
| Ghi lỗi | Cache **không** bị hoàn tác. Lỗi ghi vào `lastError`, phát `onError` (listener), đặt `persistent=false`; lần `commit` sau tự thử ghi lại bản mới nhất. Không retry vô hạn, không throw vào gameplay. |
| `flush(): Promise<void>` | Resolve khi hàng đợi rỗng. `PreloadScene` đăng ký `pagehide` và `visibilitychange(hidden)` gọi `flush()`. |
| Lỗi đặc thù localStorage | JSON hỏng → `loadAll` trả `{}` **sau khi** chép chuỗi hỏng sang khóa `pixel-world:progress:v1:corrupt-<timestamp>` (không bao giờ ghi đè; chỉ làm một lần mỗi lần khởi động). `getItem` ném (bị chặn) → store `degraded`. `setItem` ném (đầy/chặn) → lỗi ghi như trên. |

**Bảo đảm cụ thể:**
1. *Scene không đọc trước khi nạp xong:* `hydrate()` chạy ở đầu `PreloadScene.create()` song song với việc sinh texture; `scene.start(menu)` chỉ gọi trong `.then` của nó (và vì `hydrate` không reject, luôn tới menu). Chỉ có Menu → CharacterSelect → World đi sau Preload; mọi `get` sớm hơn đều ném lỗi to chứ không trả sai.
2. *Không ghi đè dữ liệu mới hơn trong cùng tab:* cache là nguồn duy nhất sau `hydrate`; ghi tuần tự, mới thắng cũ.
3. *Giới hạn đã biết của Gói A (không giải quyết ở đây):* hai tab cùng chơi một nhân vật vẫn "tab ghi sau thắng" như hôm nay. Giải pháp là `revision` ở Gói B (quyết định 5). Gói A không thêm lớp phát hiện đa-tab.

### 2.3 Nối vào code

- `PreloadScene.create()`: gọi `progressStore.hydrate()` ở đầu, thay `this.scene.start(menu)` bằng `ready.then(() => this.scene.start(menu))`; đăng ký flush khi ẩn/đóng tab.
- `WorldScene.ts`: dòng 698 → `progressStore.get(this.characterId)`; `saveProgress()` → `progressStore.commit(this.characterId, {...})` (nội dung object **y nguyên**); sửa dòng import.
- `CharacterSelectScene.ts`: `getAllCharacterSaves()` → `progressStore.getAll()`.
- `CharacterProgress.ts`: bỏ `readData`/`getCharacterSave`/`saveCharacterSave`/`getAllCharacterSaves` và `STORAGE_KEY` (chuyển sang config); thêm `export normalizeCharacterSave`. Không để wrapper (tránh import vòng với `ProgressStore`; chỉ 3 chỗ gọi nên sửa thẳng).
- `SAVE_VERSION` vẫn **7**, định dạng blob không đổi, khóa vẫn `pixel-world:progress:v1`.

### 2.4 File

- **ĐƯỢC SỬA (đã tồn tại):** `src/progression/CharacterProgress.ts`, `src/scenes/WorldScene.ts`, `src/scenes/CharacterSelectScene.ts`, `src/scenes/PreloadScene.ts`, `docs/PROJECT_MAP.md`.
- **ĐƯỢC TẠO (chưa tồn tại):** `src/progression/ProgressRepository.ts`, `src/progression/LocalStorageRepository.ts`, `src/progression/ProgressStore.ts`, `src/progression/ProgressStore.test.ts`, `src/progression/LocalStorageRepository.test.ts`, `src/config/progressConfig.ts` (`PROGRESS_STORAGE_KEY`, `PROGRESS_CORRUPT_BACKUP_PREFIX`).
- Ngoài phạm vi (không được đụng): `ui/combat/ControlLayoutStore.ts` (cấu hình nút theo thiết bị, không phải tiến trình), `RunSession`, mọi logic gameplay.

### 2.5 Acceptance Criteria (Gói A)

**Máy kiểm được (QA):**
1. `npm run build`, `npx tsc --noEmit`, `npm test` đạt (gồm test mới).
2. `grep localStorage` trong `src/progression` và `src/scenes`: chỉ còn `LocalStorageRepository.ts`. Không còn tham chiếu `getCharacterSave|saveCharacterSave|getAllCharacterSaves` trong `src/`.
3. `git diff` cho thấy thân `normalizeCharacterSave` **không đổi logic** so với `getCharacterSave` cũ (chỉ đổi chữ ký/đầu vào) và `saveProgress()` truyền cùng các trường.
4. Test `ProgressStore`: `get`/`commit` trước `hydrate` ném `ProgressNotReadyError`; `hydrate` idempotent và đồng thời; `hydrate` lỗi → `degraded`, cache mặc định, không reject; `get` trả bản sao (sửa kết quả không đổi cache); `commit` rồi `get` thấy ngay; nhiều `commit` liên tiếp khi repo giả chậm → repo nhận đúng thứ tự, không bao giờ hai `save` chồng nhau, nội dung cuối = bản cuối; `save` lỗi → cache giữ nguyên, `onError` kêu, `commit` kế tiếp ghi lại được; `flush` chỉ resolve khi hàng đợi rỗng.
5. Test `LocalStorageRepository` (Storage giả): giữ nguyên văn các khóa nhân vật khác; JSON hỏng → `{}` + bản sao `corrupt-*` được tạo một lần và không bị ghi đè; `getItem` ném → `loadAll` reject (store chuyển `degraded`); `setItem` ném (quota) → `{ok:false, reason:'io'}`; `save` thực hiện `setItem` đồng bộ trong lời gọi.
6. Phạm vi (WORKFLOW §6a): chỉ chạm hai danh sách trên; HEAD không đổi.

**Phải chơi thật (người dùng):**
7. Với save hiện có: vào game đúng level/đồ/vàng/ngọc/kỹ năng; màn chọn nhân vật hiện đúng cấp.
8. Nhặt đồ/mua/nâng cấp rồi tải lại trang (F5): còn nguyên. Đóng tab ngay sau khi nhặt đồ rồi mở lại: còn nguyên.
9. Qua cổng đỏ sang Boss Arena rồi về làng: đồ, cấp, vàng không đổi. Chết rồi vào lại: tiến trình giữ như cũ.
10. Cửa sổ ẩn danh/localStorage bị chặn: game vẫn vào được (không lưu được, không văng lỗi).

**Rủi ro:** thấp. Ghi bất đồng bộ nhưng thực thi đồng bộ trên localStorage; lệch thứ tự bị chặn bởi hàng đợi. **Rollback:** `git revert` (định dạng dữ liệu không đổi).

---

## 3. GÓI B — Item Instance + Character UID + Revision, migration v7 → v8

Chia hai bước vì chạm nhiều file lớn dùng chung:

- **B1 (không đổi hành vi chạy):** chỉ *thêm* module + test: kiểu `ItemInstance`, bộ sinh uid, `migrateV7ToV8`, normalizer v8, logic `revision` trong `ProgressStore`/`LocalStorageRepository` (chưa bật). `SAVE_VERSION` vẫn 7 ở runtime.
- **B2 (bật lên):** `SAVE_VERSION=8`, nối scene sang uid, sao lưu v7, thông báo xung đột. Một Developer, sửa tuần tự `CharacterProgress → VillageService → WorldScene → CharacterPanelScene → VillageShopScene`. Danh sách file chính xác của B2 sẽ chốt bằng Grep khi lập brief.

### 3.1 Cấu trúc v8

```ts
interface ItemInstance {
  uid: string;                 // 'w1', 'g1'… (tiền tố theo kind + số thứ tự base36), duy nhất TRONG một nhân vật
  kind: 'weapon' | 'gear';
  defId: WeaponId | GearId;
  level: number;               // gear: thay gearLevels; weapon: 1
  sockets?: (GemId | null)[];  // gear: thay gearSockets
}
// CharacterSave v8 = các trường giữ nguyên + :
characterUid: string;          // 'ch_<CharacterId>_1' — xác định, không dùng Math.random
revision: number;              // bắt đầu 1, +1 mỗi lần ghi thành công
nextItemSeq: number;
items: Record<string, ItemInstance>;
bag: string[];                 // uid, thay inventory + gearInventory
equippedWeapons: [string | null, string | null];
equippedGear: Record<GearSlot, string | null>;
```
- Bất biến (theo quyết định 1): trong một nhân vật, mỗi `defId` có tối đa một instance. Nhặt/mua lại món đã có → nâng `level` của instance cũ; không tạo uid mới.
- Uid do `ItemFactory` (module `ItemIds`) cấp từ `nextItemSeq`; xác định, ổn định, có test. Server tương lai tự cấp uid toàn cục; định danh toàn cục tạm thời = `(characterUid, uid)`.
- `gold`, `gems`, `statPoints`, `stats`, `level/xp/xpToNext`, `skillLoadout`, `extraSkills`, `skillLevels` **giữ nguyên**, không migrate.

### 3.2 Ánh xạ trường v7 → v8 (bảo toàn 100%)

| v7 | v8 | Ghi chú |
|---|---|---|
| `level, xp, xpToNext, statPoints, stats, gold, gems, skillLoadout, extraSkills, skillLevels` | y nguyên | |
| `inventory: WeaponId[]` | mỗi phần tử → `ItemInstance{kind:'weapon', level:1}` trong `items`, uid vào `bag` | theo thứ tự mảng |
| `equipped[i]` (WeaponId \| null) | `equippedWeapons[i]` = uid của instance cùng `defId` | |
| `gearInventory: GearId[]` | mỗi phần tử → `ItemInstance{kind:'gear'}` | |
| `gearLevels[id]` (vắng = 1) | `level` của instance gear `id` | |
| `gearSockets[id]` | `sockets` của instance gear `id` (sao chép sâu) | |
| `equippedGear[slot]` (GearId \| null) | uid của instance `id` | |
| — | `characterUid='ch_<CharacterId>_1'`, `revision=1`, `nextItemSeq` | |

Quy tắc an toàn:
- Chạy **hai bước**: (1) raw → v7 chuẩn bằng `normalizeCharacterSave` hiện có (đã loại trùng, lọc id sai, kẹp giá trị); (2) v7 chuẩn → v8 thuần hàm. Nên save thiếu trường/hỏng/phiên bản cũ (v1–v6) đều qua đường đã được kiểm chứng.
- Dữ liệu mồ côi (ví dụ `gearSockets` của món không có trong túi) đã bị normalizer v7 loại; phần bị loại ở bước 2 (nếu có) ghi vào `migrationLog` trong save, không mất âm thầm.
- **Sao lưu v7 vĩnh viễn:** trước lần ghi v8 đầu tiên, chép nguyên văn blob v7 sang khóa `pixel-world:progress:v1:backup-v7`; chỉ ghi khi khóa chưa tồn tại, **không bao giờ ghi đè hay xóa**. Nếu không sao lưu được (quota) → **không ghi v8**, nhân vật giữ v7 ở chế độ chỉ-đọc kèm thông báo.
- Validate trước khi ghi (số instance khớp, mọi uid tham chiếu tồn tại, không trùng uid); lỗi → giữ v7, chỉ-đọc. Idempotent: `version ≥ 8` thì bỏ qua; chạy hai lần cho kết quả y hệt.
- Mỗi nhân vật có phiên bản riêng trong blob; v7 và v8 có thể cùng tồn tại cho tới khi từng nhân vật được mở.

### 3.3 Revision (quyết định 5)

`save(id, data, expectedRevision)`: `LocalStorageRepository` so `revision` đang nằm trong blob (cùng lượt đọc-sửa-ghi đồng bộ) với `expectedRevision`; lệch → trả `{ok:false, reason:'conflict'}`, **không ghi**. Store giữ nguyên cache, đặt nhân vật đó sang chỉ-đọc, ngừng ghi, phát sự kiện; `WorldScene` hiện toast "DỮ LIỆU ĐÃ THAY ĐỔI Ở NƠI KHÁC — TIẾN TRÌNH KHÔNG ĐƯỢC LƯU, HÃY TẢI LẠI TRANG". Không có đường tự ghi đè.

### 3.4 Acceptance Criteria (Gói B)

1. Build/tsc/test đạt. File `migrations.test.ts` gồm tối thiểu: (a) save v7 đầy đủ → đủ mọi trường theo bảng; kiểm ngược v8 → "dạng v7" bằng đúng v7 chuẩn ban đầu (round-trip); (b) mọi `WeaponId` và `GearId` hợp lệ; (c) `equipped`/`equippedGear` trỏ đúng instance, có trường hợp trỏ đồ không có trong túi; (d) level đồ >1 và socket có ngọc được giữ; (e) save thiếu trường, v1–v6, `{}`, null, sai kiểu; (f) idempotent; (g) uid không trùng và ổn định giữa hai lần chạy; (h) sao lưu v7 được tạo đúng một lần, không bị ghi đè, byte-giống blob gốc; (i) lỗi sao lưu → không ghi v8; (j) lỗi validate → giữ v7; (k) `revision` tăng đúng, `expectedRevision` lệch → từ chối và không đổi blob; (l) trong một tab, hai lần `commit` liên tiếp không tự gây conflict.
2. Không còn `GearId`/`WeaponId` dùng làm khóa của dữ liệu *tiến trình* (grep `gearLevels|gearSockets` chỉ còn trong migration + test).
3. **Phải chơi thật bằng save v7 thật:** túi đồ, trang bị, level đồ, lỗ ngọc, vàng, ngọc, kỹ năng, cấp **giống hệt trước** (chụp màn hình trước/sau); mua/bán/nâng cấp/đục/khảm/tháo/vứt/nhặt đồ rơi/hòm vũ khí/boss rơi đồ đều chạy; khóa `backup-v7` có trong DevTools; mở hai tab rồi lưu ở tab thứ hai → thấy thông báo, không mất dữ liệu.

**Rủi ro:** cao nhất (chạm file lớn dùng chung, đổi định dạng save). **Rollback:** `git revert` + khôi phục từ `backup-v7` (thủ công; hướng dẫn đưa vào checklist chơi thử).

---

## 4. GÓI C — PlayerState thuần (chia 5 bước, mỗi bước một lần giao + QA)

`src/systems/PlayerState.ts` (không import Phaser, cùng kiểu `VillageService`). Phạm vi tối thiểu: `items/bag/equipped*`, `statPoints`, `stats`, `skillLevels`, `gold/gems` (nhận từ `VillageService` ở bước 3), `fromSave()/toSave()`.

1. Tạo `PlayerState` từ save; `WorldScene` giữ nhưng chưa dùng; test `fromSave/toSave` round-trip.
2. Chuyển thao tác kho đồ (equip/unequip/discard/add, tương ứng `WorldScene` ~2850–2930, ~1549–1560, ~3795–3820).
3. `VillageHost` gọi `PlayerState`.
4. Chuyển `statPoints`, `stats`, `skillLevels`.
5. `saveProgress()` = `progressStore.commit(id, playerState.toSave(...))`.

Cố ý **để lại** `WorldScene`: HP/giáp/EN, sprite, input, `LevelSystem`/XP (gắn cảnh), `RunSession`, tính chỉ số hiệu dụng. Tiêu chí chung: test thuần cho từng thao tác + hồi quy chơi thật toàn bộ luồng túi đồ/làng sau mỗi bước. Rollback: mỗi bước một commit. Danh sách file chính xác lập khi tới gói C.

---

## 5. Để dành cho giai đoạn Multiplayer (không làm bây giờ)

Repository phía server + xác thực; server cấp uid; tick cố định và lớp lệnh/input; mô phỏng chiến đấu headless tách khỏi Phaser; RNG tiêm được (`Math.random` hiện có 39 chỗ, 12 ở `WorldScene`); version hóa config; tách `WorldScene` thành các system nhỏ.

## 6. Việc chưa kiểm chứng (nói thẳng)

- Chưa đọc hết `CharacterPanelScene`, `Hud` và các chỗ dùng `equipped` ngoài `WorldScene` — Developer Gói B2 phải Grep trước khi sửa.
- Vitest chưa từng chạy với `Storage` giả trong repo này; dùng object giả inject qua `getStorage`, không phụ thuộc môi trường DOM.
- Không có cách tự động hóa "chơi thật": các mục 7–10 (Gói A) và mục 3 (Gói B) chỉ người dùng kiểm được.
