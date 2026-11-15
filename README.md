# Pixel World

Game **MMORPG 2D / Action RPG top-down** phong cách pixel art Grim Dark Fantasy,
xây dựng với **Phaser 4 + TypeScript + Vite**. Cảm hứng: hình ảnh Soul Knight,
thế giới Ngọc Rồng Online, chiến đấu Diablo; IP và tài sản nguyên bản
(xem `docs/DESIGN_PILLARS.md`).

## Yêu cầu môi trường

- Node.js >= 22 (khuyến nghị bản LTS mới nhất)
- npm >= 10

## Cài đặt

```bash
npm install
```

## Chạy môi trường phát triển

```bash
npm run dev
```

Mở địa chỉ mà Vite in ra trong terminal (mặc định `http://localhost:5173`).

## Build và xem thử bản production

```bash
npm run build     # type-check bằng tsc, sau đó build vào thư mục dist/
npm run preview   # chạy thử bản build
```

## Điều khiển

| Hành động           | Phím / chuột                          |
| ------------------- | ------------------------------------- |
| Bắt đầu / chọn hero | `Enter` hoặc `Space` ở menu           |
| Chọn nhân vật       | Chuột hoặc `1` `2` `3`                |
| Di chuyển           | `W` `A` `S` `D` hoặc phím mũi tên      |
| Ngắm                 | Di chuyển chuột                       |
| Tấn công            | Giữ chuột trái hoặc `Space`            |
| Đổi vũ khí          | `1` ô 1, `2` ô 2, `Q` xoay vòng        |
| Kỹ năng nhân vật    | `3` `4` `5` (mở khoá ở LV 5/10/15)     |
| Cơ động             | Là kỹ năng riêng của lớp (ô `3` `4` `5`); không còn Dash chung |
| Mở hòm vũ khí       | **Chạm vào hòm** (tự mở, lộ vũ khí)    |
| Nhặt vũ khí từ hòm  | `F` khi đứng gần hòm đã mở            |
| Bảng thuộc tính     | `C` (tạm dừng game)                   |
| Túi đồ vũ khí       | `I` (tạm dừng game)                   |
| Chuyển tab panel    | `Tab`                                 |
| Chơi lại khi chết   | `R`                                   |

## Nhân vật

Chọn 1 trong 3 class ở màn hình chọn nhân vật:

| | **KNIGHT** | **RANGER** | **MAGE** |
|---|---|---|---|
| HP / giáp / energy | 8 / 6 / 80 | 6 / 4 / 100 | 5 / 3 / 140 |
| Speed | ×0.95 | ×1.1 | ×1.0 |
| Vũ khí khởi đầu | Sword + Blaster | Bow + Blaster | Staff + Blaster |
| **LV 5** | SHIELD BASH | TRIPLE VOLLEY | ARCANE NOVA |
| **LV 10** | WHIRLWIND | EVASIVE ROLL | BLINK |
| **LV 15** | IRON WILL | ARROW RAIN | METEOR |

- **XUNG PHONG KHIÊN** (`shield_bash`): lao 130 px (giáp cứng, không bất tử), đập khiên nón + choáng 0.6 giây, hồi 9 giây.
- **WHIRLWIND**: xoay 360°, bán kính 130, damage 4×.
- **IRON WILL**: hồi 4 HP + bất tử 1.5 giây.
- **TRIPLE VOLLEY**: 5 mũi tên xòe.
- **LƯỚT BÓNG** (`evasive_roll`): lướt 170 px, bất tử 0.22 giây, xuyên quái; tích 2 lượt, mỗi lượt hồi 4.5 giây.
- **ARROW RAIN**: mưa tên tại điểm ngắm sau 0.6 giây.
- **ARCANE NOVA**: nổ AoE 190 px, damage 4×.
- **DỊCH CHUYỂN** (`blink`, tuỳ chọn, mở ở LV 9): dịch 200 px, nổ tại vị trí cũ, hồi 7 giây.
- **METEOR**: thiên thạch rơi sau 0.7 giây, damage 8×.

## Tiến trình, điểm thuộc tính & túi đồ

- Level/XP, **điểm thuộc tính chưa dùng**, chỉ số đã cộng, **túi vũ khí** và 2 ô
  trang bị được **lưu vĩnh viễn theo nhân vật** trong `localStorage`
  (`pixel-world:progress:v1`).
- XP curve: 15 XP/quái, ngưỡng đầu 20, mỗi level ×1.15
  (LV5 ≈ 9 quái, LV10 ≈ 23 quái, LV15 ≈ 54 quái).
