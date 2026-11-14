/**
 * Thiết bị có con trỏ chính là cảm ứng (điện thoại/tablet).
 * Thêm `?touch` vào URL để bật giao diện cảm ứng khi thử trên máy tính.
 */
export function isTouchDevice(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('touch')) {
      return true;
    }

    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}
