# Thiết kế lại Class Identity & Kỹ năng — Pixel World

> **Trạng thái: ĐÃ DUYỆT (2026-11-12) — giai đoạn 1–6 đã triển khai** (xem mục 9). Giai đoạn 7–8 (nối cây kỹ năng, Đoản Đao) chưa làm. Mọi con số "đề xuất" là điểm khởi đầu để playtest, không phải giá trị đã kiểm chứng.
> Ngày: 2026-11-12. Nguồn khảo sát: `config/characters.ts`, `config/combatConfig.ts`, `entities/Player.ts`, `skills/skills.ts`, `skills/tree/*`, `config/controlsConfig.ts`, `ui/combat/CombatHUD.ts`, `scenes/WorldScene.ts` (đoạn dash).

---

## 1. Hiện trạng (đã kiểm tra trong code)

### 1.1 Ba lớp hiện tại
| | Đấu sĩ (`knight`) | Sát thủ (`ranger`) | Pháp sư (`mage`) |
|---|---|---|---|
| HP / Giáp / EN | 12 / 10 / 70 | 5 / 3 / 90 | 6 / 2 / 160 |
| Tốc độ ×, Sát thương × | 0.92, **1.2** | 1.18, 0.85 | 0.98, 1.0 |
| Vũ khí | Kiếm + Khiên | Súng NL + Cung | Trượng + Đũa |
| Kỹ năng (mở Lv 1/3/5/7/9/11) | Húc khiên, Thủ thế, Đập đất, Ý chí sắt, Chiến hống, Khổng lồ | Loạt bóng tối, **Lăn né**, Tàng hình, **Săn máu**, Tia xuyên, Vũ điệu bóng tối | Bùng nổ phép, **Dịch chuyển**, Sóng băng, Thiên thạch, Khoá thời gian, Khe nứt |

### 1.2 Cơ động hiện tại — nguồn gốc trùng lặp
1. **Một Dash chung cho cả 3 lớp**: 220 px / 170 ms (≈1294 px/s), hồi 1.8 s, **bất tử 260 ms**, có nút "LƯỚT" riêng trên Mobile HUD (`DASH_*` trong `combatConfig.ts`, `Player.tryDash`). Người chơi được ~14% thời gian bất tử miễn phí, bất kể lớp.
2. Quái và Player chỉ `overlap` (không `collider`) nên **mọi dash đều xuyên quái**; bất tử khiến dash là "thẻ miễn nhiễm" gần như không rủi ro.
3. Lớp nào cũng có thêm cơ động riêng cộng dồn lên Dash chung:
   - Pháp sư: Dịch chuyển 220 px / 6 s, mở ở **Lv 3** và nằm trong loadout mặc định.
   - Sát thủ: Lăn né 240 px (bất tử, +35% tốc), Săn máu 220 px / 14 s, Vũ điệu bóng tối (3 lần tốc biến), Tàng hình.
   - Đấu sĩ: chỉ có Dash chung → **Đấu sĩ (12 HP + 10 giáp, ×1.2 sát thương) vừa trâu vừa lướt được**, đó là lý do hero thấy "quá mạnh".
4. Hệ quả: Pháp sư (máu thấp) có thể "Dash → Blink → Dash" thoát mọi thứ, nên vai trò "sống nhờ định vị" không có ý nghĩa; Sát thủ không còn gì độc đáo so với hai lớp kia.

### 1.3 Lệch giữa code đang chạy và cây kỹ năng
- `skills/skills.ts` (mỗi lớp 6 skill, tổng 18 gán trong `characters.ts`; `PROJECT_MAP.md` ghi "9 skill" là đã cũ) dùng **id kế thừa không khớp tên** để giữ save: `poison_trap` = Tàng hình, `arrow_rain` = Săn máu, `hunters_mark` = Tia xuyên, `whirlwind` = Thủ thế, `blade_storm` = Khổng lồ, `arcane_shield` = Khoá thời gian. **Phải giữ id** (hoặc có migration save).
- `skills/tree/*` đã có **3 nhánh × 5 node cho mỗi lớp** (T1: 1 chủ động + 1 bị động, T2: 1+1, T3: 1 tối thượng), có prerequisite, synergy, cooldown/EN, milestone Lv3/Lv5. Đã chứa phần lớn ý tưởng mới (xem §3). **Chưa nối vào gameplay/UI** (chỉ `normalizeSkillLevels` được `CharacterProgress` dùng).
- Trong cây, Đấu sĩ `shield_bash` đã là cú **lao 90 px**; Sát thủ `evasive_roll` 140 px/4 s; Pháp sư `blink` là **tier 2** (cần Lv nhân vật 8 + 5 điểm nhánh). Tức là cây đã nghiêng về hướng bạn muốn, còn bản live thì chưa.