- Mỗi level nhận **+5 điểm thuộc tính**; level-up tự mở bảng Stats (game tạm dừng).
- Kỹ năng tự mở khi đạt LV 5/10/15; đã mở thì giữ mãi.
- Nhấn `R` khi chết không xoá level/điểm/túi đồ; chỉ reset trạng thái run.
- Hệ buff/synergy cũ đã **tắt** (code vẫn giữ trong repo để bật lại sau).
- Muốn reset tiến trình: xoá key `pixel-world:progress:v1` trong DevTools
  → Application → Local Storage.

### Bảng thuộc tính (`C`)

| Stat | Hiệu ứng mỗi điểm |
|---|---|
| VITALITY | +1 HP tối đa |
| GUARD | +1 giáp tối đa |
| ENERGY | +5 energy tối đa |
| POWER | +4% damage |
| HASTE | -2% hồi chiêu (cap -65%) |
| AGILITY | +2% tốc chạy |

- Cộng bằng click nút `+` hoặc phím `1–6`; áp dụng ngay vào Player và lưu lại.
- Cột phải hiển thị chỉ số dẫn xuất: Max HP/Armor/Energy, Damage %, Cooldown %, Speed %.
- HUD hiện `+N STAT POINTS  [C]` khi còn điểm chưa dùng.

### Túi đồ & trang bị (`I`)

- Trang bị ban đầu đơn giản: **đúng 2 vũ khí khởi đầu** của nhân vật,
  nằm trong túi và gắn ở ô `[1] [2]`.
- Nhặt vũ khí từ hòm → **thêm vào túi** (không tự thay vũ khí đang cầm).
- Trong tab Inventory: click vũ khí để chọn, rồi click ô `[1]/[2]` hoặc bấm `1/2`
  để trang bị. Không cho cùng một vũ khí nằm ở cả 2 ô.
- Túi chỉ chứa vũ khí; không có giáp/phụ kiện.

## Map & nhân vật

- **Town 3840×2560 px** (120×80 tile, tile 32×32), có nhà ở, quán rượu, cửa hàng,
  lò rèn, nhà thờ, cối xay gió, chợ, giếng, hồ nước, đồng ruộng, cây cối và prop.
- Nhà/cây/hồ nước có collision; camera follow Player.
- Nhân vật **48×48 px**, animation 4 hướng: `idle/run/attack/hurt/death`.
- Chạy theo hướng di chuyển; đứng/đánh theo hướng ngắm.
- Quái scale 48×48, hòm vũ khí scale 1.5×.

> Nhân vật hiện là placeholder 48×48 sinh tại runtime, recolor theo class
> (Knight xanh/đỏ, Ranger xanh lá/vàng, Mage tím/trắng). Có thể thay atlas thật sau.

## Hòm vũ khí & vũ khí đặc biệt

- Quái có **28%** cơ hội rơi hòm khi chết (tối đa 2 hòm cùng lúc); hòm tự biến mất
  sau 30 giây nếu không mở.
- **Chạm vào hòm** → hòm tự mở, lộ vũ khí; **`F`** để nhặt vào túi đồ.
- 3 vũ khí đặc biệt: **CUNG** (giữ để sạc, thả bắn, xuyên nhiều quái),
  **LƯỠI HÁI** (xoay 360°), **TRƯỢNG** (orb xuyên phá).
- Mở `I` để chọn vũ khí trong túi và trang bị vào ô 1/2.

### Hòm & vũ khí Legendary

- Quái có **1.5%** cơ hội rơi **hòm Legendary** vàng/tím (tối đa 1 hòm cùng lúc,
  tồn tại 45 giây). Đây là tỉ lệ rất thấp; hòm thường 28% không đổi.
- Hòm Legendary chắc chắn chứa 1 trong 3 vũ khí cực hiếm:

| Vũ khí | Cơ chế | Sức mạnh |
|---|---|---|
| **EXCALIBUR** | Bắn beam ánh sáng xuyên mọi quái trên đường thẳng | 6× melee × global, range 420, CD 0.5 s, không tốn energy |
| **DRAGON BOW** | Mũi tên nổ AoE khi trúng hoặc hết thời gian bay | 3× trực tiếp + 4× nổ (r=110), 8 energy, CD 0.75 s |
| **VOID STAFF** | Hố đen 2.2 s hút quái, tick damage, nổ lớn khi kết thúc | radius 200, hút 110 px/s, tick 1×/0.4 s, nổ cuối 6×, 30 energy, CD 3.5 s |

- Luồng nhận giống hòm thường: **chạm để mở/lộ vũ khí → `F` để nhặt** và thay
  vũ khí đang cầm.

## Quái

- **Melee (purple slime)**: HP 3, đuổi thẳng, gây sát thương khi chạm.
- **Ranged (magenta mage)**: HP 2, giữ khoảng cách, telegraph 550 ms rồi bắn orb.
- Hai loại spawn luân phiên quanh town.

## Độ khó theo thời gian (Threat)

