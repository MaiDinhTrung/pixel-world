# WORLD ARCHITECTURE — World → Region → Map → Instance

Trạng thái: **v2, đã duyệt (2026-11-17, người dùng: "duyệt cả 3" = P0a + P0b + P1)**; P0b và P1 được phép thực hiện theo quy trình studio. Các quyết định thuật ngữ, phân tầng trạng thái và Q1–Q7 (kể cả Q3 chọn A và R7 đã xác nhận) đã được người dùng thống nhất (xem `docs/studio/DECISIONS.md`). Chưa có code nào theo tài liệu này.

Viết cho: người duyệt/đang phát triển Pixel World và Developer sẽ lập brief P0b–P6.

Nhãn: **[Hiện có]** đã xác minh bằng đọc code · **[Đề xuất]** thiết kế mới, chưa tồn tại · **[?]** chưa xác định, cần quyết định.

Ràng buộc: ưu tiên hoàn thiện Single-player. Không Server, không Networking, không Multiplayer. Không đổi gameplay, combat, EXP, Drop. Spec lịch sử `docs/WORLD_MAP_DESIGN.md` (W0–W3) giữ nguyên; tài liệu này mở rộng nó.

---

## 1. Thuật ngữ

| Thuật ngữ | Định nghĩa | Loại |
|---|---|---|
| **World** | Danh mục toàn bộ Region/Map của game. | Tĩnh |
| **Region** | Vùng đất lớn, chứa nhiều Map (cùng chủ đề, độ khó). | Tĩnh [Đề xuất] |
| **Map** | Bản đồ **độc lập** (không yêu cầu thế giới liền mạch). Có layout, Zone, Connection, điểm xuất hiện. Có thể có nhiều Instance. | Tĩnh |
| **Zone** | Khu vực logic **bên trong một Map**: xác định vùng spawn, gameplay, trigger, quy tắc. Chính là "Region" hiện tại trong code, đổi tên. | Tĩnh |
| **Connection** | Liên kết giữa các Map (cổng, cửa, lối chuyển cảnh) và là nơi duy nhất quản lý chuyển Map. | Tĩnh |
| **Instance** | Một phiên bản đang chạy của một Map, có trạng thái gameplay riêng và giới hạn người chơi. | Chạy |
| **Character** | Dữ liệu nhân vật lâu dài (cấp, chỉ số, trang bị, vật phẩm, save). | Lưu lâu dài |
| **RunSession** | Trạng thái tạm thời đi theo nhân vật trong lúc chơi và cần giữ khi chuyển Map. | Phiên chơi |
| **TravelTicket** | Gói dữ liệu chuyển nhân vật từ nơi này sang Instance khác. | Chạy |
| **Allocator** | Cấp/giải phóng Instance cho người chơi. Single-player: `LocalInstanceAllocator`. | Chạy |

**Không nhầm Zone với các "zone" khác trong code** (giữ nguyên tên, khác lĩnh vực): `VILLAGE_ZONE`/`isInsideVillage`/`safeZone`/`isInSafeZone` (khu an toàn; `VILLAGE_ZONE` chính là `bounds` của `zone.village`), `BossEnemy.addImpactZone`/`clearZones` (vùng va chạm Boss), `cancelZone`/`inCancelZone` (vùng huỷ ngắm), `deadzone`/`zoneWidthRatio` (joystick), biến cục bộ `zone` ở `castleWall.ts`, `bossArena.ts`, `fortressStand.ts`. Đã tìm trong `src/` (2026-11-16): chưa có định danh `ZoneDef`/`ZoneId`/`ZoneDisplay` hay tiền tố id `zone.*`, nên không xung đột định danh; chỉ trùng nghĩa mềm.

Văn bản hiển thị cho người chơi (ví dụ "Đồng Hoang Úa", chữ "vùng") không đổi.

---

## 2. Quyết định kiến trúc

| Mã | Quyết định | Trạng thái |
|---|---|---|
| W-A1 | Mô hình World → Region → Map → Instance. Map rời nhau, nối bằng cổng/cửa/lối chuyển cảnh; không yêu cầu thế giới liền mạch (Phương án A). | Người dùng đã chốt |
| W-A2 | Region là cấp dữ liệu tĩnh mới, chứa nhiều Map. | Đã chốt |
| W-A3 | Connection quản lý liên kết và chuyển Map. Loại: `portal`, `door`, `exit` (ô/mép chuyển cảnh). Không có loại "liền mạch". | Đã chốt |
| W-A4 | Instance là trạng thái chạy, không nằm trong dữ liệu tĩnh. Map chỉ khai báo `InstancePolicy`. | Đã chốt |
| W-A5 | Mỗi Instance có trạng thái gameplay riêng; người ở Instance khác nhau không thấy hay tương tác trực tiếp. | Đã chốt |
| W-A6 | Single-player dùng `LocalInstanceAllocator` qua cùng interface với allocator MMO sau này. | Đã chốt |
| W-A7 | Region hiện tại đổi thành **Zone** (chọn Zone, không chọn Area). | Đã chốt |
| W-A8 | Giữ D5: không lưu map hiện tại vào save. | Giữ (D5, `WORLD_MAP_DESIGN.md`) |
| W-A9 | Một `MapScene` chung + `builderId` thay cho "mỗi map một lớp Scene" (làm ở P4). | Đề xuất, chưa duyệt riêng |
| W-A10 | Phân tầng trạng thái Character / RunSession / Instance (mục 5). | Người dùng đã đồng ý; vài điểm còn [?] |
| W-A11 | P0 chỉ đổi **tên type, function, biến, hằng và tham chiếu** Region → Zone; **không đổi tên file** (ba file `regionTracker.ts`, `regionTracker.test.ts`, `ui/RegionBanner.ts` giữ tên cũ trong P0). Việc đổi tên file sẽ xem xét trong **gói riêng, do Lead thực hiện và kiểm tra Git** (Q7). | Người dùng đã chốt (phương án b; Q7) |
| W-A12 | **Đồng hồ lượt chơi ở lại `RunSession`** ở giai đoạn hiện tại (`runStartedAt`, `nextBossAt`, `bossNumber`, `bossReady`, và `bossWarningShown` đi cùng). Thiết kế interface **`DifficultyClock`** để tách *logic dùng đồng hồ* khỏi *nơi lưu*. **Chưa chuyển sang Instance.** Ghi nhận khả năng chuyển sang Instance trong kiến trúc Multiplayer tương lai. Phải bảo toàn hành vi và công thức hiện tại (§5.4). | Người dùng đã chốt (Q1 = a) |
| W-A13 | Đổi id chuỗi `region.*` → `zone.*` ở P0b, **với điều kiện**: đã kiểm toàn repo (kết quả §10.1), có test bảo vệ đổi id, xác nhận không làm hỏng save hiện có. | Người dùng đã chốt có điều kiện (Q2) |
| W-A14 | `InstancePolicy` thiết kế **theo từng Map**, có giá trị mặc định hợp lý; phân biệt rõ **cấu hình chính sách (tĩnh)** với **trạng thái Instance runtime** (§4.3). | Người dùng đã chốt (Q4) |
| W-A15 | Điểm hồi sinh theo Region (`RegionDef.respawn`) là **tùy chọn**; không có thì dùng `MapDef.deathRespawn` như hiện nay (D6). **Chưa triển khai** khi chưa cần. | Người dùng đã chốt hướng thiết kế (Q5) |
| W-A16 | Nội dung Region/Map thứ hai **chưa quyết định**; để giai đoạn P4, sau khi hoàn thiện thiết kế Map đầu tiên (Q6). | Hoãn |
| W-A17 | **Ngày/đêm là trạng thái hiển thị client-local** (Q3 = A). Không đưa vào `InstanceRuntime` hay `RunSession`, không đi qua `TravelTicket`. Hiện **chưa ảnh hưởng gameplay**. Nếu sau này ngày/đêm ảnh hưởng gameplay (quái, spawn, Boss, Drop) thì mở quyết định mới và xem xét `WorldClock` thuộc Instance (§10.2). | Người dùng đã chốt (Q3 = A) |
| W-A18 | **Đồng hồ vòng đời Instance** gồm `createdAtMs`, `idleTtlMs`. **Đồng hồ độ khó và lịch Boss** (`runStartedAt`, `nextBossAt`, `bossNumber`, `bossReady`) **vẫn thuộc `RunSession`** (Q1 = a) và **không** chuyển sang Instance ở giai đoạn hiện tại. | Người dùng đã xác nhận (R7) |