---

## 2. Cơ chế cơ động mới (thay cho Dash chung)

### 2.1 Nguyên tắc
- **Bỏ Dash chung mặc định.** Cơ động trở thành *kỹ năng của lớp*, chiếm một trong ba ô kỹ năng → có chi phí cơ hội.
- Mỗi lớp một "ngôn ngữ" riêng: Đấu sĩ = *húc vào* (mạnh, chậm, không né), Pháp sư = *dịch vị trí* (tùy chọn, không né đòn), Sát thủ = *lướt linh hoạt* (nhiều lượt, ngắn, có né).

### 2.2 Bảng thông số đề xuất

| Tiêu chí | Đấu sĩ — **Xung Phong Khiên** (nâng cấp `shield_bash`) | Pháp sư — **Dịch Chuyển** (`blink`, *tùy chọn*) | Sát thủ — **Lướt Bóng** (nâng cấp `evasive_roll`) |
|---|---|---|---|
| Loại | Lao có hướng, kết thúc bằng đập khiên | Dịch chuyển tức thời | Lướt nhanh, tích lượt |
| Khoảng cách | 130 px (dừng sớm nếu chạm quái) | 200 px, +20/cấp (tối đa 280); chọn điểm bằng kéo-để-ngắm | 170 px mỗi lượt |
| Tốc độ / thời lượng | ~720 px/s / 180 ms | Tức thời (ẩn 80 ms rồi hiện) | ~1210 px/s / 140 ms |
| Hồi chiêu | **9 s** (live hiện 5 s) | 7 s | **Tích lượt**: 2 lượt (3 ở Lv5), mỗi lượt hồi **4.5 s**; khoảng nghỉ 0.4 s giữa hai lần |
| Chi phí EN | 15 | 20 | 0 (giới hạn bằng số lượt) |
| Miễn sát thương | **Không**; thay bằng *giáp cứng*: không bị đẩy lùi/gián đoạn, -30% sát thương nhận trong lúc lao | 0.15 s | **0.22 s** (live hiện 0.26 s mỗi 1.8 s) |
| Xuyên quái | Không: dừng ở mục tiêu đầu tiên; đẩy quái nhỏ, **dừng hẳn** trước elite/boss | Có (không va chạm), không đáp vào vật cản/ngoài map | Có với quái thường; **không xuyên vật cản** |
| Gây sát thương | Có: nón 150°, 110% sát thương vũ khí + choáng 0.6 s (boss ×0.25) | Không ở Lv1–2; Lv3 để lại *dư ảnh* nổ sau 1.5 s (80%) | Không ở Lv1; Lv3 *Cắt Ngang*: 45% sát thương (có thể chí mạng) cho mỗi quái bị xuyên, mỗi quái 1 lần |
| Điều kiện | Cần hướng ngắm/di chuyển; không dùng khi bị choáng/đóng băng | Mở khóa ở Lv 9 (live) / tier 2 (cây); không dùng khi bị đóng băng | Không dùng khi bị choáng/đóng băng; **không phá tàng hình** |
| Hồi lượt/giảm CD | Hạ gục ≥1 quái bằng cú húc: -2 s CD | Dư ảnh nổ trúng ≥2 quái: -1 s CD | Lv5: hạ gục trong 1 s sau lướt hoàn 1 lượt |
| Điểm yếu | Dài CD, dễ trúng đạn khi lao, nhận thêm khi áp sát boss có nova | Không né được đòn đã phát; máu thấp | Máu thấp, hết lượt là trần trụi; không có chống chịu |

**Tại sao các con số này:**
- Đấu sĩ: không bất tử vì đã có giáp dày; CD 9 s buộc phải chọn *khi nào* áp sát thay vì dùng để chạy trốn.
- Sát thủ: dùng liên tục chỉ được 1 lượt/4.5 s → bất tử trung bình ≈ 0.22/4.5 ≈ **0.05 s/s**, thấp hơn nhiều so với Dash cũ (0.26/1.8 ≈ 0.14 s/s). Nhưng được dồn 2–3 lượt liền (tối đa 0.44–0.66 s bất tử) để xử lý một tình huống, nên vẫn là lớp cơ động nhất.
- Pháp sư: không còn Dash miễn phí; Dịch chuyển 7 s + 20 EN là một "chi phí" thật.

