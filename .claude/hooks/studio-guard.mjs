// studio-guard.mjs — PreToolUse hook của AI Studio (xem docs/studio/WORKFLOW.md §8).
//
// Mục đích: cưỡng chế ở tầng harness những điều mà prompt Agent chỉ "dặn":
//   - qa-tester / game-developer chỉ chạy được một allowlist lệnh Bash chỉ-đọc/build/test,
//     kiểm TOÀN BỘ chuỗi lệnh (không ghép lệnh, không chuyển hướng, không tham số ghi file);
//   - chỉ game-developer được ghi file (Edit/Write), và không được ghi vào vùng cấm;
//   - subagent khác (visual/gameplay-designer, built-in...) bị khoá như QA, fail-closed.
//
// AI Lead (cuộc gọi KHÔNG có agent_id và KHÔNG có agent_type) không bị hook này can thiệp:
// hook im lặng (exit 0, không in gì) để luồng quyền bình thường (allow/ask/deny trong
// settings) tiếp tục quyết định. Hook không bao giờ tự "allow" thay luật quyền.
//
// Fail-closed: payload không đọc được, thiếu agent_type ở subagent, hoặc lỗi nội bộ => exit 2
// (chặn). Lưu ý giới hạn: nếu tiến trình node KHÔNG KHỞI ĐỘNG được thì hook không tự xử lý
// được; settings.json dùng "onFailure": "block" cho trường hợp đó.
//
// Hook này KHÔNG phải sandbox: game-developer vẫn viết được mã TypeScript/test rồi chạy qua
// `npm test`/`npm run build`. Nó chỉ chặn sai sót và hành vi ngoài phạm vi đã duyệt.
//
// Không đọc, không in nội dung credentials. Không ghi file, không gọi mạng.

import { realpathSync, existsSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------- cấu hình hồ sơ quyền
const WRITER_AGENTS = new Set(['game-developer']); // subagent duy nhất được Edit/Write
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const ALLOWED_SHELL_TOOL = 'Bash'; // PowerShell không dành cho subagent
const WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);

const MAX_COMMAND_LENGTH = 400;
const MAX_TEST_PATHS = 20;

// Chỉ các ký tự này được xuất hiện trong lệnh. Loại bỏ ; & | < > ` $ ( ) { } \ ' " * ? ! # ~ ^ %
// [ ] tab, xuống dòng và mọi ký tự không phải ASCII => không thể ghép lệnh, mở rộng biến,
// chuyển hướng, glob hay dùng dấu nháy để giấu tham số.
const SAFE_COMMAND_CHARS = /^[A-Za-z0-9_.\/:@=+, -]+$/;

// ---------------------------------------------------------------- allowlist lệnh
const TEST_PATH = /^src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.test\.ts$/;
const GIT_POSITIONAL = /^[A-Za-z0-9_.][A-Za-z0-9_.\/:-]*$/; // rev, đường dẫn, pathspec thường
const HASH_PATH = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/; // tương đối; đoạn `.`/`..`/`-x` bị loại ở isSafeHashPath