---

## 3. Kiến trúc hiện có [Hiện có]

### 3.1. Mô hình dữ liệu (W1–W3)

`src/world/worldGraph.ts` (kiểu và luật thuần, không import Phaser) và `src/config/worldConfig.ts` (dữ liệu):

```
WorldDef { maps[] }
 └─ MapDef { id, sceneKey, size, kind('overworld'|'boss'), lighting, playerSpawns, regions[], connections[], deathRespawn }
     ├─ RegionDef   = vùng HÌNH CHỮ NHẬT trong MỘT map (bounds|null, safe, tierOffset/Floor/Cap,
     │                spawnTable, maxAliveCap, eliteSlots, display)      ← sẽ đổi tên thành ZoneDef
     └─ ConnectionDef { id, from{mapId,x,y}, to{mapId,spawnId}, type:'portal', direction, lockRules, chargeMs, fadeColor, visual }
```

Hiện có 2 map (`map.starting_lands`, `map.boss_arena_1`), 4 vùng (`region.village`, `region.wilds_near`, `region.wilds_far`, `region.arena`), 2 connection (`conn.village_to_arena`, `conn.arena_to_village`). Hàm thuần: `regionAt`, `findMap`, `findConnection`, `requestTravel`, `evaluateConnection` (bọc `getPortalDenyReason`), `effectiveThreatTier`, `validateWorld`.

### 3.2. Luồng chuyển Map hiện tại

1. Người chơi đứng ở cổng (`TownInfo.portal?`, một cổng mỗi scene), `tryStartPortalCharge` → `updatePortalCharge` (sạc `BOSS_ARENA_PORTAL_CHARGE_MS`).
2. `startPortalTravel` (`WorldScene.ts`): tắt trạng thái skill, bất động, bất tử ngắn, `saveProgress()`, `captureRunSession(...)` vào Phaser registry (`RUN_SESSION_REGISTRY_KEY`), fade, rồi `scene.start(targetMap.sceneKey, { characterId })`.
3. Scene đích `create()`: `takeRunSession()` (lấy và huỷ), dựng map (`buildMap()` → `buildTown`/`buildBossArena`), đặt người chơi ở `town.playerSpawn`, áp `RunSession`, đặt `portalCooldownUntil`, fade vào.
4. Chết: `restartRun()` (`scene.restart()` ở map chính; `BossArenaScene` về scene của `deathRespawn.mapId`).

### 3.3. Khoảng trống so với kiến trúc đề xuất

| # | Phát hiện | Ghi chú |
|---|---|---|
| G1 | **Trùng tên "Region"**: `RegionDef` hiện là vùng chữ nhật trong map, còn Region mới là nhóm Map. | P0b giải quyết bằng đổi tên Zone |
| G2 | **`spawnId` của connection không được dùng lúc chạy**: `create()` luôn đặt người chơi ở `town.playerSpawn`; `spawnId` chỉ được `validateWorld` kiểm. | **P2: đã triển khai, QA Đạt, chờ chơi thử** |
| G3 | **Một cổng mỗi scene**; fade và hướng cổng đọc hằng số Arena (`BOSS_ARENA_FADE_*`), dù `ConnectionDef.fadeColor`/`chargeMs` đã có (bản sao của hằng số). | **P2: đã triển khai, QA Đạt, chờ chơi thử** |
| G4 | **Mỗi map cần một lớp Scene** (`MapDef.sceneKey` 1:1, `getMapId()` ghi đè). | P4 |
| G5 | **Kích thước map bị hard-code**: nhiều chỗ clamp theo `WORLD_WIDTH/HEIGHT` thay vì `MapDef.size`; chỉ Arena nhỏ hơn nên chưa lộ lỗi. | **P2: đã triển khai, QA Đạt, chờ chơi thử** |
| G6 | **Trạng thái "Instance" nằm lẫn trong `WorldScene`** (quái, xác, drop, hòm, Boss, `spawnIndex`, bộ đếm sinh/kill theo vùng). `resetInstanceRuntimeState()` đặt lại từng trường bằng tay vì Phaser tái dùng instance scene. | P3 |
| G7 | **`bossReady` là cờ toàn cục**, chưa gắn với `MapId`. | P3 (rủi ro đã ghi ở W0 §6) |
| G8 | **Chưa có khái niệm Region (nhóm Map) và Instance** trong dữ liệu. | P1, P3 |
| G9 | **Đồng hồ lượt chơi đang đi theo nhân vật, không thuộc map**: `runStartedAt`, `nextBossAt`, `bossNumber`, `bossReady`, `bossWarningShown` nằm trong `RunSession` và được mang qua cổng. Logic dùng đồng hồ nằm rải ở `WorldScene` (45 chỗ), `bossArenaRules.ts` (16), `BossArenaScene` (3), `worldGraph.ts` (3) và gắn thẳng vào các trường scene. | **Đã quyết định (Q1 = a):** giữ ở `RunSession`, tách bằng `DifficultyClock` (§5.4) |

---

## 4. Kiến trúc đề xuất [Đề xuất]

### 4.1. Sơ đồ quan hệ

```
        DỮ LIỆU TĨNH (src/config + src/world, thuần, không import Phaser)
┌──────────┐ 1   n ┌───────────┐ 1   n ┌──────────────────────────────────┐
│ WorldDef │───────│ RegionDef │───────│ MapDef                           │
└──────────┘       │ id,display│       │ id, regionId, builderId, size,   │
                   │ mapIds    │       │ kind, lighting, deathRespawn,    │
                   │ entryMapId│       │ playerSpawns, instance:Policy    │
                   └───────────┘       └──┬───────────────┬───────────────┘
                                       1  │ n          1  │ n
                               ┌──────────▼──┐     ┌──────▼────────────┐
                               │   ZoneDef   │     │  ConnectionDef    │──► to {mapId, spawnId}
                               │ (Region cũ) │     │ portal|door|exit  │     (có thể sang Region khác)
                               └─────────────┘     └───────────────────┘

        TRẠNG THÁI CHẠY (bộ nhớ; không vào save)
┌───────────────────────┐ 1  n ┌─────────────────┐ 0..cap ┌─────────────┐
│ InstanceAllocator     │──────│ InstanceRuntime │────────│ CharacterUid│
│ Local (nay) / MMO (sau)│     │ ref{id, mapId}  │        └─────────────┘
└──────────┬────────────┘      │ trạng thái riêng│
           │ assign()/release()└─────────────────┘
           ▼
      TravelTicket ──mang──► CharacterCarry (dữ liệu RunSession được phép đi theo)
```

