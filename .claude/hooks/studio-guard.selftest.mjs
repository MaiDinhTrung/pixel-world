// Test cho studio-guard.mjs. Chạy: node --test .claude/hooks/studio-guard.selftest.mjs
// Cố ý KHÔNG đặt tên *.test.mjs: vitest (npm test) tự quét tên đó và sẽ lỗi vì file này dùng node:test.
// Không ghi file, không đụng git; chỉ gọi hàm thuần và chạy hook như tiến trình con với stdin giả.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.STUDIO_GUARD_TEST = '1'; // import không chạy main()
const { decide, checkBashCommand, checkWritePath } = await import('./studio-guard.mjs');

const HOOK = fileURLToPath(new URL('./studio-guard.mjs', import.meta.url));
const PROJECT = path.resolve(path.dirname(HOOK), '..', '..');

const bash = (agent_type, command, extra = {}) => ({
  agent_id: 'a1', agent_type, tool_name: 'Bash', tool_input: { command }, ...extra,
});
const write = (agent_type, file_path, tool_name = 'Edit') => ({
  agent_id: 'a1', agent_type, tool_name, tool_input: { file_path },
});

// ---------------------------------------------------------------- AI Lead
test('AI Lead (không agent_id, không agent_type) không bị can thiệp, kể cả lệnh nguy hiểm', () => {
  for (const command of ['git commit -m x', 'git push', 'rm -rf x', 'a && b']) {
    assert.equal(decide({ tool_name: 'Bash', tool_input: { command } }, PROJECT).allow, true, command);
  }
  assert.equal(decide({ tool_name: 'Edit', tool_input: { file_path: '.claude/settings.json' } }, PROJECT).allow, true);
});

// ---------------------------------------------------------------- fail-closed
test('payload không hợp lệ => chặn', () => {
  for (const bad of [undefined, null, 'x', 42, []]) assert.equal(decide(bad, PROJECT).allow, false);
});
test('subagent thiếu agent_type => chặn (kể cả lệnh vô hại)', () => {
  assert.equal(decide({ agent_id: 'a1', tool_name: 'Bash', tool_input: { command: 'git status' } }, PROJECT).allow, false);
});
test('agent_type không phải chuỗi => chặn', () => {
  assert.equal(decide({ agent_id: 'a1', agent_type: 7, tool_name: 'Bash', tool_input: { command: 'git status' } }, PROJECT).allow, false);
});
test('thiếu tool_name ở subagent => chặn', () => {
  assert.equal(decide({ agent_id: 'a1', agent_type: 'qa-tester', tool_input: {} }, PROJECT).allow, false);
});
test('phiên chạy --agent (có agent_type, không agent_id) vẫn bị áp hồ sơ', () => {
  assert.equal(decide({ agent_type: 'qa-tester', tool_name: 'Bash', tool_input: { command: 'rm -rf x' } }, PROJECT).allow, false);
});

// ---------------------------------------------------------------- Bash được phép
const OK = [
  'npm test', 'npm run build', 'npx tsc --noEmit',
  'npx vitest run --root .',
  'npx vitest run --root . src/combat/swordCombo.test.ts',
  'npx vitest run --root . src/combat/swordCombo.test.ts src/config/gearResist.test.ts',
  'git status', 'git status --porcelain', 'git status --porcelain -z', 'git status --porcelain --untracked-files=all',
  'git status -- docs/studio',
  'git diff', 'git diff --name-status HEAD', 'git diff --name-only 52d4623', 'git diff HEAD -- src/a.ts',
  'git diff abc1234..HEAD --stat', 'git diff --diff-filter=ACDMR --name-status HEAD', 'git diff -U5 HEAD',
  'git log', 'git log --oneline -n 5', 'git log --oneline -5', 'git log --max-count=3 --name-only',
  'git show HEAD', 'git show --stat HEAD', 'git show HEAD:docs/studio/WORKFLOW.md',
  'git ls-files', 'git ls-files --others --exclude-standard', 'git ls-files -z --others --exclude-standard',
  'git rev-parse HEAD', 'git rev-parse --short HEAD', 'git rev-parse --short=8 HEAD', 'git rev-parse --abbrev-ref HEAD',
  'git branch --show-current',
  'git hash-object src/a.ts', 'git hash-object src/a.ts docs/PROJECT_MAP.md',
  'git hash-object .claude/settings.json', 'git hash-object .claude/hooks/studio-guard.mjs', 'git hash-object .gitignore',
];
test('allowlist: các lệnh hợp lệ được qua', () => {
  for (const c of OK) {
    assert.equal(checkBashCommand(c), null, `phải cho phép: ${c}`);
    for (const agent of ['qa-tester', 'game-developer']) assert.equal(decide(bash(agent, c), PROJECT).allow, true, `${agent}: ${c}`);
  }
});