// Tuỳ chọn được phép theo từng lệnh con git (so khớp CHÍNH XÁC; không cho viết tắt tuỳ chọn dài).
// Chủ ý KHÔNG có: --output*, -o (diff), -O, --no-index, --ext-diff, -p/--patch, -w, --stdin*, -c, -C,
// --git-dir, --work-tree, --exec-path, --paginate.
const GIT_SPECS = {
  status: {
    exact: ['--porcelain', '--porcelain=v1', '--porcelain=v2', '--short', '-s', '--branch', '-b',
      '-uall', '-uno', '-unormal', '--untracked-files=all', '--untracked-files=no',
      '--untracked-files=normal', '--ignored', '-z'],
    patterns: [],
  },
  diff: {
    exact: ['--name-only', '--name-status', '--stat', '--numstat', '--shortstat', '--summary',
      '--cached', '--staged', '--no-color', '--color=never', '--no-ext-diff', '--compact-summary',
      '-M', '--find-renames', '--exit-code', '--quiet', '-z'],
    patterns: [/^--diff-filter=[ACDMRTUXB]+$/, /^--unified=\d{1,3}$/, /^-U\d{1,3}$/],
  },
  log: {
    exact: ['--oneline', '--stat', '--name-only', '--name-status', '--no-color', '--color=never',
      '--decorate', '--no-decorate', '--no-ext-diff', '-n', '-z'],
    patterns: [/^-\d{1,4}$/, /^--max-count=\d{1,4}$/],
  },
  show: {
    exact: ['--stat', '--name-only', '--name-status', '--no-patch', '-s', '--no-color',
      '--color=never', '--oneline', '--no-ext-diff', '-z'],
    patterns: [],
  },
  'ls-files': {
    exact: ['--others', '-o', '--exclude-standard', '--modified', '-m', '--deleted', '-d',
      '--cached', '-c', '--ignored', '-i', '--full-name', '-z'],
    patterns: [],
  },
  'rev-parse': {
    exact: ['--short', '--abbrev-ref', '--verify', '--show-toplevel', '--is-inside-work-tree'],
    patterns: [/^--short=\d{1,2}$/],
  },
  'hash-object': { exact: [], patterns: [], positional: 'hashpath', requirePositional: true },
};

// ---------------------------------------------------------------- kiểm lệnh Bash
/** @returns {string|null} null nếu hợp lệ, ngược lại là lý do từ chối. */
export function checkBashCommand(command) {
  if (typeof command !== 'string' || command.length === 0) return 'lệnh rỗng hoặc không phải chuỗi';
  if (command.length > MAX_COMMAND_LENGTH) return `lệnh dài quá ${MAX_COMMAND_LENGTH} ký tự`;
  if (!SAFE_COMMAND_CHARS.test(command)) {
    return 'lệnh chứa ký tự ngoài tập an toàn (ghép lệnh ; & | , chuyển hướng < >, $() `, dấu nháy, xuống dòng, ký tự không phải ASCII...)';
  }
  const tokens = command.split(' ');
  if (tokens.some((t) => t === '')) return 'khoảng trắng thừa ở đầu/cuối hoặc liền nhau';

  switch (tokens[0]) {
    case 'npm':
      return sameTokens(tokens, ['npm', 'test']) || sameTokens(tokens, ['npm', 'run', 'build'])
        ? null
        : 'npm chỉ được: `npm test`, `npm run build` (không thêm đối số)';
    case 'npx':
      return checkNpx(tokens);
    case 'git':
      return checkGit(tokens);
    default:
      return `lệnh "${tokens[0]}" không nằm trong allowlist`;
  }
}