Quan hệ chữ: World có nhiều Region; Region có nhiều Map; Map có nhiều Zone và nhiều Connection; Map có chính sách Instance; Allocator tạo nhiều Instance từ một Map; Instance chứa 0..capacity nhân vật. Connection nằm ở Map nguồn và trỏ tới Map đích (có thể thuộc Region khác).

### 4.2. Kiểu dữ liệu (sẽ làm ở P1, chưa tồn tại)

```ts
type RegionId   = `region.${string}`;   // nghĩa MỚI (nhóm Map) sau P0b
type MapId      = `map.${string}`;      // giữ
type ZoneId     = `zone.${string}`;     // nghĩa của RegionId cũ
type SpawnId    = 'default' | `anchor.${string}` | `fromPortal:${ConnectionId}`;
type InstanceId = `inst.${string}`;

interface RegionDef { id: RegionId; display: { name: string; description: string; danger: number };
                      mapIds: readonly MapId[]; entryMapId: MapId;
                      respawn?: { mapId: MapId; spawnId: SpawnId } }   // TÙY CHỌN (W-A15); chưa triển khai khi chưa cần

interface MapDef { id: MapId; regionId: RegionId; builderId: string; sceneKey?: string /* chuyển tiếp */;
                   size; kind; lighting; playerSpawns; zones: readonly ZoneDef[];
                   connections: readonly ConnectionDef[]; deathRespawn;
                   instance?: Partial<InstancePolicy> }   // thiếu trường nào lấy DEFAULT_INSTANCE_POLICY (§4.3)

interface InstancePolicy { mode: 'shared' | 'private'; capacity: number;
                           persistence: 'persistent' | 'ephemeral';
                           allocation: 'fill_first' | 'balanced'; idleTtlMs: number }

interface ConnectionDef { /* giữ trường hiện có */ type: 'portal' | 'door' | 'exit' }

interface InstanceRef { instanceId: InstanceId; mapId: MapId }

interface TravelTicket { characterUid: string; from: InstanceRef | null;
                         to: { instance: InstanceRef; spawnPoint: Point };
                         carry: CharacterCarry }              // CHỈ dữ liệu thuần, JSON-hoá được

interface InstanceAllocator {
  assign(mapId: MapId, who: CharacterUid, hint?: AllocHint): InstanceRef;
  release(ref: InstanceRef, who: CharacterUid): void;
}
```

`LocalInstanceAllocator` giữ đúng hành vi hiện nay: `capacity = 1`; mỗi lần chuyển Map tạo Instance **mới** (quái/drop cũ bị huỷ khi đổi scene, đúng W0 §6) và giải phóng Instance cũ; id cấp bằng bộ đếm được tiêm vào (không `Math.random`, không đọc thời gian hệ thống).

### 4.3. InstancePolicy (cấu hình) và InstanceRuntime (trạng thái) — W-A14

**Quy tắc phân biệt:**

| | `InstancePolicy` | `InstanceRuntime` |
|---|---|---|
| Bản chất | Cấu hình **tĩnh**, theo từng `MapDef` | Trạng thái **chạy**, theo từng Instance |
| Nơi sống | `src/config/worldConfig.ts` (+ kiểu ở `world/`) | Bộ nhớ của phiên chạy; không vào save, không vào `config/` |
| Ví dụ | `mode`, `capacity`, `persistence`, `allocation`, `idleTtlMs` | `instanceId`, `occupants`, `createdAtMs`, quái/Boss/drop/bộ đếm sinh |
| Ai ghi | Con người, lúc thiết kế | Chỉ allocator và scene, lúc chạy |
| Bất biến | Không bao giờ bị sửa lúc chạy | Sinh ra và huỷ theo vòng đời Instance |

Allocator **đọc** policy và **ghi** runtime; không chiều ngược lại. Test (P1): policy là đối tượng đóng băng, không có trường chạy.

**Mặc định hợp lý** (`DEFAULT_INSTANCE_POLICY`, giá trị khởi điểm, chốt ở P1; `MapDef.instance` chỉ ghi đè phần khác mặc định):

| Trường | Mặc định | Lý do |
|---|---|---|
| `mode` | `'private'` | Single-player: Instance chỉ của một người |
| `capacity` | `1` | Khớp hành vi hiện tại; Single-player không có người thứ hai |
| `persistence` | `'ephemeral'` | Khớp hành vi hiện tại: đổi scene thì quái/drop bị huỷ (W0 §6) |
| `allocation` | `'fill_first'` | Chỉ có nghĩa khi `capacity > 1`; chọn một giá trị cố định cho đủ kiểu |
| `idleTtlMs` | `0` | Instance trống bị huỷ ngay |

Với mặc định này, `LocalInstanceAllocator` tái hiện đúng hành vi hiện nay mà **không cần khai báo gì cho từng Map**. Hai Map hiện có (`map.starting_lands`, `map.boss_arena_1`) dùng mặc định ở Single-player. Giá trị hướng MMO (ví dụ làng `shared` + `persistent`, Arena `private` theo nhóm) chỉ **ghi nhận là hướng**, không đặt số capacity khi chưa có yêu cầu; chốt khi tới P6.

---

## 5. Phân tầng trạng thái

### 5.1. Bốn lớp theo vòng đời

| Lớp | Vòng đời | Thuộc về | Đi theo qua `TravelTicket`? |
|---|---|---|---|
| **L1 Lưu lâu dài** | Còn sau khi tắt game | Character | Không (nằm trong save; `saveProgress()` ghi trước khi chuyển, scene đích nạp từ `ProgressStore`) |
| **L2 Phiên chơi, mang theo** | Từ lúc vào game đến lúc chết/thoát; sống qua chuyển Map | RunSession | **Có** (`CharacterCarry`) |
| **L3 Phiên chơi, không mang theo** | Bị tắt/đặt lại khi chuyển Map | RunSession (cục bộ) | Không (reset bằng `endSkillStatesForTravel` + tạo mới) |
| **L4 Thuộc Instance** | Sống cùng Instance, bị huỷ khi Instance bị huỷ | Instance | **Không bao giờ** |
| (Tĩnh) | Cấu hình, không đổi lúc chạy | MapDef/RegionDef/… | Không (tra theo id) |

### 5.2. Bảng dữ liệu cụ thể (vị trí hiện tại trong code → lớp đích)

**Character (L1, lưu lâu dài)** — `PlayerState` + `ProgressStore` + `CharacterSaveV8` [Hiện có]:
`characterUid`, `revision`, `nextItemSeq`; cấp độ và EXP (`LevelState`); `statPoints`, `stats`; `items`, `bag`, `equippedWeapons`, `equippedGear`, `gearLevels`, `gearSockets`; `gold`, `gems`; `skillLoadout`, `extraSkills`, `skillLevels`; `migrationLog`.

**RunSession mang theo (L2)** — hiện ở `progression/RunSession.ts` [Hiện có]:
`vitals {health, armor, energy}` (HP, giáp, năng lượng hiện tại), `skillCooldownUntil`, `dashChargeReadyAt`, `dashReadyAt`.