### 2.3 Rủi ro cần xử lý khi triển khai
- Dash tích lượt cần hiển thị số lượt trên nút (badge) — `ActionButton` chưa hỗ trợ.
- "Giáp cứng" của Đấu sĩ cần cờ mới trong `Player` (hiện chỉ có `invulnerableUntil`).
- Đạn địch của boss mới (nova/quạt đạn, vừa thêm) *đều làm sát thủ lướt qua kẽ hở* — kiểm tra khoảng hở vòng nova (12–24 viên) cho phép lách được với 170 px / 0.22 s bất tử.

---

## 3. Ba nhánh kỹ năng cho mỗi lớp

Cách làm: **dùng lại 45 node của `skillTreeData.ts`** (không viết lại từ đầu). Ký hiệu: ★ = đề xuất đổi so với dữ liệu cây hiện có; ✚ = node mới; CD/EN lấy từ cây. `Chủ`/`Bị` = chủ động/bị động.

### 3.1 Đấu sĩ — cận chiến, công thủ cân bằng, chống chịu cao
Bản sắc: *cắm chân, bị đánh nhiều nhưng không ngã; khống chế bằng choáng/sợ/kéo.*

| Nhánh | Tier | Kỹ năng | Loại | Tác dụng chính | Vai trò |
|---|---|---|---|---|---|
| **Thành Lũy** (phòng thủ · phản đòn) | 1 | ★ Xung Phong Khiên (`shield_bash`) | Chủ | Lao 130 px, giáp cứng, đập nón + choáng 0.6 s; CD 9 s, 15 EN | Áp sát + khống chế mở giao tranh |
| | 1 | Ý Chí Sắt | Bị | +1 giáp tối đa/cấp, hồi giáp nhanh | Bền bỉ |
| | 2 | Thế Thủ Bất Động | Chủ | Giương khiên 4 s: chặn 70% sát thương phía trước, phản đạn; chậm rất mạnh; CD 12 s | **Chủ đạo chống nova/quạt đạn của boss** |
| | 2 | Giáp Vỡ Phản Chấn | Bị | Giáp về 0 → xung kích R110, đẩy lùi; ICD 8 s | Phản công khi nguy kịch |
| | 3 | Lĩnh Vực Thần Minh | Chủ | Kết giới R160 / 8 s: nhốt bên trong, chặn đòn/đạn qua ranh giới; CD 75 s | Tối thượng phòng thủ |
| **Cuồng Huyết** (sát thương cận chiến) | 1 | Lốc Xoáy | Chủ | Xoay kiếm 2 s R70, đánh mỗi 0.35 s, đi ở 60% tốc | AoE cận thân |
| | 1 | Huyết Hận | Bị | Mất máu → tăng sát thương (tối đa +30%) | Rủi ro/phần thưởng |
| | 2 | ★ Chấn Địa | Chủ | **Đập tại chỗ** R100, choáng 0.8 s (bỏ phần nhảy 220 px để không trùng với Xung Phong) | Khống chế diện rộng |
| | 2 | Đà Chém | Bị | +4% tốc đánh mỗi đòn, tối đa 5 dồn | Duy trì giao tranh |
| | 3 | Bão Kiếm | Chủ | 6 s: tầm ×1.8, xuyên, sóng kiếm 3 hướng; CD 70 s | Bùng nổ đánh boss |
| **Hiệu Lệnh** (khống chế đám đông) | 1 | Tiếng Hô Chiến | Chủ | Địch thường R140 hoảng sợ 1.5 s, bản thân +15% sát thương | Giải vây |
| | 1 | Quân Luật | Bị | Hồi EN khi đánh/hạ gục | Duy trì tài nguyên |
| | 2 | ★ Xích Kéo | Chủ | Kéo mục tiêu về trước mặt; với elite/boss thì **kéo bản thân tới** (áp sát thứ hai, CD 9 s, **không lướt qua** quái) | Kéo mục tiêu then chốt |
| | 2 | Uy Nghiêm | Bị | Aura R120: địch gần gây ít sát thương, có cơ hội sợ | Giảm sát thương nhận |
| | 3 | Tiếng Gầm Cự Nhân | Chủ | Khởi động 0.6 s, R260: choáng 1.5 s (boss ×0.25), xử tử <20% HP; CD 80 s | Kết liễu đám đông |

