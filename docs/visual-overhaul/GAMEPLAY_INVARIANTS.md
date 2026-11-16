# GAMEPLAY INVARIANTS — bảo vệ gameplay trong Visual Overhaul

Nguồn: báo cáo `gameplay-designer` (đọc code bằng Grep/offset) được Lead đối chiếu một phần. Nhãn: **[ĐỌC]** đã đọc đúng dòng; **[SUY]** suy từ code + ngữ nghĩa Phaser, chưa chạy thử; **[ĐX]** đề xuất. Số dòng có thể dịch sau các thay đổi của C2b; khi lập brief phải Grep lại.

Phạm vi Designer đã đọc: `Player`, `EnemyBase`, `Enemy`, `RangedEnemy`, `BossEnemy`, `Minion`, `Npc`, `LootDrop`, `WeaponChest`, phần sheet/anim/hand offset của `placeholderPlayer`/`enemySprites`, `weaponSprite(.Config)`, `projectile`, `VFXManager/Pool`, `vfxConfig`, `atmosphereConfig`, phần combat của `combatConfig`, `swordComboConfig`, `town.ts` (obstacle), `bossArenaConfig`, một phần `WorldScene`, các `*Weapon.ts` (theo grep). **Chưa đọc:** từng skill trong `skills.ts`/`treeSkills.ts`/`necromancerSkills.ts`, cài đặt `vfx/atmosphere.ts`, `Player.takeDamage` đầy đủ, `CombatHUD`, `AimIndicator`, bên trong `ScytheWeapon`/`DualBladesWeapon`.

## 1. Bất biến

### 1.1 Kích thước, neo, hitbox