**Đồng hồ lượt chơi — L2, mang theo, ở lại `RunSession` (Q1 = a, W-A12)** [Hiện có]: `runStartedAt`, `nextBossAt`, `bossNumber`, `bossReady` và `bossWarningShown`. Truy cập qua interface `DifficultyClock` (§5.4). Không thuộc Instance ở giai đoạn này.

**RunSession không mang theo (L3)** — trường trong `WorldScene`, bị tắt/đặt lại khi chuyển [Hiện có]:
`dualGuardActive`, `vanishActive`, `fortress` (Thành Lũy), `heat`, mốc ICD passive (`echoReadyAt`, `shatterReadyAt`, `nextPassiveScanAt`, `bloodFreeReadyAt`, `nextSlashWaveAt`, `nextMomentumAt`, `nextHitEnergyAt`, `nextGemEnergyAt`), `autoAimTarget`, `portalChargeStartedAt`, `portalCooldownUntil` (đặt lại ở scene đích), bất tử khi chuyển. Ghi chú: `resetInstanceRuntimeState()` hiện gom các trường này dưới tên "Instance" theo nghĩa *instance của lớp Scene Phaser*, không phải Instance của kiến trúc này; P3 cần đổi tên để tránh nhầm.

**Instance (L4)** — hiện là trường `WorldScene` [Hiện có]:
nhóm quái `enemies`, `enemyCache`; `corpses` (CorpseManager); `drops` (LootDrop, vàng/ngọc rơi trên sàn); `chests` (WeaponChest); `boss` (Boss đang sống); quái Elite, `EliteMarker`, hộ tống Elite; `spawnIndex`, `regionSpawnCounts`, `regionSpawnPoints`, `regionKillCounts` (sẽ thành `zone*`); quái con ở Arena. Vàng/vật phẩm **trên sàn** thuộc Instance; vàng/vật phẩm **đã nhặt** thuộc Character.

**Ngày/đêm — hiển thị client-local, NGOÀI các lớp L1–L4 (Q3 = A, W-A17):** `AtmosphereSettings` (chế độ `TimeMode`), hệ số đêm `currentNight` và pha chu kỳ trong `createAtmosphere` (`vfx/atmosphere.ts`, `ui/DayNightToggle.ts`). Không phải Character, RunSession hay Instance; không vào save; không đi qua `TravelTicket`. **Hiện chưa ảnh hưởng gameplay** (kết quả kiểm tra §10.2). Nếu sau này ảnh hưởng gameplay thì xem xét `WorldClock` thuộc Instance qua quyết định mới.

### 5.3. Nguyên tắc

1. Trạng thái quái, Elite, Boss, Drop **không bao giờ** thuộc Character hay RunSession.
2. Khi chuyển Map hoặc Instance, dữ liệu nhân vật cần thiết đi qua `TravelTicket`; không đi đường nào khác (không còn kênh ngầm kiểu Phaser registry cho trạng thái nhân vật sau P3).
3. Trạng thái Instance không được vô tình đi theo người chơi sang Instance khác. Cơ chế bảo đảm (thiết kế):
   - Mọi trạng thái L4 thuộc một đối tượng `InstanceRuntime`; Instance mới = đối tượng **mới**, không "reset từng trường" như `resetInstanceRuntimeState()` hiện nay.
   - `CharacterCarry` là danh sách trường **cho phép** (whitelist), toàn dữ liệu thuần: không tham chiếu thực thể Phaser, quái, drop, Boss.
   - Test: `TravelTicket` JSON-hoá nguyên vẹn; không có trường ngoài whitelist.
4. Tài liệu và code phải trả lời được với bất kỳ trường nào: *lưu lâu dài, chỉ trong phiên chơi, hay thuộc Instance*. Bảng 5.2 là nguồn; P1 và P3 phải cập nhật bảng này khi thêm trường.
5. `MapDef` vẫn là cấu hình tĩnh (layout, Zone, Connection); không giữ trạng thái chạy.

### 5.4. DifficultyClock (Q1 = a, W-A12)

**Vấn đề:** logic dùng đồng hồ (bậc độ khó theo thời gian, lịch Boss, cờ `bossReady`) đang gắn thẳng vào trường của scene (`WorldScene.runStartedAt`/`nextBossAt`/`bossNumber`/`bossReady`) và vào dạng lưu của `RunSession`. Hậu quả: không thể đổi nơi giữ đồng hồ (sang Instance sau này) mà không sửa mọi chỗ dùng.

**Thiết kế:** một interface `DifficultyClock` mà phần còn lại của game gọi, thay vì chạm trực tiếp các trường. Dưới đây là **hình dạng ý định**, API chi tiết chốt ở brief P3:

```ts
interface DifficultyClock {
  elapsedMs(now: number): number;          // = now - runStartedAt (thời gian đã trôi của lượt chơi)
  timeTier(now: number): number;           // = timeThreatTier(elapsedMs)  — công thức CŨ, không đổi
  bossSchedule(): { nextBossAt: number; bossNumber: number; bossReady: boolean; warningShown: boolean };
  /* các lệnh đổi trạng thái lịch Boss (đặt bossReady, tăng bossNumber, dời nextBossAt, đánh dấu cảnh báo)
     được liệt kê theo đúng các chỗ ghi hiện có ở P3, không thêm hành vi mới */
}
```

- **Cài đặt hiện tại:** `RunSessionClock`, đọc/ghi trực tiếp các trường `RunSession` (giữ nguyên dạng lưu, nên `captureRunSession`/`extractRunSceneState` không đổi ý nghĩa).
- **Cài đặt tương lai (chỉ ghi nhận, KHÔNG làm):** `InstanceClock`, do `InstanceRuntime` sở hữu, khi kiến trúc Multiplayer cần độ khó và lịch Boss theo từng Instance. Chuyển bằng cách thay cài đặt, không sửa chỗ gọi; `bossReady` khi đó gắn với `MapId`/Instance (rủi ro G7).
- **Bất biến phải bảo toàn (P3 phải có test):**
  1. `timeTier(now) = min(MAX_THREAT_TIER, max(0, floor((now − runStartedAt) / THREAT_INTERVAL_MS)))`, kể cả biên 59999/60000 ms và khi chạm trần.
  2. Mốc là thời gian tuyệt đối, đồng hồ lượt chơi **không** bị đặt lại khi qua cổng (như `RunSession` hiện nay), và **bị đặt lại** khi lượt chơi mới (chết/vào game), đúng hiện trạng.
  3. `effectiveThreatTier(elapsedMs, zone)` của W3 và các công thức spawn/Elite/Boss dùng cùng giá trị như trước; `combatConfig.ts` diff rỗng.
  4. Lịch Boss (`nextBossAt`, `bossNumber`, `bossReady`, `bossWarningShown`) cho cùng chuỗi sự kiện với cùng chuỗi `now` như trước khi tách.
- **Không thuộc `DifficultyClock`:** đồng hồ ngày/đêm hiển thị (client-local, Q3 = A), đồng hồ vòng đời Instance (`createdAtMs`, `idleTtlMs`, W-A18), `portalCooldownUntil`, hồi chiêu skill.
- **Làm khi nào:** thiết kế interface và test bảo toàn ở **P3** (cùng lúc tách `RunSession`); P1 chỉ ghi kiểu nếu cần. Không làm trong P0.

---

## 6. Chuyển Map, chuyển Instance, vị trí xuất hiện [Đề xuất]