// ---------------------------------------------------------------- Bash bị chặn
const DENY = {
  'ghép lệnh / chuyển hướng / thay thế': [
    'git status; rm -rf x', 'git status && rm -rf x', 'git status || echo x', 'git status | cat', 'git status & echo x',
    'git status > out.txt', 'git status >> out.txt', 'git status 2> e', 'git status < in',
    'git status $(whoami)', 'git status `whoami`', 'git status\nrm x', 'git status\r\nrm x', 'git status\trm x',
    'echo $HOME', 'git status ${X}', 'git status (x)',
  ],
  'dấu nháy / glob / escape': [
    'git status "a;b"', "git status 'x'", 'git status *', 'git status ?', 'git status \\x', 'git status !x', 'git status #c', 'git status ~', 'git status HEAD~1', 'git status HEAD^',
  ],
  'git: tuỳ chọn toàn cục / lệnh ghi': [
    'git -C . status', 'git -C . commit', 'git -c core.pager=x status', 'git --git-dir=x status', 'git --work-tree=x status',
    'git commit', 'git commit -m x', 'git push', 'git add .', 'git add -A', 'git reset --hard', 'git checkout -- .', 'git restore .',
    'git clean -fd', 'git stash', 'git stash -u', 'git rebase main', 'git merge x', 'git branch -D x', 'git branch x', 'git config user.name x',
    'git tag x', 'git rm x', 'git mv a b', 'git apply p', 'git cherry-pick x', 'git revert x', 'git worktree add x', 'git fetch', 'git pull', 'git gc',
    'git', 'git ', 'git --version',
  ],
  'git: tuỳ chọn ghi file / chạy chương trình': [
    'git diff --output=x', 'git diff --output x', 'git diff --out=x', 'git log --output=x', 'git diff -O x', 'git diff --ext-diff',
    'git diff --no-index a b', 'git diff -p', 'git log -p', 'git show --textconv HEAD', 'git hash-object -w src/a.ts', 'git hash-object --stdin',
    'git hash-object --path=x f', 'git ls-files --exclude-from=x', 'git status --ignore-submodules', 'git log --format=x',
  ],
  'git: đối số xấu': [
    'git diff -- --output=x', 'git diff -- ../x', 'git diff ../../x', 'git hash-object ../x', 'git hash-object /etc/passwd', 'git hash-object C:/x',
    'git hash-object', 'git hash-object .', 'git hash-object src//a.ts', 'git hash-object src/./a.ts', 'git hash-object .claude/../x', 'git hash-object -x', 'git hash-object src/-x', 'git diff :(top)x',
  ],
  'npm / npx': [
    'npm test -- --outputFile=x', 'npm test src/a.test.ts', 'npm run dev', 'npm run build -- --outDir x', 'npm install', 'npm i x', 'npm ci', 'npm run', 'npm exec x',
    'npx tsc', 'npx tsc --noEmit --outFile x', 'npx tsc -p x', 'npx vitest', 'npx vitest run', 'npx vitest run --root .. src/a.test.ts', 'npx vitest run --root . ../x.test.ts',
    'npx vitest run --root . src/a.ts', 'npx vitest run --root . --reporter=json', 'npx vitest run --root . src/../x.test.ts', 'npx vitest run --root . /abs/x.test.ts',
    'npx vitest run --root . --outputFile=x', 'npx prettier --write .', 'npx vite build', 'npx x',
  ],
  'lệnh khác / tránh allowlist': [
    'bash -c "git status"', 'bash -c git', 'sh -c x', 'node -e 1', 'node x.js', 'powershell -c x', 'cmd /c dir', 'cat x', 'ls', 'echo test', 'rm -rf x', 'rm x', 'del x',
    'mkdir x', 'cp a b', 'mv a b', 'curl http://x', 'wget x', 'tee x', 'sed -i x y', 'python x', 'timeout 5 git status', 'env git status', 'FOO=bar git status',
    '/usr/bin/git status', './git status', 'GIT status', 'git  status', ' git status', 'git status ', '', 'git status é',
  ],
};
for (const [group, cmds] of Object.entries(DENY)) {
  test(`chặn: ${group}`, () => {
    for (const c of cmds) {
      assert.notEqual(checkBashCommand(c), null, `phải chặn: ${JSON.stringify(c)}`);
      for (const agent of ['qa-tester', 'game-developer', 'visual-designer', 'general-purpose']) {
        assert.equal(decide(bash(agent, c), PROJECT).allow, false, `${agent}: ${JSON.stringify(c)}`);
      }
    }
  });
}
test('chặn lệnh quá dài và command không phải chuỗi', () => {
  assert.notEqual(checkBashCommand('git status ' + 'a'.repeat(500)), null);
  for (const c of [undefined, null, 5, {}, ['git', 'status']]) assert.notEqual(checkBashCommand(c), null);
});
test('PowerShell bị chặn với mọi subagent; dangerouslyDisableSandbox bị chặn', () => {
  for (const agent of ['qa-tester', 'game-developer']) {
    assert.equal(decide({ agent_id: 'a', agent_type: agent, tool_name: 'PowerShell', tool_input: { command: 'git status' } }, PROJECT).allow, false);
  }
  assert.equal(decide(bash('qa-tester', 'git status', { tool_input: { command: 'git status', dangerouslyDisableSandbox: true } }), PROJECT).allow, false);
});
test('Object.prototype không lọt qua lệnh con git', () => {
  for (const s of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) assert.notEqual(checkBashCommand(`git ${s}`), null, s);
});

