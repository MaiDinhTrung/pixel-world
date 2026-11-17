// Chạy vitest sau khi chuẩn hoá chữ hoa/thường của ổ đĩa trong thư mục làm việc (Windows).
// Lý do (FIX-01): nếu terminal/agent mở dự án bằng `d:\…` thay vì `D:\…`, vitest giải cùng
// một module thành hai id khác nhau nên `vi.mock` không áp (castleWall.test.ts,
// mapBuilders.test.ts lỗi "window is not defined"). Chuẩn hoá trong vite config là không đủ
// vì vitest đã ghi nhận cwd trước khi nạp config, nên phải làm trước khi khởi động tiến trình.
import { realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = realpathSync.native(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const vitestEntry = path.join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs');

const result = spawnSync(process.execPath, [vitestEntry, 'run', '--root', '.', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