```
Người chơi chạm cổng → Scene gửi TravelRequest(connectionId)
   → requestTravel(world, connId, facts)                 [Hiện có, thuần]
   → InstanceAllocator.assign(toMapId, character)        [Đề xuất]  (đủ chỗ → dùng; đầy → chọn/tạo mới)
   → resolveArrival(map, spawnId, conn) → Point          [Đề xuất]
   → TravelTicket{ character, from, to, carry }
   → Scene cũ: lưu, dọn, fade → MapScene.start(ticket): áp carry, đặt người chơi tại Point
```

- **Chuyển Map:** `requestTravel` quyết định được đi hay không và đích; `resolveArrival` chọn điểm theo thứ tự `fromPortal:<connectionId>` → `anchor.*` khai báo trong connection → `default`, rồi kẹp theo `MapDef.size` (không theo `WORLD_*`). Điểm đến lệch khỏi cổng để không đứng sẵn trong vùng kích hoạt; `portalCooldownUntil` giữ nguyên.
- **Chuyển Instance:** cùng một đường `TravelTicket`; chuyển trong cùng Map chỉ khác `from.mapId == to.mapId`.
- **Khi Instance đầy** (chỉ ghi nhận, chưa code): `fill_first` chọn Instance còn chỗ có nhiều người nhất; `balanced` chọn ít người nhất; không còn thì tạo mới; đặt chỗ (reserve) trong lúc fade để hai người không giành chỗ cuối.
- **Chết/hồi sinh:** giữ D6 (về làng) qua `deathRespawn`, cùng đường `TravelTicket`. `RegionDef.respawn` là **tùy chọn** (W-A15): có thì ưu tiên điểm hồi sinh của Region, không có thì dùng `MapDef.deathRespawn` như hiện nay; chưa triển khai khi chưa cần.
- **Vị trí không vào save** (D5): `CharacterLocation {mapId, instanceId, x, y}` chỉ ở bộ nhớ. Khi có Map ngoài thứ ba, cân nhắc `lastSafeLocation` trong save (nâng phiên bản save, cần quyết định riêng).
- **Scene:** một `MapScene` chung + registry `builderId → buildMap()` (P4); `BossArenaScene` thành builder cộng luật Boss.

---

## 7. Sẵn sàng cho MMORPG (đánh giá, chưa làm)

| Yêu cầu | Hiện trạng | Khi nào |
|---|---|---|
| Luật chuyển Map thuần, server chạy lại được | **Có** (`requestTravel`) | — |
| Nhân vật tách khỏi scene (`PlayerState`, `Repository`, uid, revision) | **Có** | — |
| Id ổn định (map, zone, connection) | **Có** | thêm `RegionId`, `InstanceId` ở P1 |
| Trạng thái Instance tách khỏi scene (G6) | Chưa | P3 |
| Trạng thái chuyển Map qua kênh có kiểu (không dùng Phaser registry) | Chưa (RunSession qua registry) | P3 |
| Đồng hồ/RNG tiêm được | Chưa (`Math.random` ~39 chỗ, `game.loop.time`) | P5 |
| Lớp lệnh/input (client gửi lệnh, server quyết) | Chưa | P5 |
| Mô phỏng headless không cần Phaser | Chưa (luật sinh/drop/Boss trong `WorldScene`) | P5 |
| Allocator có sức chứa, chính sách đầy, đặt chỗ | Chưa (chỉ Local) | P3 (Local), P6+ (thật) |
| Quan tâm theo Instance (AOI), cách ly người chơi giữa Instance | Chưa | tự nhiên nếu mọi thực thể thuộc `InstanceRuntime` |
| Đồng hồ độ khó/lịch Boss sau interface `DifficultyClock` (G9); `bossReady` theo Map/Instance (G7) | Chưa | `DifficultyClock` ở P3 (cài đặt `RunSessionClock`); chuyển sang Instance chỉ khi cần Multiplayer (P6+) |
| `world/` và `config/` không import Phaser | Có (`worldGraph.ts`) | giữ, có kiểm |

---

## 8. Lộ trình P0–P6

Mỗi gói đi theo `docs/studio/WORKFLOW.md`: baseline Git → Developer → QA → chơi thử → Cổng 2. `WorldScene.ts` luôn tuần tự. Điểm dừng cho phép: sau P0b, P1, P2.

| GĐ | Nội dung | Hành vi game |
|---|---|---|
| **P0a** | **Tài liệu** (`WORLD_ARCHITECTURE.md`, `DECISIONS.md`). **Đã duyệt, đã commit (aebd6bc).** | Không |
| **P0b** (đã triển khai, QA Đạt, người dùng chơi thử 15/15 Đạt, đã commit 61335dd) | Đổi tên thuần Region → Zone trong code (type, function, biến, hằng, id chuỗi, mã lỗi, chú thích). **Không đổi tên file.** | Không |
| **P1** (đã triển khai, QA Đạt, người dùng chơi thử 7/7 PASS, **ACCEPTED** 2026-11-17; chờ xác nhận commit) | Mô hình tĩnh Region/Instance + module thuần (`instance.ts`, `localInstanceAllocator.ts`, `arrival.ts`), chưa nối vào game | Không |
| **P2** (đã triển khai, QA Đạt, playtest 13/13 Đạt, **ACCEPTED** 2026-11-17; chờ xác nhận commit) | Đường chuyển Map đúng nghĩa: `spawnId` thật, nhiều cổng/map, fade/chargeMs đọc từ connection, kẹp theo `MapDef.size` | Y hệt |
| **P3** (chia 3 gói: **P3a** `DifficultyClock` đã triển khai, QA Đạt, playtest 8/10 Đạt, **ACCEPTED** 2026-11-17, chờ xác nhận commit; P3b `TravelTicket` + tách `RunSession`; P3c `InstanceRuntime` + `LocalInstanceAllocator` nối vào game) | `InstanceRuntime` + `LocalInstanceAllocator` nối vào game; tách `RunSession` theo lớp; `TravelTicket` thay kênh registry; **`DifficultyClock` với cài đặt `RunSessionClock`** (đồng hồ ở lại `RunSession`, Q1 = a) + test bảo toàn công thức (§5.4) | Y hệt |
| **P4** | `MapScene` chung + registry builder; thêm Map/Region thứ hai để kiểm chứng | **Có nội dung mới** (cần thiết kế riêng; D3 hiện nói chưa thêm bản đồ mới) |
| **P5** | Chuẩn bị MMO: RNG/Clock tiêm được, lớp lệnh, mô phỏng headless (theo `DATA_ARCHITECTURE.md` §5) | — |
| **P6+** | Server, networking, allocator thật, AOI | Ngoài phạm vi hiện tại |

### 8.1. P0b — phạm vi và tiêu chí QA (CHƯA lập baseline, chưa giao Developer)

**Đổi tên** (bảng đầy đủ để dựng brief): `RegionDef/RegionId/RegionDisplay → ZoneDef/ZoneId/ZoneDisplay`; `MapDef.regions → zones`; `regionAt → zoneAt`; id `region.village|wilds_near|wilds_far|arena → zone.*`; hằng `REGION_VILLAGE/WILDS_NEAR/WILDS_FAR/ARENA/REGION_TRACKER/REGION_BANNER/REGION_DANGER_MAX/REGION_DESCRIPTION_MAX_CHARS → ZONE_*`; `createRegionTracker → createZoneTracker`; component `RegionBanner → ZoneBanner` (chỉ tên lớp/biến; file `ui/RegionBanner.ts` giữ tên); mã lỗi `duplicate_region_id`, `region_*` → `duplicate_zone_id`, `zone_*`; trường `WorldScene` `regionSpawnCounts/regionSpawnPoints/regionKillCounts → zone*`.