// ---------------------------------------------------------------- ghi file
test('qa-tester và agent khác không được Edit/Write', () => {
  for (const agent of ['qa-tester', 'visual-designer', 'gameplay-designer', 'general-purpose']) {
    for (const t of ['Edit', 'Write', 'NotebookEdit', 'MultiEdit']) assert.equal(decide(write(agent, 'src/a.ts', t), PROJECT).allow, false, `${agent} ${t}`);
  }
});
test('game-developer: ghi file thường được phép', () => {
  for (const f of ['src/combat/NewWeapon.ts', 'src/config/combatConfig.ts', 'docs/PROJECT_MAP.md', 'docs/assets/ASSET_CATALOG.md', 'docs/studio/WORKFLOW.md', 'public/assets/x.png']) {
    assert.equal(checkWritePath(f, PROJECT), null, f);
    assert.equal(decide(write('game-developer', f), PROJECT).allow, true, f);
  }
  assert.equal(checkWritePath(path.join(PROJECT, 'src', 'x.ts'), PROJECT), null, 'đường dẫn tuyệt đối trong dự án');
});
test('game-developer: vùng cấm và đường dẫn nguy hiểm bị chặn', () => {
  const bad = [
    '.claude/settings.json', '.claude/settings.local.json', '.claude/agents/qa-tester.md', '.claude/hooks/studio-guard.mjs', '.CLAUDE/x', '.claude\\x', './.claude/x',
    'CLAUDE.md', 'claude.md', 'Claude.MD', 'CLAUDE.md.', 'CLAUDE.md ', 'docs/studio/DECISIONS.md', 'docs/studio/decisions.md', 'docs\\studio\\DECISIONS.md', 'docs/studio/../studio/DECISIONS.md',
    '.git/config', '.git/hooks/pre-commit', 'sub/.git/config', '.gitignore', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.node.json', 'vite.config.ts', '.env', '.env.local',
    'node_modules/x/index.js', 'dist/index.html', '../outside.txt', '..\\outside.txt', 'src/../../outside.txt', 'C:/Windows/x.txt', '/etc/passwd',
    'CLAUDE.md::$DATA', 'src/a.ts:stream', 'CLAUDE~1.MD', 'src/LONGNA~1.ts', '', 'src/\0x.ts',
  ];
  for (const f of bad) {
    assert.notEqual(checkWritePath(f, PROJECT), null, `phải chặn: ${JSON.stringify(f)}`);
    assert.equal(decide(write('game-developer', f), PROJECT).allow, false, JSON.stringify(f));
  }
});
test('ghi file: thiếu file_path / thiếu thư mục dự án => chặn (fail-closed)', () => {
  assert.equal(decide({ agent_id: 'a', agent_type: 'game-developer', tool_name: 'Edit', tool_input: {} }, PROJECT).allow, false);
  assert.equal(decide(write('game-developer', 'src/a.ts'), ''). allow, false);
  assert.equal(decide({ ...write('game-developer', 'src/a.ts'), cwd: PROJECT }, '').allow, true, 'dùng cwd nếu thiếu env');
});
test('công cụ ngoài phạm vi hook (Read/Grep/Glob) không bị hook chặn', () => {
  assert.equal(decide({ agent_id: 'a', agent_type: 'qa-tester', tool_name: 'Read', tool_input: { file_path: 'x' } }, PROJECT).allow, true);
});