| # | Bất biến | Nơi code đọc | Hệ quả nếu vi phạm | Cách kiểm |
|---|---|---|---|---|
| I1 | Khung người chơi 48×48; sheet 6 cột × 20 hàng | `config/assets.ts:56`, `placeholderPlayer.ts:1055-1059` | Mọi offset tay/body/thanh máu lệch | `PLAYER_FRAME_SIZE` không đổi; sheet 288×960 |
| I2 | Body `setBodySize(24,28)` + `setOffset(12,16)`, origin 0.5, scale 1 | `Player.ts:181-184,54` | Chân art lệch khỏi mặt đất va chạm | Diff `Player.ts:183-184` rỗng; chân/bóng ≈ hàng 44/48 [SUY] |
| I3 | `visualLift` bù origin và `body.offset`, giả định frame cao `this.height` | `Player.ts:221-231` | Body trôi khi nhảy Đập Đất | Test skill Đập Đất nếu đổi cỡ frame |
| I4 | Scale người chơi nhân cả body: Cuồng Nộ ×1.3, Khổng Lồ | `Player.ts:734,1026,1344`; `combatConfig.ts:228` | Viền/aura ngoài khung đổi kích thước hitbox cảm nhận [SUY] | Chơi: khiên + Cuồng Nộ, tay khớp |
| I5 | Depth thực thể `y+20`, vũ khí `y+21` | `Player.ts:192`, `EnemyBase.ts:171`, `weaponSpriteConfig.ts:38`, `weaponSprite.ts:44-46` | Y-sort sai | Chân art dưới tâm khung +20 |
| I6 | Tên frame `<hướng>-<action>-<i>`; anim `<animPrefix>-<hướng>-<action>`; idle 4f@4, run 6f@11, attack 4f@13, hurt 1f@6, death 4f@7 | `placeholderPlayer.ts:29-40,1013-1021,1139`; `Player.ts:171,187,417,423-430`; `CharacterSelectScene.ts:144` | Phaser báo thiếu frame/anim | Test "art contract" |
| I7 | `getHeroHandOffset` tra tay theo **tên frame + thứ tự frame** (bob/swing/reach) | `placeholderPlayer.ts:1072-1130`; `Player.ts:396-408` | Vũ khí/khiên trôi khỏi tay | Test tay 4 hướng × idle/run/attack |
| I8 | Điểm bắn = **tâm người** + `muzzle` theo hướng ngắm (không theo tay) | `weaponSprite.ts:75-84`; `weaponSpriteConfig.ts:16-35` | Đạn lệch nòng/cung | Diff `weaponSpriteConfig.ts` rỗng |
| I9 | Sprite vũ khí: origin = grip + `art.pad`, scale 1, lật `scale(1,-1)`, xoay quanh grip; ≤ 60 px | `weaponSprite.ts:13-38`; `weaponArt.test.ts:38-44` | Vũ khí nhảy khỏi tay khi ngắm trái | `npm test` (một phần) + nhìn tay |
| I10 | Quái: frame 24 (brute, caster)/32 (boss), `setScale(2)`, body 20×20, origin 0.5, anim key `<prefix>-idle/walk/attack/death` (2/4/2/2) | `enemySprites.ts:22-48`, `EnemyBase.ts:139-157`, `Enemy.ts:30-31`, `RangedEnemy.ts:64-65`; `EnemyBase.ts:365,385,693` | Body lệch hình; `anims.exists` sai thì **im lặng không phát anim** | Test art contract |
| I11 | Boss: scale `min(4.4, 3.2+0.15(tier−1))`, body 20×20 (~64×64 thế giới [SUY]); frame 32 | `BossEnemy.ts:175-176` | Hitbox/vùng đẩy đổi | Diff hai dòng rỗng |
| I12 | **Đạn quái:** hitbox vuông 10×10 ở tâm độc lập texture; texture 44×20 xoay theo hướng bay; depth 2702; ADD; 6 texture theo hệ | `projectile.ts:54-66`, `vfxConfig.ts:91-100`, `vfxTextures.ts:345-349,392-426` | Đổi `hitbox` = đổi độ khó | `ENEMY_BULLET_VISUAL.hitbox == 10` |
| I13 | **Đạn/mũi tên/orb người chơi KHÔNG có body riêng**: hitbox = **kích thước texture** (bullet 8×4, arrow 16×4, orb 16×16, orb lớn ×`STAFF_BIG_ORB_SCALE`); AABB không xoay | `PreloadScene.ts:88,185,193,242-246`; `StaffWeapon.ts:340`; `BowWeapon.ts:385`; `combatConfig.ts:547` | **Vẽ lại đạn khác kích thước = đổi hitbox = đổi gameplay** (dễ bị bỏ sót nhất) | Giữ kích thước texture, hoặc `setSize` cố định = kích thước cũ trước khi đổi art |
| I14 | Công trình làng: origin (0.5,1), obstacle rộng `displayWidth×0.72`, cao 28 | `town.ts:246-270` | Đổi PNG rộng/hẹp = đổi vùng chặn, spawn | Giữ `displayWidth` hoặc đặt obstacle cố định |
| I15 | NPC: origin (0.5,1), scale 3, chữ tên/chức danh/marker tại `y−78/−62/−96`; bán kính tương tác 96 | `Npc.ts:47,57,69,78`; `economyConfig.ts:61` | Sprite cao hơn ~62 px đè chữ | Xem NPC 4 hướng |
| I16 | Hòm 24×21 scale 1; icon nổi tại `y−22`, thu 0.5 nếu cạnh dài > 36; tự mở trong 34 px, nhặt F trong 80 px | `WeaponChest.ts:7-10,121-123`; `combatConfig.ts:290-292` | Icon vượt hòm, chồng chữ | Chụp 12 vũ khí + 9 gear trong hòm |
| I17 | **Icon vũ khí dùng chung texture** với sprite cầm tay (`WEAPON_INFO[id].textureKey`) ở panel/shop/hòm | `CharacterPanelScene.ts:1495,1581,1808-1823`; `WeaponChest.ts:118-123` | Đổi art cầm tay = đổi luôn icon | Tách key riêng (D8) |
| I18 | LootDrop scale 2/2.2, nhặt trong 22 px, hết hạn 30 s | `LootDrop.ts:62`; `economyConfig.ts:21-23` | Không đổi hitbox | Đọc được vàng/ngọc |
| I19 | Thanh trên đầu dùng `player.displayHeight/2` (đỉnh khung); 51×6 và mana 51×2 | `PlayerBars.ts:6-12,53` | Thanh lơ lửng/đè art | Chụp 4 hướng + Cuồng Nộ |
| I20 | Thanh máu Boss tại `y − displayHeight/2 − 20`, rộng 108–144 | `BossEnemy.ts:692-693` | Như trên | Chụp Boss tier 1 và 6 |