**Đã kiểm toàn repo cho việc đổi id (W-A13, kết quả đầy đủ ở §10.1):** chuỗi `region.*` chỉ được viết ra ở 2 file `src/` không phải test (`config/worldConfig.ts`, `world/worldGraph.ts`), 1 file test có chuỗi literal (`worldGraph.test.ts`) và một số tài liệu; các nơi khác chỉ tham chiếu qua hằng `REGION_*`/`.id`. Không có trong `package.json`, `index.html`, `vite.config.ts`, `.claude/`, `public/`, và không có trong save (§10.1).

**File dự kiến được sửa (11):** `src/world/worldGraph.ts`, `worldGraph.test.ts`, `eliteRules.ts`, `eliteRules.test.ts`, `spawnPattern.ts`, `spawnPattern.test.ts`, `regionTracker.ts`, `regionTracker.test.ts`, `src/ui/RegionBanner.ts`, `src/config/worldConfig.ts`, `src/scenes/WorldScene.ts`. Không tạo file, không `git mv`. `docs/PROJECT_MAP.md` cập nhật tên ký hiệu trong cùng gói (Lead).

**Tiêu chí QA:**
1. `npm run build`, `npx tsc --noEmit`, `npm test` qua; số test không giảm so với baseline.
2. `src/` không còn ký hiệu cũ: `RegionDef|RegionId|RegionDisplay|regionAt|createRegionTracker|REGION_|'region\.` và không còn `MapDef.regions`. Tên **file** cũ còn là chủ ý (W-A11).
3. Giá trị khoá giữ nguyên (do test): id mới `zone.village|wilds_near|wilds_far|arena`; id `map.*`, `conn.*` không đổi; `MAIN_DEFAULT_SPAWN {1920,1440}`, `WILDS_NEAR_BOUNDS`, `WILDS_FAR_TIER_OFFSET`, các `*_SPAWN_PATTERN`; chữ hiển thị biển tên.
4. `git diff` của `worldConfig.ts` chỉ là đổi tên, không số liệu nào đổi; `combatConfig.ts`, `enemyConfig.ts`, `bossArenaConfig.ts`, `src/progression/**` diff rỗng; test chỉ khác ở tên ký hiệu/chuỗi id.
5. `worldGraph.ts` không import `phaser`; HEAD không đổi; phạm vi theo `WORKFLOW.md` §6a.
6. **Test bảo vệ đổi id (W-A13)**, nằm trong `worldGraph.test.ts` và các test hiện có:
   - khoá giá trị chính xác `zone.village`, `zone.wilds_near`, `zone.wilds_far`, `zone.arena` (thay các khẳng định `region.*` hiện có, 24 chỗ ở `worldGraph.test.ts`);
   - **tiền tố `region.` bị dành riêng** cho Region mới: không `MapId`/`ZoneId`/`ConnectionId` nào của `WORLD` bắt đầu bằng `region.`; mọi `ZoneId` bắt đầu `zone.`;
   - `validateWorld` vẫn rỗng cho `WORLD` và các ca hỏng cũ vẫn bị bắt, với mã lỗi mới `zone_*`;
   - bảng ánh xạ cũ → mới (4 id) nằm trong test dưới dạng dữ liệu, để lần sau ai đó phân tích save/log cũ chứa id cũ có chỗ tra;
   - **khoá cấu trúc save**: danh sách khoá của `CharacterSaveV8` do test khoá, và save mặc định JSON-hoá không chứa chuỗi `region.` hay `zone.` (đảm bảo id vùng không lọt vào dữ liệu lưu về sau).
7. **An toàn save (W-A13):** `src/progression/**` diff rỗng; `git grep -i region -- src/progression` rỗng trước và sau; không đường ghi `localStorage` nào chứa id vùng (chỉ `progression/LocalStorageRepository` ghi tiến trình và `ui/combat/ControlLayoutStore` ghi bố cục nút, kết quả kiểm tra ở §10.1). Giới hạn nói thẳng: QA/Lead **không đọc được** `localStorage` trình duyệt thật của người dùng; bằng chứng là cấu trúc (không đường ghi nào có id), không phải dữ liệu thật.
8. Chơi thử: vùng gần/xa hiện đúng biển tên; qua cổng Arena và về đúng vị trí, HP/hồi chiêu như trước; Elite xuất hiện ở hai vùng; console không lỗi; **mở nhân vật đã có tiến trình: cấp, túi đồ, trang bị, vàng/ngọc còn nguyên** (xác nhận save không hỏng bằng chơi thật).

### 8.2. P1 — kế hoạch riêng (chưa triển khai)

Mục tiêu: thêm mô hình Region/Instance dạng **module thuần, chưa nối vào game**, kèm test. Điều kiện: P0b đã nghiệm thu.
- **Được sửa:** `worldGraph.ts`, `worldConfig.ts` (thêm `region.starting` chứa hai map; `DEFAULT_INSTANCE_POLICY` và `MapDef.instance` ghi đè tùy chọn, §4.3; `RegionDef.respawn` chỉ là trường tùy chọn, không dùng), `worldGraph.test.ts`, `docs/PROJECT_MAP.md`.
- **Được tạo:** `src/world/instance.ts` (`InstanceRef`, `TravelTicket`, `CharacterCarry`, `InstanceAllocator`), `src/world/localInstanceAllocator.ts` (+test), `src/world/arrival.ts` (+test).
- **Không đụng:** `WorldScene.ts`, `BossArenaScene.ts`, `RunSession.ts`, save.
- **QA:** `validateWorld(WORLD)` rỗng và bắt được các lỗi: Map không thuộc Region, `entryMapId` ngoài Region, Region trùng id, `capacity < 1`, `idleTtlMs < 0`, `mapIds` lệch `MapDef.regionId`; allocator cấp `InstanceRef` mới mỗi lần, `release` giải phóng, một người không giữ hai Instance, id xác định; `resolveArrival` theo thứ tự `fromPortal` → anchor → `default`, kẹp `MapDef.size`; `TravelTicket` JSON-hoá nguyên vẹn, không trường ngoài whitelist; module mới không import `phaser`; diff `src/scenes/**` rỗng.

---

## 9. Kiểm tra nhất quán với kiến trúc và tài liệu hiện có (2026-11-16)