// ---------------------------------------------------------------- chạy như tiến trình thật (stdin → exit code)
function runHook(payload, rawStdin) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: PROJECT };
  delete env.STUDIO_GUARD_TEST;
  return spawnSync(process.execPath, [HOOK], { input: rawStdin ?? JSON.stringify(payload), encoding: 'utf8', env });
}
test('tiến trình: Lead => exit 0, im lặng', () => {
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } });
  assert.equal(r.status, 0); assert.equal(r.stdout, ''); assert.equal(r.stderr, '');
});
test('tiến trình: QA lệnh hợp lệ => exit 0, im lặng (không tự "allow")', () => {
  const r = runHook(bash('qa-tester', 'git status --porcelain'));
  assert.equal(r.status, 0); assert.equal(r.stdout, ''); assert.equal(r.stderr, '');
});
test('tiến trình: QA lệnh bị cấm => exit 2 + lý do trên stderr', () => {
  const r = runHook(bash('qa-tester', 'git -C . commit -m x'));
  assert.equal(r.status, 2); assert.match(r.stderr, /\[studio-guard\]/); assert.equal(r.stdout, '');
});
test('tiến trình: stdin hỏng / rỗng => exit 2 (fail-closed)', () => {
  assert.equal(runHook(null, '{not json').status, 2);
  assert.equal(runHook(null, '').status, 2);
});
test('tiến trình: subagent thiếu agent_type => exit 2', () => {
  assert.equal(runHook({ agent_id: 'a', tool_name: 'Bash', tool_input: { command: 'git status' } }).status, 2);
});
test('tiến trình: lý do không in nguyên văn lệnh dài/ký tự lạ', () => {
  const r = runHook(bash('qa-tester', 'echo ' + 'x'.repeat(300)));
  assert.equal(r.status, 2); assert.ok(r.stderr.length < 600);
});
test('tiến trình: Developer ghi vào .claude => exit 2; ghi src => exit 0', () => {
  assert.equal(runHook(write('game-developer', '.claude/settings.json', 'Write')).status, 2);
  assert.equal(runHook(write('game-developer', 'src/combat/Foo.ts', 'Write')).status, 0);
});