### 1.2 Phụ thuộc theo sự kiện animation / frame

| # | Bất biến | Nơi đọc | Ghi chú |
|---|---|---|---|
| E1 | **Không logic gameplay nào gắn vào `animationcomplete`/frame callback** của người chơi/quái/Boss; chỉ `ANIMATION_COMPLETE` trả sprite VFX về pool | Grep: chỉ `VFXManager.ts:368-371` [ĐỌC] | Số frame tự do, ràng buộc là key tồn tại và thời lượng |
| E2 | `playAttackAnimation(durationMs)` giữ cờ `attackUntil`; attack `repeat 0` dừng ở frame cuối tới hết `attackUntil` | `EnemyBase.ts:360-397`; `enemySprites.ts:25` | Frame cuối attack là **pose giữ** suốt telegraph |
| E3 | Quái chết: 2 frame@7 (286 ms) nhưng object `destroy()` sau **340 ms**, body tắt ngay lúc chết | `EnemyBase.ts:686-713`; `enemySprites.ts:26` | Anim chết ≤ 340 ms |
| E4 | Anim attack người chơi bị khóa `ATTACK_ANIM_MS = 260` ms dù clip = 308 ms | `Player.ts:53,416`; `placeholderPlayer.ts:37` | Frame 3 chỉ hiện ~29 ms |
| E5 | Hurt: 1 frame khóa 200 ms; bất tử 900 ms, nhấp nháy alpha 0.4↔1 mỗi 80 ms | `Player.ts:55,1266,1372-1378`; `combatConfig.ts:29` | Nhấp nháy là tín hiệu bất tử — đừng thay bằng thứ khó thấy |
| E6 | Người chơi 4 hướng; quái không có hướng, dùng `setFlipX` | `placeholderPlayer.ts:1161-1169`; `Enemy.ts:76`, `RangedEnemy.ts:174`, `BossEnemy.ts:347` | Art quái chịu lật ngang |
| E7 | Nháy trắng khi trúng: tint FILL trắng 70 ms rồi **`clearTint()`** | `EnemyBase.ts:671-684`; `combatConfig.ts:50` | `clearTint` **xóa** tint Boss cuồng nộ (`BossEnemy.ts:359`) và băng (`EnemyBase.ts:610`) — lỗi hiện có; đừng dùng tint làm kênh trạng thái chính |

### 1.3 Màu làm kênh thông tin cho người chơi (logic không đọc màu; Grep `getPixel|snapshot|readPixels` rỗng [ĐỌC])

| Thông tin | Nguồn màu | Nơi |
|---|---|---|
| Hệ đạn/telegraph quái bắn xa | `ELEMENT_COLORS[element]`; vật lý `NEON.enemyBullet #d8402a` | `RangedEnemy.ts:122-142`; `vfxTextures.ts:345-426`; `palette.ts:7` |
| Nguyên tố của quái bắn xa | **Chỉ qua màu telegraph/đạn**, sprite không đổi | `RangedEnemy.ts:74-86` |
| Loại chiêu Boss | nova/quạt = `NEON.enemyBullet`; triệu hồi `0x9d6bff`; slam/thiên thạch = `NEON.boss` | `BossEnemy.ts:445-456,665-671` |
| Cuồng nộ Boss | tint `0xff7a7a`, aura `0xff3b3b`, thanh máu `0xff3b3b` | `BossEnemy.ts:359-366,704` |
| Trạng thái người chơi | Cuồng Nộ `0xff6a4a`, Kiệt Quệ `0x8a8f9c` | `Player.ts:51-52,735,748` |
| Đóng băng quái | tint `0x9fe8ff` | `EnemyBase.ts:610` |
| Đồng minh vs địch | Bone mage tint `0xb48bff`; **brute địch thân tím `#6b3f8a`** | `Minion.ts:53`; `enemySprites.ts:53` |
| Burn/poison/mark/curse trên quái | **không có hiệu ứng trên sprite quái** (chỉ số sát thương) | `EnemyBase.ts:284-294` |
| Xác chết (Triệu Hồn Sư) | `0x9b6bff` | `combatConfig.ts:61` |
| HP/giáp/mana | `0xe8434f` / `0xc9ccd6` / `0x3d8bfd` | `PlayerBars.ts:14-18` |