**Kết hợp:** Xích Kéo → Xung Phong → Chấn Địa (kéo/ húc vào → choáng → diện rộng); Thế Thủ + Giáp Vỡ Phản Chấn (giương khiên cho tới khi giáp vỡ, xung kích đảo thế); Tiếng Hô Chiến + Đà Chém.
**Điểm mạnh:** sống lâu, khống chế mạnh, đỡ bất cứ ai chạm. **Điểm yếu:** chậm (0.92×), không né; đạn tầm xa và thiên thạch của boss gây thiệt hại thật nếu không có Thế Thủ; CD áp sát dài nên bị kite.

### 3.2 Pháp sư — sát thương phép & kiểm soát chiến trường
Bản sắc: *giữ khoảng cách, tạo vùng nguy hiểm, bẻ nhịp quái bằng chậm/đóng băng; mỏng manh.*

| Nhánh | Tier | Kỹ năng | Loại | Tác dụng chính | Vai trò |
|---|---|---|---|---|---|
| **Liệt Hỏa** (DoT · bùng nổ) | 1 | Hỏa Bạo | Chủ | Nổ R70 tại điểm ngắm (tầm 280) + Thiêu 3 s; CD 4 s | Sát thương đơn mục tiêu / mồi lửa |
| | 1 | Mồi Lửa | Bị | Thiêu mạnh hơn, lan khi địch chết | AoE bằng lan truyền |
| | 2 | Tường Lửa | Chủ | Tường 220 px / 5 s, chặn đạn địch; CD 10 s | **Vùng nguy hiểm + chặn đạn** |
| | 2 | Quá Nhiệt | Bị | 5 Nhiệt → skill Hỏa tiếp theo miễn EN + sát thương lớn; Nhiệt ≥3 giảm hồi EN | Nhịp chủ động |
| | 3 | Thiên Thạch | Chủ | Vạch báo 1.2 s, R130, kích nổ mọi Thiêu; CD 75 s | Burst cao cho boss |
| **Hàn Băng** (khống chế) | 1 | Băng Hoàn | Chủ | Vòng băng R110, làm chậm 35% 3 s; Lv5 đóng băng gần tâm; CD 6 s | Tự vệ cận thân |
| | 1 | Băng Vĩnh Cửu | Bị | Địch bị Lạnh chịu thêm sát thương | Khuếch đại |
| | 2 | Băng Thương | Chủ | Thương xuyên 3 mục tiêu, vỡ băng; CD 4 s | Sát thương tầm xa + combo |
| | 2 | Tâm Băng | Bị | Mỗi địch bị Lạnh gần → thêm EN/s | Duy trì EN |
| | 3 | Độ Không Tuyệt Đối | Chủ | Vùng R170 / 4 s: Lạnh → đóng băng → vỡ; CD 80 s | Kiểm soát chiến trường |
| **Hư Không** (phòng thân · năng lượng) | 1 | Tinh Bạo | Chủ | Sóng 360° R100, đẩy lùi 60 px, cắt đạn đang telegraph; CD 5 s | **Công cụ giữ khoảng cách** (thay Dash) |
| | 1 | Khiên Phép | Bị | 20% sát thương hấp thụ bằng EN (1 sát thương = 4 EN) | Sống sót bằng EN |
| | 2 | ★ Dịch Chuyển (**tùy chọn**) | Chủ | 200 px + dư ảnh nổ; CD 7 s; mở khóa Lv 9 live / T2 cây, **không có trong loadout mặc định** | Định vị khi cần |
| | 2 | Dư Chấn | Bị | Skill chủ động có cơ hội lặp lại sau 0.6 s | Nhịp ra chiêu |
| | 3 | Khe Nứt Hư Không | Chủ | Hố đen 5 s R200 kéo địch vào tâm; boss kéo chỉ 25%; CD 75 s | Gom quái + AoE đỉnh |

**Kết hợp:** Băng Hoàn → Băng Thương (vỡ băng); Tường Lửa + Mồi Lửa lan; Tinh Bạo đẩy rồi Hố Đen gom; Khiên Phép cho phép đứng nhận vài đòn nếu EN dư.**Điểm mạnh:** AoE và khống chế tốt nhất, đánh hàng loạt. **Điểm yếu:** 5–6 HP / 2 giáp; sát thương đơn mục tiêu cơ bản thấp (Trượng ≈3.2 DPS nền); phụ thuộc EN (160); không thoát khi bị kẹp nếu hết skill đẩy/đóng băng; boss kháng khống chế ×0.25.