function sameTokens(a, b) {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

function checkNpx(tokens) {
  if (sameTokens(tokens, ['npx', 'tsc', '--noEmit'])) return null;
  const head = ['npx', 'vitest', 'run', '--root', '.'];
  if (tokens.length >= head.length && head.every((t, i) => tokens[i] === t)) {
    const paths = tokens.slice(head.length);
    if (paths.length > MAX_TEST_PATHS) return `quá ${MAX_TEST_PATHS} đường dẫn test`;
    const bad = paths.find((p) => !TEST_PATH.test(p));
    return bad === undefined ? null : `đường dẫn test không hợp lệ: ${bad} (cần src/**/*.test.ts)`;
  }
  return 'npx chỉ được: `npx tsc --noEmit`, `npx vitest run --root . [src/**/x.test.ts ...]`';
}

function checkGit(tokens) {
  const sub = tokens[1];
  if (sub === undefined) return 'git thiếu lệnh con';
  if (sub === 'branch') {
    return sameTokens(tokens, ['git', 'branch', '--show-current'])
      ? null
      : 'git branch chỉ được `git branch --show-current`';
  }
  const spec = Object.hasOwn(GIT_SPECS, sub) ? GIT_SPECS[sub] : undefined;
  if (!spec) {
    return `git ${sub.startsWith('-') ? '<tuỳ chọn toàn cục>' : sub} không nằm trong allowlist (chỉ đọc: status, diff, log, show, ls-files, rev-parse, hash-object, branch --show-current)`;
  }
  let afterDoubleDash = false;
  let positionals = 0;
  for (const tok of tokens.slice(2)) {
    if (!afterDoubleDash && tok === '--') {
      afterDoubleDash = true;
      continue;
    }
    if (!afterDoubleDash && tok.startsWith('-')) {
      const ok = spec.exact.includes(tok) || spec.patterns.some((re) => re.test(tok));
      if (!ok) return `tuỳ chọn không được phép với git ${sub}: ${tok}`;
      continue;
    }
    if (tok.startsWith('-')) return `đối số sau "--" không được bắt đầu bằng "-": ${tok}`;
    positionals += 1;
    if (spec.positional === 'hashpath') {
      // Cho phép đoạn bắt đầu bằng "." (vd .claude/...) nhưng không cho "." / ".." / đoạn bắt đầu "-".
      const ok = HASH_PATH.test(tok) && tok.split('/').every((s) => s !== '.' && s !== '..' && !s.startsWith('-'));
      if (!ok) return `git hash-object chỉ nhận đường dẫn tương đối trong dự án: ${tok}`;
    } else {
      if (!GIT_POSITIONAL.test(tok)) return `đối số git không hợp lệ: ${tok}`;
      if (tok.split('/').some((seg) => seg === '..')) return `đối số git chứa đoạn "..": ${tok}`;
    }
  }
  if (spec.requirePositional && positionals === 0) return `git ${sub} cần ít nhất một đường dẫn`;
  return null;
}

// ---------------------------------------------------------------- kiểm đường dẫn ghi
function resolveReal(absPath) {
  // realpath của tổ tiên sâu nhất đang tồn tại + phần còn lại (file chưa tồn tại vẫn kiểm được).
  let current = absPath;
  const rest = [];
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    rest.unshift(path.basename(current));
    current = parent;
  }
  return path.join(realpathSync(current), ...rest);
}

// Chuẩn hoá tên đoạn đường dẫn như Windows sẽ làm (bỏ dấu chấm/khoảng trắng cuối, không phân biệt hoa thường).
function normSegment(seg) {
  return seg.replace(/[. ]+$/, '').toLowerCase();
}

/** @returns {string|null} null nếu được ghi, ngược lại là lý do từ chối. */
export function checkWritePath(filePath, projectDir) {
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.includes('\0')) {
    return 'thiếu hoặc sai file_path';
  }
  if (typeof projectDir !== 'string' || projectDir.length === 0) {
    return 'không xác định được thư mục dự án (CLAUDE_PROJECT_DIR/cwd)';
  }
  const realProject = realpathSync(projectDir);
  const target = resolveReal(path.resolve(realProject, filePath));
  const rel = path.relative(realProject, target);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return 'đường dẫn nằm ngoài thư mục dự án';

  const segs = rel.split(/[\\/]+/).map(normSegment);
  if (segs.some((s) => s.includes(':') || s.includes('~'))) {
    return 'đường dẫn chứa ":" hoặc "~" (luồng NTFS/tên rút gọn 8.3)';
  }
  const first = segs[0];
  const joined = segs.join('/');
  if (segs.includes('.git')) return 'vùng cấm: .git';
  if (first === '.claude') return 'vùng cấm: .claude/ (Agent, hook, settings)';
  if (first === 'node_modules' || first === 'dist') return `vùng cấm: ${first}/`;
  if (joined === 'claude.md') return 'vùng cấm: CLAUDE.md';
  if (joined === 'docs/studio/decisions.md') return 'vùng cấm: docs/studio/DECISIONS.md (chỉ AI Lead ghi)';
  if (segs.length === 1) {
    const f = first;
    if (f === 'package.json' || f === 'package-lock.json' || f === '.gitignore') return `vùng cấm: ${f}`;
    if (/^tsconfig.*\.json$/.test(f) || /^vite\.config\./.test(f) || /^\.env/.test(f)) {
      return `vùng cấm: ${f} (cấu hình build/môi trường)`;
    }
  }
  return null;
}