## 2. Bản đồ animation ↔ hitbox/timing

### 2.1 Người chơi và vũ khí (đòn chạy bằng timer/pha/`update`, không bằng frame anim thân) [ĐỌC]

| Vũ khí/skill | Thời điểm GÂY SÁT THƯƠNG | Quy tắc cho art |
|---|---|---|
| Kiếm đòn 1/2 | `hitDelayMs` 40 / 60 ms; vung 100 / 130 ms (`swordComboConfig.ts:31-44`) | Hit ở 40/60 ms; **gần như không có chỗ cho windup** |
| Kiếm đòn 3 (chuỗi) | 3 nhát tại 35, 145, 275 ms; tổng 350; nghỉ 520 ms (`:77-95`) | Nhát cuối nặng; recovery 520 ms |
| Song đao | mỗi nhát ≈ 40 ms (`HIT_FRACTION 0.45 × 90`); đòn kết 2 lượt cách 90 ms (`combatConfig.ts:497-501`; `DualBladesWeapon.ts:296`) | hit ≈ 40 ms |
| Búa thường | giơ 170 + vung 80 → chạm ≈ 250 ms; recover 230 (`combatConfig.ts:510-512,534`) | Anticipation = pha giơ 170; chạm ở 250; recovery ≤ 230 |
| Búa tích lực | READY sau 1000 ms; **thả mới đập**; vung 100; recover 300 (`:518,524-525,535`) | Chỉ báo READY không giả như đã đập |
| Excalibur | **tức thì lúc thả**; tích 500–2000 ms (`ExcaliburWeapon.ts:142-158,293`) | Pose tích tự do; hiệu ứng bắn đúng lúc thả |
| Liềm nhát 3 (đâm) | hit sau 80 ms (`ScytheWeapon.ts:308`; `combatConfig.ts:475`) | Mũi giáo chạm ≈ 80 ms |
| Liềm lốc xoáy | tick mỗi 200 ms trong 2000 ms (`:485,488`) | Hình phản ánh bán kính 98 |
| Khiên đập | tức thì khi bấm; tween 140 ms (`ShieldWeapon.ts:152-174`) | Hit = frame đầu |
| Cung/Staff/Blaster | khi đạn chạm (overlap); tạo đạn lúc thả/bấm | Điểm xuất hiện đạn = `muzzle` từ tâm người |
| Trượng sạc | nhanh = orb thường; giữ ≥ 1000 ms = orb lớn ×2.5 sát thương ×3 (`:545-547`) | Cỡ orb lớn = hitbox lớn (I13) |
| Khiên đỡ | giảm 60% (Boss 35%) trong cung ±70° theo **hướng ngắm** (`combatConfig.ts:122-126`; `ShieldWeapon.ts:111`) | Art cho thấy cung phía ngắm, không theo hướng thân |
| Thành Lũy / Dual Guard | tường chặn cung ±45°; Dual Guard ×0.75 (`combatConfig.ts:129,151`) | Hình khối tường không rộng/hẹp hơn `FORTRESS_RADIUS 66`, `THICKNESS 22` |
| Dash/Blink/Roll | lướt 140 ms bất tử 220; Blink tức thời bất tử 150; Xung Phong 240 ms (`:244,253-254,265`) | Bóng mờ chỉ để đọc |
| Thiên Thạch | ring 700 ms rồi sát thương (`skills.ts:1648-1655`) | Cửa sổ telegraph hard-code trong skill |

### 2.2 Quái và Boss [ĐỌC]

