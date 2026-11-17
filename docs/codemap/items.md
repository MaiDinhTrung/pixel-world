# Codemap — Inventory / Equipment / Gems / Economy / Loot

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/config/{gearConfig,gearLook,gemConfig,weaponInfo,economyConfig}.ts src/systems/{PlayerState,VillageService}.ts src/entities/{WeaponChest,LootDrop}.ts src/scenes/VillageShopScene.ts src/utils/chestArt.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/config/gearConfig.ts src/config/gemConfig.ts src/config/economyConfig.ts src/systems/VillageService.ts src/entities/WeaponChest.ts`

**Vai trò:** vũ khí/trang bị trong túi và ô trang bị, cấp đồ, ngọc + lỗ ngọc, vàng, cửa hàng và thợ rèn, hòm và đồ rơi.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Luật kho đồ (thuần) | Túi, ô trang bị, trang bị/tháo/bỏ, cấp đồ, tiền | `systems/PlayerState.ts` + test | `config/*` |
| Vũ khí (dữ liệu) | `WEAPON_INFO`, `WEAPON_IDS`, độ hiếm + nhãn | `config/weaponInfo.ts` | — |
| Trang bị | Slot, độ hiếm, bonus, scale theo cấp (`getScaledGearBonuses`, `MAX_GEAR_LEVEL`), kháng cố định | `config/gearConfig.ts` (+ `gearResist.test.ts`) | — |
| Ngoại hình đồ | Mũ/giáp/giày trên người | `config/gearLook.ts` (`resolveGearLook`) | — |
| Ngọc | 7 loại, `MAX_SOCKETS`, `computeGemBonuses` | `config/gemConfig.ts` | — |
| Kinh tế | Tỉ lệ rơi vàng/ngọc, giá mua/bán, chi phí nâng cấp/đục lỗ, `VILLAGE_ZONE`, `VILLAGE_NPCS` | `config/economyConfig.ts` | — |
| Dịch vụ làng | Mua/bán/đổi ngọc; nâng cấp, đục lỗ, khảm/tháo | `systems/VillageService.ts` (`VillageHost`) | `PlayerState` |
| UI cửa hàng | Overlay Thương nhân / Thợ rèn | `scenes/VillageShopScene.ts` | `WorldScene.getVillage()` |
| Hòm / đồ rơi | Hòm vũ khí/trang bị; vàng/ngọc rơi (hút về, hết hạn 30 s) | `entities/WeaponChest.ts`, `entities/LootDrop.ts`, `utils/chestArt.ts` | `config/combatConfig` (`CHEST_*`, `LEGENDARY_*`) |

## L3 — Nối vào `WorldScene`
`equipWeaponFromInventory` (chặn vũ khí ngoài `allowedWeapons`), `unequipWeapon`, `equipGearFromInventory`, `unequipGear`, `discardWeapon/Gear`, `getInventoryPanelState`, `getEquipmentPanelState`, `getGemBonuses`, `applyPlayerStatistics` (gear + gem), `reflectThorns`, `createVillageHost`, `openVillageShop`; loot: `dropLoot`, `dropBossLoot`, `spawnDrop`, `collectDrop`, `updateLootDrops`; hòm: `maybeDropWeaponChest`, `spawnWeaponChest`, `openChest`, `pickUpChest`, `removeChest`. UI panel: `CharacterPanelScene.renderInventory/renderEquipment/renderEquipmentDetails`.

## Ghi chú khi thay đổi
- Đồ trong save là item instance có uid (`codemap/save.md`); đổi cấu trúc ⇒ rủi ro cao.
- `GOLD_DROP_CHANCE`, `GEM_DROP_CHANCE` đang cao cho demo.
- Thiết kế: `docs/DATA_ARCHITECTURE.md` (§3 item instance), DECISIONS "Thiết kế Làng Khởi Nguyên".
