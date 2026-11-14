# Mở rộng lớp: Necromancer + Druid (2026-11-13)

Trạng thái: thiết kế đã chốt; số liệu là điểm khởi đầu để playtest, chưa kiểm chứng.
Quyết định: 6 skill cố định mỗi lớp (chưa nối cây kỹ năng); Necromancer trước, Druid sau; mở rộng `EnemyBase` bằng trạng thái chung; trần tạm 3 bộ xương, 8 xác (chỉnh trong `src/config/`, đo trên máy thật).

## Necromancer (`necromancer`), tài nguyên: EN + Xác
| ID | Tên | Loại | CD / EN | Ghi chú |
|---|---|---|---|---|
| nec_bone_spike | Gai Xương | Chủ động, target | 2.5 s / 8 | 130%, +50% nếu Héo Mòn |
| nec_raise_skeleton | Dậy Bộ Xương | Chủ động | 4 s / 12 | tiêu 1 xác, 40 s, tối đa 3 |
| nec_bone_cage | Nhà Tù Xương | Chủ động, point | 11 s / 24 | R90 slow 80% 3 s, boss kháng |
| nec_corpse_burst | Nổ Xác | Chủ động, point | 7 s / 20 | R80/xác, tối đa 4 xác |
| nec_wither | Héo Mòn | Chủ động | 9 s / 18 | R100 6 s, nhận +20% sát thương (`applyVulnerable curse`) |
| nec_soul_siphon | Hút Hồn | Bị động | — | hạ gục: +2 EN, 15% thêm xác |
| nec_dread_pact | Giao Ước Bóng | Bị động | — | +4%/bộ xương, tối đa 5 |
| nec_bone_mage | Pháp Sư Xương | Chủ động | 10 s / 30 | tiêu 2 xác, 25 s, tối đa 2 |
| nec_legion | Quân Đoàn Bất Tử | Tối thượng | 75 s / 60 | 6 bộ xương 12 s |

## Druid (`druid`), tài nguyên: EN + Hình thái
| ID | Tên | Loại | CD / EN | Ghi chú |
|---|---|---|---|---|
| dru_thorn_lash | Roi Gai | Chủ động, directional | 3 s / 8 | nón 70° 140 px, slow 25% |
| dru_wolf_form | Hóa Sói | Chủ động | 14 s / 25 | 12 s, tốc +35%, khóa skill tầm xa |
| dru_bear_form | Hóa Gấu | Chủ động | 14 s / 30 | 12 s, −25% sát thương nhận, tốc −15% |
| dru_whirlwind_gale | Lốc Xoáy | Chủ động | 12 s / 28 | R110 3 s, hút quái nhỏ |
| dru_spirit_wolf | Linh Lang | Chủ động | 15 s / 22 | 30 s, tối đa 1 |
| dru_verdant_skin | Da Cây | Bị động | — | +10% HP |
| dru_pack_bond | Giao Ước Bầy | Bị động | — | +5% tốc đánh/linh thú |
| dru_regrowth | Hồi Sinh Cây | Chủ động | 20 s / 35 | +2 HP, +1 HP sau 4 s |
| dru_primal_avatar | Hóa Thân Nguyên Thủy | Tối thượng | 80 s / 50 | 10 s, +25% sát thương |

## Lộ trình
| GĐ | Nội dung | Nghiệm thu | Trạng thái |
|---|---|---|---|
| 1 | Sửa `PROJECT_MAP.md` | Bản đồ khớp mã | xong |
| 2 | Trạng thái burn/poison/mark/curse trong `EnemyBase` | build qua; boss giảm 50% thời gian | xong code, chưa playtest |
| 3 | Xác chết có trần, hết hạn 8 s | không tụt FPS | xong code, chưa playtest |
| 4 | Necromancer 6 skill + bộ xương | chọn lớp, save/load đúng | xong code, chưa playtest |
| 5 | Druid không hóa thú | linh lang theo và đánh | chưa |
| 6 | Hóa Sói/Gấu + spritesheet | đổi dáng không lỗi anim | chưa |
| 7 | Cân bằng 5 lớp, đo FPS mobile | bảng TTK, sát thương nhận | chưa |
| 8 | Nối cây kỹ năng | cây hiển thị, save tương thích | chưa |

Chi tiết cơ chế, hiệu ứng, nâng cấp và rủi ro kiến trúc: xem báo cáo thiết kế gốc (không lưu trong repo); các điểm kỹ thuật chính: thêm lớp cần sửa `CharacterId`/`isCharacterId`, `TreeClassId`, `HeroStyle` (`placeholderPlayer.ts`); đồng minh cần `entities/Minion.ts` có pool, không va chạm Player; hóa thú đổi texture/anim của Player.