| Đối tượng | Gây sát thương khi nào | Quy tắc cho art |
|---|---|---|
| Quái cận chiến | **Bất cứ lúc nào body chạm người** (`WorldScene.ts:1189-1212`), cách ~32 px tâm-tâm [SUY]; bất tử người 900 ms. Anim "vồ" khi ≤ 64 px, mỗi 620 ms, 260 ms (`Enemy.ts:67-69`) | Anim attack **trang trí**; windup ≤ 200 ms |
| Quái bắn xa | Telegraph **480 ms** rồi bắn (`combatConfig.ts:193`; `RangedEnemy.ts:116-144`) | Pose gồng trong 480 ms, giữ đến lúc bắn |
| Boss slam | **Tức thời tại `castEndAt` = 750 ms**; vùng chọn theo vị trí người **lúc bắt đầu cast**; trúng nếu `distance ≤ radius` (`BossEnemy.ts:411-414`; `WorldScene.ts:1501-1531`) | Vòng báo trước **là** hitbox: đúng `BOSS_SLAM_RADIUS 160 + 10×(tier−1)` |
| Boss thiên thạch | 950 ms; 4–9 vùng bán kính 78 (`combatConfig.ts:349-353`) | Mỗi vùng thấy riêng, không che nhau |
| Boss nova | 800 ms; 15–24 viên; vòng 2 sau 380 ms nếu tier ≥ 4/cuồng nộ (`:340-343`; `BossEnemy.ts:497-499,626-630`) | Đường báo trước `Graphics` dài 520 px α0.2→0.8 (`:556`), **không phụ thuộc pool** |
| Boss quạt / triệu hồi | 600 ms / 700 ms rồi sinh 2–4 quái (`:356-360`) | |
| Quái chết | Body tắt ngay; anim 286 ms; destroy 340 ms | ≤ 340 ms |

### 2.3 Quy tắc đồng bộ [ĐX]

1. Anticipation nằm **trong** cửa sổ, không dài hơn nó: Boss ≤ telegraph chiêu (600–950 ms); quái bắn xa ≤ 480; cận chiến ≤ 200; đòn người chơi ≤ pha giơ/hitDelay trong config.
2. Tiếp xúc hình ảnh trong [−33 ms, +50 ms] quanh mốc logic.
3. Recovery hình ảnh ≤ thời gian khóa logic (búa 230/300 ms, chuỗi kiếm 520 ms).
4. Telegraph còn nhìn thấy tại thời điểm resolve.
5. Frame cuối attack là pose giữ (E2).

### 2.4 Chỗ anim hiện tại đã lệch timing [ĐỌC]

- Kiếm đòn 1 hit ở 40 ms nhưng tay đạt reach tối đa ở frame 2 (~154–231 ms): hình thân đi sau logic; cú vung do sprite vũ khí/Graphics đảm nhận.
- Anim attack người chơi 308 ms bị cắt ở 260 ms (E4).
- Ring telegraph quái bắn xa: scale 0.2→full và alpha 0.9→0 cùng easing Quad.easeOut trong 480 ms (`VFXManager.ts:374-396`); tại 240 ms alpha ≈ 0.22, **lúc bắn alpha = 0** (tính tay) — tín hiệu mạnh nằm nửa đầu.
- Anim chết quái 2 frame trong khi object sống 340 ms: không chỗ cho chuỗi chết dài.

## 3. Readability audit

### 3.1 Thứ tự lớp hiện tại [ĐỌC]

| Depth | Gì | Nguồn |
|---|---|---|
| 0–5 | Nền, vết nứt đất (4), bụi (5), Arc telegraph Boss (4) | `VFXManager.ts:299,459,488`; `BossEnemy.ts:669` |
| 9 | Đạn/mũi tên/orb người chơi | `StaffWeapon.ts:339`, `BowWeapon.ts:384`, `BlasterWeapon.ts:129` |
| 12–13 | Vòng đập khiên, một số Graphics | `ShieldWeapon.ts:218`, `StaffWeapon.ts:182-189` |
| `y+20`/`y+21`/`y+22..23` | Người, quái / vũ khí / vệt chém, chùm Excalibur, vòng sạc | `Player.ts:192`, `weaponSprite.ts:44`, `ExcaliburWeapon.ts:319,342` |
| 2700 / 2701 / 2702 / 2705 | Ambient / tối+sương / **đạn quái + ánh sáng điểm** / vignette | `atmosphereConfig.ts:66-73` |
| 3000 / 3010 | VFX thường / VFX trúng đòn + hạt | `vfxConfig.ts:14-21` |
| 4900 / 5000+ | `PlayerBars` / HUD | `PlayerBars.ts:31`, `Hud.ts` |
| 9500 | Số sát thương | `damageNumberConfig.ts:68` |