- Mỗi **60 giây** trong run, threat tăng 1 bậc (tối đa 5).
- Số quái tối đa: `4 + threat × 2`, cap **14**.
- Respawn nhanh dần: `2500 − threat × 250 ms`, tối thiểu **1000 ms**.
- HUD hiển thị `RUN mm:ss · THREAT n` ở giữa phía trên.
- Threat reset mỗi run; đồng hồ tạm dừng khi chọn buff.

## Level-up & Stat points

- Hạ quái nhận XP; đủ XP sẽ lên level và nhận **+5 điểm thuộc tính**.
- Game **tạm dừng** và tự mở bảng Stats để cộng điểm; có thể đóng và cộng sau bằng `C`.
- Không còn màn hình chọn buff; **buff/synergy đã tắt**.
- Ở mốc LV 5/10/15, kỹ năng tương ứng của nhân vật tự mở
  và có toast `SKILL UNLOCKED`.

## Cấu hình dự án

| Hạng mục              | Giá trị                  |
| --------------------- | ------------------------ |
| Package manager       | npm                      |
| Game engine           | Phaser 4.2.1             |
| Ngôn ngữ              | TypeScript               |
| Build tool            | Vite                     |
| Độ phân giải thiết kế | 960 × 540 (16:9)         |
| Kích thước world      | 3840 × 2560 (120×80 tile)|
| Tile size             | 32 × 32                  |
| Nhân vật              | 48 × 48                  |
| Scale mode            | `FIT` + `CENTER_BOTH`    |
| Physics               | Arcade Physics           |
| Nhánh Git             | `main`                   |

## Cấu trúc thư mục

```text
pixel-world/
├── public/assets/village/       # Tileset/building/prop CC0 (kèm LICENSE)
├── src/
│   ├── combat/                  # Kiếm, súng, cung, lưỡi hái, trượng,
│   │                            # Excalibur, Dragon Bow, Void Staff
│   ├── config/
│   │   ├── assets.ts            # Key/path asset
│   │   ├── characters.ts        # 3 class: stats, palette, vũ khí, skill
│   │   ├── statConfig.ts        # 6 stat + 5 điểm/level
│   │   ├── weaponInfo.ts        # metadata/rarity vũ khí
│   │   ├── constants.ts
│   │   ├── combatConfig.ts
│   │   ├── palette.ts
│   │   └── gameConfig.ts
│   ├── entities/
│   │   ├── EnemyBase.ts / Enemy.ts / RangedEnemy.ts
│   │   ├── WeaponChest.ts
│   │   └── Player.ts            # 48×48, animation, dash, skill dash
│   ├── progression/
│   │   ├── CharacterProgress.ts # save level/stats/inventory theo nhân vật
│   │   ├── LevelSystem.ts       # load/save state
│   │   ├── StatSheet.ts         # allocation → CombatStats
│   │   ├── buffTypes.ts / buffCatalog.ts / BuffManager.ts  # (đang tắt)
│   │   └── progressionConfig.ts
│   ├── skills/skills.ts         # 9 skill definitions
│   ├── systems/InputController.ts
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── PreloadScene.ts      # Load village + sinh 3 nhân vật
│   │   ├── MainMenuScene.ts
│   │   ├── CharacterSelectScene.ts
│   │   ├── CharacterPanelScene.ts # Stats/Inventory (C/I)
│   │   ├── WorldScene.ts
│   │   └── LevelUpScene.ts        # (đang tắt)
│   ├── ui/Hud.ts                # Chỉ số, level, vũ khí, dash, 3 skill
│   ├── utils/
│   │   ├── placeholderPlayer.ts # Sheet 48×48 theo palette
│   │   ├── pixelTexture.ts
│   │   ├── effects.ts
│   │   └── projectile.ts
│   ├── world/town.ts
│   ├── main.ts
│   └── style.css
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Trạng thái

**Giai đoạn 3D — Stat points & Personal weapon inventory: hoàn thành.**

- Bỏ chọn buff; mỗi level +5 điểm thuộc tính, tự cộng qua bảng Stats (`C`).
- 6 stat persistent; HUD hiện điểm chưa dùng.
- Túi vũ khí persistent (`I`), chọn và trang bị vào 2 ô; vũ khí nhặt từ hòm vào túi.
- Buff/synergy tắt hoàn toàn (code giữ lại).
- 3 nhân vật, skill unlock 5/10/15, town, threat scaling, hòm/legendary vẫn hoạt động.

## Asset credits

- **Tileset/Buildings/Props:** *Free Medieval Village Tileset and Buildings* từ
  [freegamesprites.com](https://freegamesprites.com/en/packs/village), **CC0 1.0**
  (giữ LICENSE trong `public/assets/village/`).
- **Nhân vật 48×48:** placeholder sinh bằng code, recolor theo class.
- Ảnh tham chiếu người dùng gửi chỉ dùng định hướng phong cách, không đưa vào game.
