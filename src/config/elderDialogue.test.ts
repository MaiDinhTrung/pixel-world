import { describe, expect, it } from 'vitest';

import { ELDER_DIALOGUE_MAX_CHARS, ELDER_DIALOGUE_PAGES } from './elderDialogue';

describe('lời thoại Trưởng làng', () => {
  it('có từ 3 đến 5 trang', () => {
    expect(ELDER_DIALOGUE_PAGES.length).toBeGreaterThanOrEqual(3);
    expect(ELDER_DIALOGUE_PAGES.length).toBeLessThanOrEqual(5);
  });

  it('mỗi trang không rỗng và không dài quá giới hạn', () => {
    for (const page of ELDER_DIALOGUE_PAGES) {
      expect(page.length).toBeGreaterThan(0);
      expect(page.length).toBeLessThanOrEqual(ELDER_DIALOGUE_MAX_CHARS);
    }
  });

  it('không trang nào bắt đầu hoặc kết thúc bằng khoảng trắng', () => {
    for (const page of ELDER_DIALOGUE_PAGES) {
      expect(page).toBe(page.trim());
    }
  });
});