Phát hiện: (1) **đạn quái (2702) nằm dưới mọi VFX (3000/3010)**; (2) đạn người chơi (9) và chùm Excalibur (`y+22`) nằm dưới ambient/sương — ban đêm bị tối ngoài tầm nhìn 238 px; (3) thanh máu/aura Boss (`y+25`, `y+19`) nằm dưới lớp tối.

### 3.2 Thông tin chiến đấu và rủi ro

| Thông tin | Kênh | Rủi ro | Ưu tiên |
|---|---|---|---|
| Vị trí người chơi | sprite + thanh | Art tối + nền tối | Cao |
| Đạn quái | texture 44×20, ADD, 2702 | Bị VFX 3000 che; ADD trên nền sáng ban ngày; Fire gần vật lý; Ice cùng hue đạn cyan người chơi (`COLOR_PALETTE.md:126`) | **Cao nhất sau người chơi** |
| Vòng báo trước quái bắn xa | ring+glow **pooled**, 480 ms, tắt dần | Trần 80 sprite có thể bỏ; tắt trước lúc bắn | Cao |
| Vùng sát thương Boss | Arc (depth 4, không pool) + ring (pool) | Dưới ambient 0.5 (~43% tối) [SUY] | Cao |
| HP/giáp/EN | thanh 51×6, mana 51×2 | Mana 2 px ở FIT 0.667 ≈ 1.3 CSS px [tính tay] | Cao (mobile) |
| HP Boss | thanh trên đầu | Dưới lớp tối | Cao |
| Quái thường | **không có thanh máu**, chỉ số + nháy trắng | Art tối khó biết trúng đòn | Trung bình |
| Cổng/hòm/loot/NPC | marker/glow/ADD | Cần nổi hơn nền | Trung bình |
| Vùng an toàn | viền đồng α0.28 (`atmosphereConfig.ts:154-161`) | Rất nhạt | Thấp–TB |

### 3.3 Ban đêm, sương, Arena, mobile

- Tầm nhìn đêm 238 px (`atmosphereConfig.ts:46`); quái bắn xa đứng 240–400 px (`PREFERRED 320 ± 80`, `RangedEnemy.ts:160-165`; `combatConfig.ts:189`), bắn từ tối đa 520 px (`:191`) → **sprite thường nằm ngoài vùng sáng**; telegraph (3000) và đạn (2702) vẫn sáng. Đã tính từ số liệu, chưa quan sát.
- Đạn 340 px/s (`combatConfig.ts:204`) vượt vùng sáng trong ~0.7 s; sống 3000 ms.
- **Boss chỉ ở Arena**, ambient cố định `0x241e34` α0.5, sương α0.1 (`bossArenaConfig.ts:110-121`): MULTIPLY ≈ ×0.57 (tính tay) → vòng Arc đỏ `0xc8243a` depth 4 tối rõ. Cần thử bằng mắt.
- Trần VFX `VFX_MAX_SPRITES = 80`; `VFXPool.acquire` trả `null` khi đầy (`VFXPool.ts:19-25`). Telegraph quái bắn xa và vòng Boss nova/quạt/triệu hồi dùng ring/glow pooled; đường báo trước nova/quạt và Arc slam là Graphics không pool.
- Mobile: FIT `s = min(W/960, H/540)` (`gameConfig.ts:37-41`): 1920×1080 → 2.0; 844×390 → 0.722; 640×360 → 0.667. Ở 0.667: đạn 44×20 → ~29×13 CSS px, hitbox 10 → ~6.7, thân 24×28 → 16×19. Cảm ứng hạt ×0.6, sương 1 lớp, số sát thương tối đa 20. **Chưa đo** vùng che của joystick/nút (`MIN_TOUCH_CSS_PX 44`, `controlsConfig.ts:11`).
- Nhiều quái: trần sống `MAX_ALIVE_CAP 18` (`combatConfig.ts:379`), 1/3 bắn xa (`WorldScene.ts:1266`) → ~6 telegraph đồng thời × 2 sprite pooled; cộng búa tích lực (~18 sprite) gần trần 80 [SUY].