| Mục kiểm | Kết quả |
|---|---|
| Mô tả `worldGraph.ts`/`worldConfig.ts` (kiểu, 2 map, 4 vùng, 2 connection, `requestTravel`…) | Khớp code |
| Luồng chuyển Map (mục 3.2) so với `WorldScene.startPortalTravel`, `create`, `RunSession` | Khớp code |
| `spawnId` không dùng lúc chạy (G2) | Khớp: `create()` dùng `town.playerSpawn`; `spawnId` chỉ ở `validateWorld` |
| Nội dung save v8 (L1) so với `CharacterSaveV8`/`CharacterSave` | Khớp |
| `WORLD_MAP_DESIGN.md` D5 (không lưu map), D6 (về làng, một điểm `default`) | Nhất quán; tài liệu này giữ D5, D6 |
| `WORLD_MAP_DESIGN.md` D3 ("chưa thêm bản đồ mới") | **Cần duyệt lại** trước P4 (thêm Map/Region thứ hai) |
| `DATA_ARCHITECTURE.md` §5 (để dành Multiplayer: RNG, tick, headless, tách `WorldScene`) | Nhất quán; P5 trỏ về đó |
| Tên "Region" trong `WORLD_MAP_DESIGN.md`, `PROJECT_MAP.md`, `GAMEPLAY_LOOP_M.md`, `DECISIONS.md` | Còn dùng nghĩa cũ (= Zone) cho tới P0b; mục 1 là nguồn thuật ngữ mới. **Chưa sửa** các tài liệu đó trong P0a |
| Yêu cầu "Instance có đồng hồ" so với đồng hồ lượt chơi nằm trong `RunSession` (G9) | **Đã giải quyết bằng Q1 = a**: đồng hồ độ khó/lịch Boss ở lại `RunSession` sau `DifficultyClock`; "đồng hồ" của Instance chỉ là vòng đời (`createdAtMs`, `idleTtlMs`), không phải độ khó. Lời liệt kê ban đầu "Instance gồm đồng hồ" đã được người dùng xác nhận theo nghĩa này (R7, W-A18) |
| Trạng thái ngày/đêm so với phân tầng (L1–L4) | **Đã quyết định (Q3 = A)**: hiển thị client-local, ngoài L1–L4; đã xác minh không ảnh hưởng gameplay (§10.2, W-A17) |
| Chuỗi id `region.*` so với save và dữ liệu lưu | Đã kiểm toàn repo, không có trong save (§10.1) |

---

## 10. Kết quả kiểm tra (Q2, Q3)

### 10.1. Q2 — kiểm toàn repo cho id `region.*` (điều kiện của W-A13)

Phạm vi kiểm: toàn repository (trừ `node_modules/`, `dist/`, `.git/`, `package-lock.json`): `src/` (kể cả test), `docs/`, `.claude/`, `public/`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, và mọi nơi ghi `localStorage`/JSON.