### 3.3 Sát thủ — ám sát, cơ động, sát thương dồn
Bản sắc: *vào – bùng nổ – ra; sống nhờ né và canh thời điểm.*

| Nhánh | Tier | Kỹ năng | Loại | Tác dụng chính | Vai trò |
|---|---|---|---|---|---|
| **Bóng Đêm** (ám sát · né tránh) | 1 | ★ Lướt Bóng (`evasive_roll`) | Chủ | 2 lượt (3 ở Lv5) × 170 px, bất tử 0.22 s, xuyên quái; lượt hồi 4.5 s; đòn kế +40% sát thương (Tập kích) | **Cơ động chính** |
| | 1 | Đánh Lén | Bị | Đánh từ phía sau (±60°) hoặc đánh địch đang cast: +33% sát thương, +7% chí mạng | Thưởng định vị |
| | 2 | ★ Ảnh Bộ (+ `arrow_rain` live) | Chủ | Dịch ra sau địch gần nhất ≤300 px và đâm 180%, chắc chắn chí mạng khi từ phía sau; CD 8 s | **Áp sát/ám sát có mục tiêu** |
| | 2 | Phản Xạ Ma | Bị | Né hoàn toàn đòn đánh (tối đa 25%); né thành công hoàn 1 s CD | Sống sót bị động |
| | 3 | Vũ Điệu Bóng Đêm | Chủ | 6 s tàng hình: mỗi lần đánh dịch tới địch kế và đâm chí mạng; hạ gục kéo dài; CD 70 s | Tối thượng ám sát |
| **Độc Thuật** (tích dần · làm yếu) | 1 | Bẫy Độc | Chủ | Đặt tối đa 2 bẫy, nổ mây độc R80 / 4 s + Độc; CD 5 s | **Thoát thân bằng vùng** |
| | 1 | Độc Tố | Bị | Độc mạnh hơn; đòn thường có cơ hội gắn Độc | Sát thương tích dần |
| | 2 | Bình Dịch | Chủ | Ném bình R100 / 5 s, 2 tầng Độc, chậm 15%; CD 9 s | Khống chế nhẹ |
| | 2 | Độc Suy Nhược | Bị | Mỗi tầng Độc: địch gây ít sát thương/chậm hơn (-25% tối đa) | Giảm sát thương nhận |
| | 3 | Hoa Tử Thần | Chủ | Gieo hạt 1.5 s, nổ R140 kích nổ mọi tầng Độc; CD 70 s | Burst đáng sợ cho boss |
| **Tử Huyệt** (chí mạng · săn mục tiêu; đổi tên từ "Xạ Thuật") | 1 | Loạt Ba Tên | Chủ | 3 tên xòe 20°, mỗi tên 70%; CD 4 s | Đòn tầm trung |
| | 1 | Nhãn Quang | Bị | Bắn xa >300 px: +chí mạng | Khuyến khích kite nhẹ |
| | 2 | Dấu Săn | Chủ | Đánh dấu 1 địch / 8 s: +25% sát thương nhận, đòn thứ 3 chắc chí mạng; hạ gục thì reset CD và chuyển dấu | **Săn mục tiêu ưu tiên / boss** |
| | 2 | Rút Nhanh | Bị | Sau Lướt Bóng/Ảnh Bộ: 2 s bắn nhanh hơn, phát đầu miễn EN | Liên kết cơ động ↔ sát thương |
| | 3 | ★ Bão Tên | Chủ | 4 s bắn liên tục (đã di chuyển chậm 40%), xuyên hàng ngang; CD 75 s | Nhả sát thương khi đã an toàn |

**Kết hợp:** Tàng Hình (`poison_trap` live) → Ảnh Bộ → Đánh Lén → Lướt Bóng ra; Dấu Săn → Hoa Tử Thần (kích nổ độc); Rút Nhanh sau Lướt.
**Điểm mạnh:** sát thương đơn mục tiêu cao nhất, xử boss nhanh, cơ động tốt nhất. **Điểm yếu:** 5–6 HP / 3 giáp; AoE yếu (chỉ bẫy/bình/hoa); khống chế kém; phải ở gần để đạt sát thương tối đa; hết lượt lướt là mong manh.