### 3.4 Tiêu chí kiểm được (ĐX, kèm số hiện tại)

| # | Tiêu chí | Tham chiếu |
|---|---|---|
| R1 | Kích thước nhìn thấy đạn quái ≥ 2× cạnh hitbox mỗi chiều | hiện 44×20 so hitbox 10 |
| R2 | Lõi **hoặc** viền đạn quái tương phản ≥ 3:1 với nền ở 5 mẫu (cỏ đã tint, đất, đá lát, nước, sàn Arena) × ngày/đêm (trong/ngoài tầm nhìn)/Arena; tính trên màu sau ADD/MULTIPLY | |
| R3 | Đạn nhìn thấy cả khi trùng glow ADD của VFX người chơi (depth ≥ mọi VFX không-telegraph, hoặc VFX bị giới hạn alpha) | |
| R4 | Telegraph còn nhìn thấy lúc resolve: alpha ≥ 0.5 trong 100 ms cuối; nét ≥ 3 px thiết kế | hiện nét 3 px α0.95 (Boss); ring quái bắn xa α→0 |
| R5 | Telegraph không phụ thuộc pool VFX | |
| R6 | 6 hệ đạn phân biệt cả khi bỏ hue (độ sáng lõi khác nhau ≥ 15%) hoặc có thêm hình/họa tiết | |
| R7 | Quái địch và minion không cùng hue chủ đạo | brute `#6b3f8a` vs Bone mage `0xb48bff` |
| R8 | Sprite người chơi tương phản ≥ 3:1 với nền ở ngày/đêm/Arena | |
| R9 | FIT 640×360: nét báo hiệu ≥ 3 px thiết kế; mana ≥ 3 px | hiện mana 2 px |
| R10 | 18 quái + 1 búa tích lực: `getActiveCount()` của pool < 80 (đo `?perf`) | |

## 4. Quái tinh anh và phân cấp

Trong code **không có quái tinh anh** (Grep). Biến thể chỉ khác số liệu, mọi quái dùng cùng sprite: threat tier 0–6 (+1/60 s; máu +35%/tier, tốc +5%/tier trần ×1.3, `combatConfig.ts:373-377,88-94`; `WorldScene.ts:1302-1310`); 1/3 là quái bắn xa (`WorldScene.ts:1266`); bắn xa tier ≥ 2 bắn 3 viên, 50% nguyên tố (`combatConfig.ts:197-199`; `damageTypeConfig.ts:95-108`; `RangedEnemy.ts:74-86`); Boss tier 1–6 scale 3.2→4.4, chiêu theo tier (nova ≥ 2, thiên thạch ≥ 3 hoặc cuồng nộ, triệu hồi ≥ 2), cuồng nộ < 50% máu (`BossEnemy.ts:175,370-390`; `combatConfig.ts:363-366`).

Phân cấp **thuần hình ảnh**: chỉ dựa biến đã có; cần thuộc tính chỉ-đọc (hiện `private`); đừng dùng `setTint` (E7) — dùng biến thể texture hoặc lớp phủ con; 3 mức tier (0–1 / 2–3 / 4–6); quái bắn xa nguyên tố có **dấu hệ trên sprite** (cải thiện độ đọc). Quái tinh anh thật = đổi gameplay → Cổng 1 riêng.

## 5. Checklist "không đổi gameplay" cho QA sau mỗi gói