// ---------------------------------------------------------------- quyết định
const present = (v) => v !== undefined && v !== null && v !== '';

/** @returns {{allow: boolean, reason?: string}} */
export function decide(input, projectDirEnv) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { allow: false, reason: 'payload hook không hợp lệ, không xác định được người gọi (fail-closed)' };
  }
  const hasId = present(input.agent_id);
  const hasType = present(input.agent_type);

  // AI Lead: không can thiệp; luật quyền trong settings vẫn áp dụng.
  if (!hasId && !hasType) return { allow: true };

  // Từ đây là subagent (hoặc phiên chạy bằng --agent): fail-closed.
  if (!hasType || typeof input.agent_type !== 'string') {
    return { allow: false, reason: 'subagent nhưng thiếu/không hợp lệ agent_type, không xác định được hồ sơ quyền' };
  }
  const agent = input.agent_type;
  const tool = input.tool_name;
  if (typeof tool !== 'string') return { allow: false, reason: 'thiếu tool_name' };
  const toolInput = typeof input.tool_input === 'object' && input.tool_input !== null ? input.tool_input : {};

  if (SHELL_TOOLS.has(tool)) {
    if (tool !== ALLOWED_SHELL_TOOL) return { allow: false, reason: `${agent} không được dùng ${tool}; chỉ dùng Bash trong allowlist` };
    if (toolInput.dangerouslyDisableSandbox) return { allow: false, reason: 'không được tắt sandbox' };
    const why = checkBashCommand(toolInput.command);
    return why === null ? { allow: true } : { allow: false, reason: `Bash bị chặn cho ${agent}: ${why}` };
  }

  if (WRITE_TOOLS.has(tool)) {
    if (!WRITER_AGENTS.has(agent)) return { allow: false, reason: `${agent} không có quyền ghi file (chỉ game-developer)` };
    const projectDir = projectDirEnv || (typeof input.cwd === 'string' ? input.cwd : '');
    const target = toolInput.file_path ?? toolInput.notebook_path;
    let why;
    try {
      why = checkWritePath(target, projectDir);
    } catch {
      why = 'không kiểm được đường dẫn (fail-closed)';
    }
    return why === null ? { allow: true } : { allow: false, reason: `ghi file bị chặn cho ${agent}: ${why}` };
  }

  // Công cụ khác (Read/Grep/Glob...) không thuộc phạm vi hook này.
  return { allow: true };
}

// ---------------------------------------------------------------- điểm vào
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

function preview(text) {
  return String(text ?? '').replace(/[^\x20-\x7e]/g, '?').slice(0, 80);
}

async function main() {
  let verdict;
  let input;
  try {
    const raw = await readStdin();
    try {
      input = JSON.parse(raw);
    } catch {
      input = undefined;
    }
    verdict = decide(input, process.env.CLAUDE_PROJECT_DIR);
  } catch {
    verdict = { allow: false, reason: 'lỗi nội bộ của studio-guard (fail-closed)' };
  }
  if (verdict.allow) {
    process.exitCode = 0; // im lặng: để luồng quyền bình thường quyết định
    return;
  }
  const cmd = input?.tool_input?.command ?? input?.tool_input?.file_path;
  process.stderr.write(
    `[studio-guard] ${verdict.reason}.` +
      (cmd !== undefined ? ` Mục: "${preview(cmd)}".` : '') +
      ' Xem docs/studio/WORKFLOW.md §8; cần việc ngoài phạm vi thì báo AI Lead.\n',
  );
  process.exitCode = 2;
}

// Mặc định LUÔN chạy main (an toàn: không bao giờ vô tình thoát im lặng). Chỉ file test
// đặt STUDIO_GUARD_TEST=1 trước khi import để lấy các hàm thuần mà không đọc stdin.
if (process.env.STUDIO_GUARD_TEST !== '1') await main();