> **Câu hỏi thiết kế cần quyết (xem §7):** Sát thủ hiện cầm *Súng NL + Cung* (tầm xa), trong khi nhiều node (Đánh Lén phía sau, Ảnh Bộ đâm) hợp với vũ khí cận chiến ngắn. Đề xuất thêm vũ khí **Đoản Đao** (✚: tầm 40 px, nhanh, chí mạng cao) làm vũ khí chính, giữ Cung cho nhánh Tử Huyệt.

---

## 4. Chỉ số cơ bản đề xuất

| | Đấu sĩ | Sát thủ | Pháp sư | Ghi chú |
|---|---|---|---|---|
| HP / Giáp | 12 / **8** (hiện 10) | **6** / 3 (hiện 5/3) | **5** / 2 (hiện 6/2) | EHP ≈ 20 / 9 / 7; tỉ lệ ~ 2.2 : 1 : 0.8 |
| EN | 70 | 90 | 160 | giữ nguyên |
| Tốc độ × | 0.92 | 1.18 | 0.98 | giữ nguyên |
| Sát thương × | **1.05** (hiện 1.2) | **1.0** (hiện 0.85) | 1.0 | Đấu sĩ giảm vì được thêm lao + giáp cứng; sát thủ tăng vì sát thương dồn là bản sắc |
| Chí mạng nền | 5% | **15%** | 8% | cần hỗ trợ chí mạng nền trong `StatSheet`/`CombatStats` (kiểm tra) |
| Dash mặc định | Không | Không (Lướt Bóng là skill) | Không | |

DPS nền (số liệu `combatConfig.ts`, trước nhân hệ số lớp): Kiếm 3 sát thương/0.32 s ≈ **9.4** (vòng cung 120°, đánh nhiều mục tiêu); Khiên 2/0.42 s ≈ 4.8; Súng 1/0.17 s ≈ 5.9 (tốn 4 EN/phát, ~23 EN/s so với hồi 8 EN/s → duy trì ~6 s); Cung 2–6 trong 0.7 s sạc; Trượng 3/0.95 s ≈ 3.2, xuyên 99; Đũa 2/0.65 s ≈ 3.1, xuyên 3.
→ Đấu sĩ hiện áp đảo ở sát thương đơn thuần (9.4 × 1.2 = **11.3**). Pháp sư và Sát thủ thấp hơn nhiều trên đòn thường, nên phải bù bằng kỹ năng.

---

## 5. Đánh giá cân bằng (thang 1–5, 5 = mạnh nhất; đây là đánh giá thiết kế, chưa đo thực nghiệm)

| Tiêu chí | Đấu sĩ | Pháp sư | Sát thủ | Ghi chú |
|---|---|---|---|---|
| Sát thương đơn mục tiêu | 3 | 3 | **5** | Sát thủ có burst; pháp sư mạnh nhờ Thiên Thạch/Băng Thương |
| Sát thương diện rộng | 3 | **5** | 2 | |
| Chống chịu (EHP) | **5** | 1 | 1 | |
| Cơ động | 2 | 2 (3 khi mở Blink) | **5** | |
| Khống chế | 4 | **5** | 2 | boss kháng ×0.25 làm giảm vai trò khống chế vs boss |
| Sinh tồn (tổng hợp) | 4 | 2 | 3 | |
| **Tổng** | **21** | **18** | **18** | Đấu sĩ cao hơn vì buộc cận chiến và nhận nhiều đạn/chạm nhất |
| Hiệu quả vs quái đàn | 4 | **5** | 3 | |
| Hiệu quả vs boss | 3 | 4 | **4** | Đấu sĩ giữ vững nhưng DPS trung bình; sát thủ chịu rủi ro cao |

### Tương tác với boss mới (vừa thêm: slam, nova đạn, quạt đạn, thiên thạch, triệu hồi, cuồng nộ)
| Kỹ năng boss | Đấu sĩ | Pháp sư | Sát thủ |
|---|---|---|---|
| Slam | Giáp cứng khi lao; Thế Thủ | Giữ khoảng cách | Lách bằng Lướt |
| Nova đạn (12–24 viên) | **Thế Thủ phản đạn** | Tường Lửa chặn; Khiên Phép | Lướt xuyên kẽ hở |
| Quạt đạn | Thế Thủ | Dịch ngang | Lướt ngang |
| Mưa thiên thạch | Chấp nhận/giáp | Rời vùng, Dịch chuyển | Lướt |
| Triệu hồi | Lốc Xoáy, Chấn Địa | **AoE (lợi thế lớn)** | Bẫy/ Bình |
| Cuồng nộ | Xích Kéo + Thế Thủ | Băng/Hố Đen khó vs boss | Dấu Săn + burst |