**A. Lệnh (Bash allowlist: git chỉ-đọc, `npm test`, `npm run build`, `npx tsc --noEmit`):**
1. `git diff --name-status HEAD` đối chiếu ĐƯỢC SỬA/ĐƯỢC TẠO (WORKFLOW §6a; với baseline ngoại lệ thì `git hash-object`).
2. **Phải RỖNG:** `git diff HEAD -- src/config/combatConfig.ts src/config/swordComboConfig.ts src/config/weaponSpriteConfig.ts src/config/economyConfig.ts src/config/gearConfig.ts src/config/statConfig.ts src/config/skillLevelConfig.ts src/config/skillNodeMap.ts src/config/treeSkillsConfig.ts src/config/necromancerConfig.ts src/config/scaleConfig.ts src/config/progressionConfig.ts src/config/gemConfig.ts src/config/characters.ts`. Với `damageTypeConfig.ts`, `vfxConfig.ts`, `bossArenaConfig.ts`, `atmosphereConfig.ts`, `damageNumberConfig.ts`, `palette.ts`: chỉ được đổi dòng màu/hiển thị (QA đọc diff; không đổi `hitbox`, resist, `*_MS`, `*_RADIUS`, `*_DAMAGE`).
3. Từ khóa soi trong diff `src/entities`, `src/combat`, `src/skills`, `src/scenes`, `src/world`: `setBodySize|setOffset|setSize|setCircle|setScale\(|PLAYER_FRAME_SIZE|delayedCall|_MS|takeDamage|setDepth|muzzle|grip|forward|hitbox|isHitBlockedByDomain` — mỗi dòng đổi phải có lý do hình ảnh.
4. `npm run build`, `npx tsc --noEmit`, `npm test`.

**B. `npm test` bao phủ:** logic thuần (combo kiếm/song đao/búa, `resolveDamage`, `elementEffects`, `gearResist`, `fortressWall`, landing, `bossArenaRules`, save/tiến trình, `PlayerState`, layout số sát thương, hội thoại) và `weaponArt.test.ts` (cấu trúc art vũ khí).

**C. KHÔNG có test (cần Gói 0 hoặc kiểm tay):** hitbox/anchor/offset thực thể, tên frame/anim key, hand offset, depth/y-sort, VFX/telegraph/đạn, đêm/Arena, thanh trên đầu, chữ NPC/hòm, pool VFX, mobile.

**D. Chơi thật rút gọn (PC + cảm ứng nếu có):** (1) mỗi lớp 4 hướng, vũ khí khớp tay idle/run/attack; (2) kiếm combo 40/60/275 ms, búa tap vs giữ ≥ 1 s; (3) khiên đỡ đạn phía ngắm, không đỡ từ sau; (4) quái cận chiến chạm người, sát thương đúng lúc va chạm; (5) quái bắn xa: telegraph thấy cả ngày/đêm, đạn né được; (6) `?time=night`: thấy đạn ngoài tầm nhìn, thấy telegraph; (7) Boss ở Arena: slam, nova, quạt, thiên thạch, triệu hồi, cuồng nộ — vòng báo trước đúng vùng; (8) làng: công trình va chạm khớp hình, NPC tương tác trong 96 px; (9) hòm: icon 12 vũ khí + 9 gear không đè hòm; (10) Cuồng Nộ ×1.3, Đập Đất, Blink, Lướt; (11) đổi mũ/giáp/giày: ngoại hình đổi, vũ khí vẫn ở tay; (12) FIT 640×360: đọc được đạn, telegraph, thanh HP.

## 6. Cấu trúc gói theo rủi ro gameplay (Gameplay Designer đề xuất)

P0 đóng băng bất biến → P1 tint/palette → P2 tile/prop/công trình → P3 UI/icon → P4 quái thường → P5 nhân vật + vũ khí → P6 VFX → P7 Boss + Arena. Chi tiết và lý do rủi ro: FEATURE_SPEC §3.

## 7. Rủi ro & câu hỏi (đã chuyển vào README mục "Quyết định")

Kích thước/tỉ lệ nhân vật (D2); mật độ pixel (D1); Grim Dark vs độ đọc (đạn/telegraph là ngoại lệ "sáng rực", đã duyệt ở COLOR_PALETTE §3); gear vẽ lại trên người (D7); icon vũ khí dùng chung (D8); quái tinh anh (D5); hook thử Boss (D11); chính sách ánh sáng (D9); nâng depth đạn/telegraph (DP-6). Việc nhìn thấy: lỗi E7 (`clearTint`); số liệu skill hard-code trong `skills.ts` (Thiên Thạch 700 ms, 150 px) nên tách ra `src/config/` trước khi sửa VFX; bố cục `CombatHUD` màn nhỏ và vùng che joystick chưa kiểm; thời điểm sát thương của từng skill chưa đọc — cần bảng skill (id → mốc ms) bằng Grep `delayedCall` (42 chỗ trong `skills/`) trước gói VFX.
