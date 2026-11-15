/** Lời thoại tĩnh của Trưởng làng (hiện từng trang trong `VillageShopScene`, nhánh role 'elder'). */

/** Số ký tự tối đa mỗi trang (để vừa khung, không tràn panel). */
export const ELDER_DIALOGUE_MAX_CHARS = 140;
/** Thời gian đầu sau khi mở hội thoại bỏ qua phím/nút chuyển trang (ms), chống nhảy trang do F vừa mở. */
export const ELDER_INPUT_LOCK_MS = 250;

export const ELDER_DIALOGUE_PAGES: readonly string[] = [
  // Trang 1: chào mừng, giới thiệu quảng trường an toàn.
  'Ngươi đã đến được Khởi Nguyên, mảnh đất cuối cùng còn yên. Trong quảng trường này, quái vật không dám bước vào.',
  // Trang 2: Thương Nhân.
  'Thương Nhân mua đồ ngươi nhặt được, bán vũ khí, giáp và ngọc. Ngọc cùng loại có thể đổi lấy thứ ngươi cần, với một chút vàng.',
  // Trang 3: Thợ Rèn.
  'Thợ Rèn nâng cấp trang bị, đục lỗ và khảm ngọc vào đó. Lửa lò chưa bao giờ nguội, chỉ cần ngươi mang đủ vàng.',
  // Trang 4: hoang địa và Trùm. "chừng hai phút" bám BOSS_FIRST_DELAY_MS (combatConfig.ts) — nếu đổi giá trị đó thì sửa lời thoại.
  'Ngoài tường làng là hoang địa. Quái vật mỗi lúc một đông, và sau chừng hai phút, một Trùm sẽ tìm đến ngươi.',
  // Trang 5: lời dặn bán đồ và tạm biệt.
  'Đồ nhặt được ngoài kia, hãy mang về bán lấy vàng. Trở về còn sống cũng là một chiến thắng. Đi đi.',
];