Rủi ro cân bằng cần theo dõi: (1) Đấu sĩ không dash nhưng vẫn chịu nhiều đạn → có thể quá yếu sau khi giảm giáp/sát thương; nếu vậy hoàn giáp 10; (2) Sát thủ lướt bất tử 0.22 s × 2–3 lượt có thể làm các boss yếu hơn dự kiến; (3) Pháp sư 5 HP có thể chết sau hai lần chạm ở threat tier cao (quái nay gây +1 từ tier 3).

---

## 6. Mobile HUD & điều khiển

Mục tiêu: **Đánh thường + 3 ô kỹ năng + Đổi vũ khí; không còn nút LƯỚT chung.**

| Lớp | Ô kỹ năng mặc định | Ghi chú |
|---|---|---|
| Đấu sĩ | S1 Xung Phong Khiên · S2 Thủ Thế/Thế Thủ · S3 Đập Đất | Xung Phong dùng kéo-để-ngắm hướng (đã có `directional cone`) |
| Sát thủ | S1 **Lướt Bóng** (badge số lượt) · S2 Loạt Bóng Tối · S3 Tàng Hình | Lướt: chạm = theo hướng di chuyển; kéo = chọn hướng |
| Pháp sư | S1 Bùng Nổ Phép · S2 Sóng Băng · S3 Khoá Thời Gian | **Dịch Chuyển không có sẵn**; khi mở khóa thì gán thủ công (ngắm điểm như `blink` hiện có) |

Cần đổi (chỉ liệt kê, chưa làm):
- `config/controlsConfig.ts`: bỏ `'dash'` khỏi `HudButtonId`/`HUD_BUTTON_IDS`/`HUD_BUTTON_NAMES`/layout; bump `CONTROLS_VERSION` để layout cũ (`pixel-world:controls:v1`) được di chuyển hoặc reset.
- `ui/combat/CombatHUD.ts`, `ControlLayoutEditor.ts`: bỏ nút/vùng chỉnh "dash".
- `ui/TouchControls.ts`, `systems/InputController.ts`: bỏ `consumeDash/pendingDash`; `ui/Hud.ts`: bỏ `dashText`.
- `scenes/WorldScene.ts` (khoảng dòng 377–390, 464, 482): bỏ nhánh dash chung (hoặc để sau cờ cấu hình `characters.mobility`).
- `ui/combat/ActionButton.ts`: thêm hiển thị số lượt (cho Lướt Bóng).
- Trên PC: phím Dash chung bỏ đi; Lướt Bóng gắn vào phím kỹ năng 3/4/5 như mọi skill.

---

## 7. Kế hoạch triển khai (theo giai đoạn, mỗi giai đoạn chạy được độc lập)

| GĐ | Nội dung | File chính | Rủi ro |
|---|---|---|---|
| **0** | **Phê duyệt** các quyết định ở §8 | — | — |
| **1** | Tách Dash khỏi `Player`: cấu hình cơ động theo lớp (`characters.ts`: `mobility`), tạm thời giữ Dash chung sau cờ (mặc định tắt) để rollback | `characters.ts`, `Player.ts`, `WorldScene.ts`, `combatConfig.ts` | thấp |
| **2** | Hệ thống lượt lướt (charges) + Lướt Bóng cho Sát thủ; badge lượt | `Player.ts`, `skills.ts` (`EVASIVE_ROLL`), `ActionButton.ts` | trung bình |
| **3** | Xung Phong Khiên cho Đấu sĩ (lao + giáp cứng + CD 9 s); bỏ lao khỏi Chấn Địa | `skills.ts`, `Player.ts` (cờ giáp cứng) | trung bình |
| **4** | Pháp sư: dời Dịch Chuyển ra Lv 9 và khỏi loadout mặc định; sắp lại `skills`/`defaultSkillLoadout`/`unlockLevel` | `characters.ts`, `skills.ts` | **cần migration save** (người chơi đã gán Blink) |
| **5** | Bỏ nút LƯỚT trên Mobile HUD + migrate layout | §6 | trung bình (`CONTROLS_VERSION`) |
| **6** | Cân lại chỉ số (§4) và kiểm tra bằng phiên thử có ghi số (TTK, sát thương nhận, thời gian bất tử) | `characters.ts`, `combatConfig.ts` | thấp |
| **7** | (Dài hạn) Nối cây kỹ năng vào gameplay/UI để thay 6 skill cố định bằng 3 nhánh × 5 node | `skills/tree/*`, `WorldScene`, `CharacterPanelScene` | **cao** — cần dự án riêng |
| **8** | (Tùy chọn) Vũ khí Đoản Đao cho Sát thủ | `combat/`, `weaponInfo.ts`, `createWeaponById` | trung bình |