| Nơi | Kết quả |
|---|---|
| `src/` không phải test: chuỗi `region.*` được **viết ra** | Chỉ 2 file: `config/worldConfig.ts` (4 hằng `REGION_VILLAGE/WILDS_NEAR/WILDS_FAR/ARENA`, dòng 33–38) và `world/worldGraph.ts` (kiểu `RegionId` dạng template `region.${string}` dòng 21; mã lỗi `region_*` dòng 278–283 và các lời gọi `fail`; chuỗi thông báo) |
| `src/` không phải test: nơi **dùng** vùng | Qua `.id`, `regionAt(...)`, kiểu `RegionId`/`RegionDef`: `WorldScene.ts`, `world/regionTracker.ts`, `world/eliteRules.ts`, `world/spawnPattern.ts`, `ui/RegionBanner.ts`; khoá `Map` trong bộ nhớ (`regionSpawnCounts`, `regionSpawnPoints`, `regionKillCounts`) |
| Test | Chuỗi literal: `worldGraph.test.ts` (24 dòng). Qua hằng `REGION_*`: `worldGraph.test.ts` (16), `eliteRules.test.ts` (8), `spawnPattern.test.ts` (18), `regionTracker.test.ts` (54) |
| Tài liệu | `docs/PROJECT_MAP.md` (dòng 140), `docs/WORLD_MAP_DESIGN.md` (dòng 9, 26, 47, 65), `docs/studio/DECISIONS.md` (một dòng dài, mục "Đổi thứ tự ưu tiên…"), và chính tài liệu này. Spec lịch sử không viết lại; chỉ thêm ghi chú trỏ về §1 |
| Cấu hình/build: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/`, `.claude/**` | Không có |
| Save và dữ liệu lưu | `localStorage` chỉ được dùng ở `progression/LocalStorageRepository` (khoá `PROGRESS_STORAGE_KEY`, ghi blob `CharacterSaveV8` theo `CharacterId`) và `ui/combat/ControlLayoutStore` (bố cục nút). `src/progression/**` **không có** chữ "region" (0 lần). `CharacterSave`/`CharacterSaveV8` là kiểu liệt kê trường, không có trường vùng. `RunSession` ở Phaser registry (bộ nhớ, không bền) không chứa id vùng. Không có `setData`/`getData` khoá theo region; không có texture/anim key `region-…` |

**Kết luận:** chuỗi `region.*` chỉ là giá trị trong bộ nhớ, test và tài liệu; **không được ghi vào save hay bất kỳ nơi lưu trữ nào**. Đổi sang `zone.*` không chạm dữ liệu lưu. **Giới hạn nói thẳng:** không đọc được `localStorage` trình duyệt thật của người dùng và không kiểm `dist/` (sinh lại khi build); kết luận dựa trên cấu trúc code. Việc còn lại để P0b bảo vệ: test khoá id, test cấu trúc save, kiểm bằng chơi thật (§8.1 mục 6–8).

### 10.2. Q3 — ngày/đêm: kết quả kiểm tra và quyết định (**Q3 = A, đã chốt**)

**Kết quả đọc code** (`vfx/atmosphere.ts`, `ui/DayNightToggle.ts`, `config/atmosphereConfig.ts`; chưa chạy game):

1. **Ai sở hữu trạng thái?** Ba mảnh, đều phía client/trình bày:
   - cấu hình tĩnh `DAY_NIGHT` (`dayMs` 150 000, `nightMs` 90 000, `transitionMs` 20 000, `manualEaseSeconds` 1.5);
   - `AtmosphereSettings` singleton cấp module (`cachedSettings`, đọc URL một lần: `?time=day|night`, `?atmo=off`…), mang chế độ `TimeMode = 'auto'|'day'|'night'`; **dùng chung mọi scene**, bị nút/phím N đổi qua `setTimeMode`;
   - closure trong `createAtmosphere(scene, target)`: `startedAt = scene.time.now`, hệ số `night` đuổi theo mục tiêu `nightFactor(now − startedAt, mode)` mỗi frame, xuất ra biến cấp module `currentNight` cho `DayNightToggle` đọc.
2. **Nhịp:** bắt đầu ban ngày mỗi lần `createAtmosphere` chạy ⇒ vào lại map chính (sau Arena hoặc restart) thì chu kỳ **bắt đầu lại từ ban ngày**. Arena không tạo atmosphere (`createLighting()` rỗng; `MapDef.lighting = 'fixed'`). Đồng hồ ngày/đêm **độc lập** với đồng hồ lượt chơi (`runStartedAt`).
3. **Gameplay hay chỉ hiển thị?** **Chỉ hiển thị.** Đầu file ghi "Không chứa số liệu sát thương/gameplay". Chỉ `ui/DayNightToggle.ts` đọc `getCurrentNightFactor`/`getTimeMode`; `WorldScene` chỉ gọi `createAtmosphere` và `createDayNightToggle`; `town.ts`, `bossArena.ts`, `vfxConfig.ts`, `worldConfig.ts` chỉ lấy hằng hiển thị (tint, ánh sáng, độ sâu, màu biển làng). **Không file nào trong `entities/`, `combat/`, `systems/`, `skills/`, `progression/` import atmosphere.**
4. **Ảnh hưởng quái, spawn, Boss, Drop?** **Không** (không có điểm đọc). Ghi chú Elite "thấy từ xa ban đêm" là yêu cầu độ tương phản hiển thị, không đọc hệ số đêm.
5. **Dữ liệu `MapDef.lighting`** (`'day_night'|'fixed'`) có trong dữ liệu tĩnh nhưng **code không đọc để chọn ánh sáng**: scene tự ghi đè `createLighting()`; chỉ `worldGraph.test.ts` khoá giá trị.
6. Không nằm trong save và không nằm trong `RunSession`.

**Quyết định (người dùng chọn Phương án A, W-A17):**

- **Ngày/đêm là trạng thái hiển thị, client-local.** Không đưa vào `InstanceRuntime` hay `RunSession`; không thuộc Character; không đi qua `TravelTicket`; không vào save. **Hiện chưa ảnh hưởng gameplay** (không có điểm đọc ở quái, spawn, Boss, Drop).
- `MapDef.lighting` là cấu hình tĩnh chọn hồ sơ ánh sáng; `MapScene` (P4) đọc nó thay vì mỗi scene ghi đè. Giữ hành vi hiện nay (chu kỳ bắt đầu ban ngày khi vào map chính). Khi có Multiplayer, mỗi client có thể thấy pha khác nhau; chấp nhận được vì không ảnh hưởng gameplay.
- **Điều kiện xem xét lại (cổng quyết định):** nếu sau này ngày/đêm ảnh hưởng gameplay (quái, spawn, Boss, Drop theo đêm) hoặc cần mọi người trong Instance thấy cùng thời gian, thì mở quyết định mới và xem xét `WorldClock` thuộc Instance **trước khi** code. Phương án B (`WorldClock` thuộc Instance/Region, đồng bộ pha; chi phí: trạng thái đồng bộ, cần đồng hồ tiêm được) bị **hoãn**, chưa chọn.
- **Rủi ro cần biết (R9):** `cachedSettings` và `currentNight` là trạng thái toàn cục cấp module, không tách theo scene/Instance. Ổn ở Single-player; cần dọn khi chạy nhiều scene song song hoặc headless.
- Việc làm: **không có** trong P0–P3. Chỉ P4 (`MapScene` đọc `MapDef.lighting`) và tùy chọn P5 (export `nightFactor` thuần để test).

---

## 11. Trạng thái câu hỏi, điểm chưa xác định và rủi ro

**Trạng thái Q1–Q7**

| Q | Nội dung | Trạng thái |
|---|---|---|
| Q1 | Đồng hồ lượt chơi | **Đã chốt (a)**: ở lại `RunSession`, tách bằng `DifficultyClock` (W-A12, §5.4) |
| Q2 | Đổi id `region.*` → `zone.*` | **Đã chốt có điều kiện** (W-A13): đã kiểm toàn repo (§10.1); test bảo vệ và xác nhận save ở P0b (§8.1) |
| Q3 | Ngày/đêm | **Đã chốt (A)**: hiển thị client-local, không vào `InstanceRuntime`/`RunSession`; chưa ảnh hưởng gameplay; nếu sau này có thì xem xét `WorldClock` thuộc Instance (W-A17, §10.2) |
| Q4 | `InstancePolicy` theo từng Map | **Đã chốt** (W-A14, §4.3): mặc định + ghi đè tùy chọn, tách policy/runtime |
| Q5 | `RegionDef.respawn` | **Đã chốt hướng** (W-A15): tùy chọn, chưa triển khai |
| Q6 | Region/Map thứ hai | **Hoãn** tới P4 (W-A16) |
| Q7 | Đổi tên file | **Đã chốt**: giữ tên cũ trong P0; đổi tên trong gói riêng, Lead làm và kiểm tra Git (W-A11) |

**Điểm còn chưa xác định**
- (Q3 và R7 đã chốt; không còn pending ở cấp quyết định kiến trúc.)
- Giá trị `DEFAULT_INSTANCE_POLICY` cuối cùng và các số hướng MMO (capacity làng/Arena): chốt ở P1 (mặc định) và P6 (MMO).
- **Gói đổi tên file:** khi nào làm (trước hay sau P1), phương thức Git (`git mv`, kiểm `git status`/`git diff -M`), có cập nhật `PROJECT_MAP.md` kèm theo không.
- Các tài liệu cũ (`WORLD_MAP_DESIGN.md`, `PROJECT_MAP.md`, `GAMEPLAY_LOOP_M.md`, `DECISIONS.md`) còn dùng "Region" nghĩa cũ cho tới P0b; chưa có ghi chú trỏ về §1.
- API chi tiết của `DifficultyClock` (danh sách lệnh đổi lịch Boss): chốt ở brief P3 theo các chỗ ghi hiện có.

**Rủi ro và mâu thuẫn chưa giải quyết**
- R1: P0b chạm `WorldScene.ts` (≈42 chỗ) và ~334 lần xuất hiện ở 11 file; đổi tên thuần cơ học nhưng sót một chỗ là lỗi biên dịch hoặc lệch chuỗi id; `tsc` và test bắt được phần lớn.
- R2: Sau P0b, tên file (`regionTracker.ts`, `RegionBanner.ts`) lệch tên ký hiệu (`createZoneTracker`, `ZoneBanner`) cho tới gói đổi tên file; dễ gây nhầm khi tìm kiếm và khi đọc `PROJECT_MAP`.
- R3: `WorldScene.ts` đã khoảng 4000 dòng; P3 làm nó phức tạp thêm nếu không tách song song.
- R4: Thuật ngữ cũ (Region = Zone) còn trong nhiều tài liệu tới khi cập nhật.
- R5: `DifficultyClock` (Q1 = a) thêm một lớp gián tiếp trên các chỗ dùng đồng hồ (`WorldScene` 45, `bossArenaRules.ts` 16, `BossArenaScene` 3, `worldGraph.ts` 3). Sai một chỗ là lệch bậc độ khó hoặc lịch Boss; cần test bảo toàn công thức (§5.4) và nên tách P3 thành bước nhỏ.
- R6: Hiệu năng khi nhiều Zone/Instance chưa đo (hoãn theo quyết định 2026-11-16).
- **R7 (đã giải quyết, W-A18):** lời liệt kê ban đầu "Instance gồm … đồng hồ" từng lệch Q1 = a. Người dùng xác nhận: đồng hồ vòng đời Instance gồm `createdAtMs`, `idleTtlMs`; đồng hồ độ khó và lịch Boss (`runStartedAt`, `nextBossAt`, `bossNumber`, `bossReady`) vẫn thuộc `RunSession` và **không** chuyển sang Instance ở giai đoạn hiện tại. Chỉ xem lại khi có Multiplayer (P6+).
- R8: Id `region.*` có thể còn trong ghi chú/log **ngoài repo** (không kiểm được); bảng ánh xạ cũ → mới trong test là chỗ tra.
- R9: Trạng thái ngày/đêm là biến toàn cục cấp module (§10.2), cản trở chạy nhiều scene song song nếu sau này cần.
- R10: `MapDef.lighting` có trong dữ liệu nhưng code chưa đọc; dễ tưởng đã có hiệu lực.
- **R11 (ghi từ QA P1, không chặn):** `LocalInstanceAllocator` chỉ tái dùng Instance khi `mode 'shared'` và `capacity > 1`. Instance `persistent` với `private`/capacity 1 sẽ không bao giờ được tái dùng và `idleTtlMs` chưa được thi hành, nên Instance rỗng cộng dồn. Chưa có Map nào dùng tổ hợp này; khi nối vào game (P3) phải nêu rõ hoặc chặn bằng `validateWorld`.
- **R12 (độ phủ test P1, không chặn):** chưa có test cho `hint.preferInstanceId` trỏ tới Instance đầy hoặc Map khác (code đã lọc đúng); bổ sung khi chạm allocator ở P3.