Trong khi chưa làm GĐ 7, bộ **6 skill live** vẫn dùng; chỉ 3 skill đổi hành vi (Húc khiên, Lăn né, Dịch chuyển), còn lại giữ nguyên để không phá save.

**Tương thích save:** giữ các id kế thừa (`poison_trap`, `arrow_rain`, `hunters_mark`, `whirlwind`, `blade_storm`, `arcane_shield`); chỉ đổi *hành vi/số liệu/tên hiển thị*, không đổi id. Nếu đổi thứ tự `skills[]` hoặc loadout mặc định, cần kiểm tra cách `CharacterProgress` chuẩn hóa loadout cũ (tăng `SAVE_VERSION` nếu đổi cấu trúc).

**Kiểm thử (repo chưa có test):** checklist playtest cho từng GĐ — thử 3 lớp × (quái đàn tier 0 / tier 4 / boss tier 1–3) × (PC / mobile), ghi lại: thời gian hạ boss, số lần chết, sát thương nhận/phút.

---

## 8. Quyết định cần bạn chốt trước khi làm

1. **Đấu sĩ**: đồng ý thay Dash bằng *Xung Phong Khiên 130 px / CD 9 s* (không bất tử), và hạ nhẹ sát thương ×1.2 → 1.05, giáp 10 → 8?
2. **Sát thủ**: đồng ý *2 lượt lướt (3 ở Lv5), hồi 4.5 s/lượt, bất tử 0.22 s*? Có thêm vũ khí **Đoản Đao** (GĐ 8) hay giữ Súng/Cung?
3. **Pháp sư**: đồng ý *Dịch Chuyển mở ở Lv 9, tùy chọn, không có trong loadout mặc định*; Pháp sư giảm xuống 5 HP / 2 giáp?
4. **Mobile**: đồng ý **bỏ hẳn nút LƯỚT** (cần migration bố cục đã lưu)?
5. **Cây kỹ năng**: giữ 6 skill live trong đợt này, nối cây (GĐ 7) làm dự án riêng sau?
6. Có muốn giữ **cờ rollback** Dash chung (mặc định tắt) trong 1–2 bản cập nhật?

---

## 9. Kết quả triển khai (GĐ 1–6)

Đã làm: cờ `GENERIC_DASH_ENABLED=false` (rollback); bỏ nút LƯỚT/phím Shift khỏi HUD và gợi ý; Xung Phong Khiên (lao 130 px, giáp cứng -30%, CD 9 s, dừng trước địch đầu tiên); Lướt Bóng (2 lượt, hồi tuần tự 4.5 s, bất tử 0.22 s, không phá tàng hình, số lượt hiện trên ô kỹ năng); Dịch Chuyển dời sang Lv 9, 200 px / 7 s / 20 EN / bất tử 0.15 s, khỏi loadout mặc định (Pháp sư mở theo thứ tự Bùng nổ phép → Sóng băng → Khoá thời gian → Thiên thạch → Dịch chuyển → Khe nứt); chỉ số lớp theo §4 (trừ chí mạng nền).

Chưa làm / lệch so với thiết kế: chí mạng nền theo lớp; "Cắt Ngang" và lượt thứ 3 ở Lv5 của Lướt Bóng, hồi CD khi hạ gục (đều thuộc milestone của cây kỹ năng, GĐ 7); Xung Phong dừng trước *mọi* địch đầu tiên (chưa phân biệt quái nhỏ/elite); Săn Máu giữ nguyên tốc biến 220 px (chưa đổi thành Ảnh Bộ có mục tiêu). Người chơi Pháp sư đã gán Dịch Chuyển ở save cũ sẽ thấy ô bị khoá tới Lv 9. Đã giữ nguyên mọi id kỹ năng; không đổi `SAVE_VERSION`.
