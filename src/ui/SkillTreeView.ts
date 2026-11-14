import Phaser from 'phaser';

import { BRANCHES, getSkillNode } from '../skills/tree/skillTreeData';
import type { SkillNodeId } from '../skills/tree/skillTreeTypes';
import type { WorldScene } from '../scenes/WorldScene';

const TEXT_COLOR = '#cfd2dd';
const MUTED = '#8b8fa3';
const GOLD = '#ffe066';
const GOOD = '#7dff9a';

const COLUMN_GAP = 12;
const ROW_HEIGHT = 52;
const ROW_GAP = 6;
/** Nhánh có hơn 5 node thì thu gọn hàng để vẫn vừa khung. */
const COMPACT_ROW_HEIGHT = 44;
const COMPACT_ROW_GAP = 4;
const HEADER_HEIGHT = 24;
const BUTTON_SIZE = 30;

/** Trạng thái giữ qua các lần vẽ lại (do panel sở hữu). */
export interface SkillTreeViewState {
  selected: SkillNodeId | null;
  message: string;
}

export interface SkillTreeBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

type PanelState = ReturnType<WorldScene['getSkillTreePanelState']>;
type PanelNode = PanelState['nodes'][number];

function makeButton(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  enabled: boolean,
  onClick: () => void,
): void {
  const box = scene.add
    .rectangle(x, y, width, height, enabled ? 0x24304a : 0x181b24)
    .setOrigin(0, 0)
    .setStrokeStyle(2, enabled ? 0x4da3ff : 0x2a2e3a);
  const text = scene.add
    .text(x + width / 2, y + height / 2, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: enabled ? '#ffffff' : '#55596b',
    })
    .setOrigin(0.5);

  parent.add([box, text]);

  if (enabled) {
    box.setInteractive({ useHandCursor: true });
    box.on('pointerdown', onClick);
  }
}

/**
 * Vẽ cây kỹ năng của nhân vật hiện tại vào `parent`.
 * Mọi thay đổi dữ liệu đi qua `world.learnSkillNode` / `world.respecSkills`;
 * sau mỗi thay đổi gọi `onChanged` để panel vẽ lại.
 */
export function buildSkillTreeView(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  world: WorldScene,
  bounds: SkillTreeBounds,
  state: SkillTreeViewState,
  onChanged: () => void,
  onBack: () => void,
): void {
  const tree: PanelState = world.getSkillTreePanelState();

  // Dòng tiêu đề: điểm + nút quay lại + hồi điểm.
  parent.add(
    scene.add.text(
      bounds.x,
      bounds.y,
      `ĐIỂM KỸ NĂNG: ${tree.available} / ${tree.earned}   ·   LV ${tree.level}`,
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: tree.available > 0 ? GOLD : MUTED,
      },
    ),
  );

  makeButton(
    scene,
    parent,
    bounds.x + bounds.width - 260,
    bounds.y - 6,
    120,
    26,
    '◂ BỘ KỸ NĂNG',
    true,
    onBack,
  );
  makeButton(
    scene,
    parent,
    bounds.x + bounds.width - 130,
    bounds.y - 6,
    130,
    26,
    'HỒI ĐIỂM',
    tree.freeRespec && tree.spent > 0,
    () => {
      state.message = world.respecSkills()
        ? 'Đã hồi toàn bộ điểm kỹ năng.'
        : 'Chỉ hồi điểm miễn phí tới LV10.';
      state.selected = null;
      onChanged();
    },
  );

  if (tree.nodes.length === 0) {
    parent.add(
      scene.add.text(
        bounds.x,
        bounds.y + 50,
        'Lớp này chưa có cây kỹ năng.\nKỹ năng của lớp mở khoá theo level ở mục BỘ KỸ NĂNG.',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: MUTED,
          lineSpacing: 6,
        },
      ),
    );

    return;
  }

  const branchIds = [
    ...new Set(tree.nodes.map((node) => node.branchId)),
  ].sort((a, b) => BRANCHES[a].index - BRANCHES[b].index);
  const columnWidth =
    (bounds.width - COLUMN_GAP * (branchIds.length - 1)) / branchIds.length;
  const top = bounds.y + 30;
  const maxRows = Math.max(
    5,
    ...branchIds.map(
      (id) => tree.nodes.filter((node) => node.branchId === id).length,
    ),
  );
  const compact = maxRows > 5;
  const rowHeight = compact ? COMPACT_ROW_HEIGHT : ROW_HEIGHT;
  const rowGap = compact ? COMPACT_ROW_GAP : ROW_GAP;

  branchIds.forEach((branchId, columnIndex) => {
    const columnX = bounds.x + columnIndex * (columnWidth + COLUMN_GAP);
    const branch = BRANCHES[branchId];
    const nodes = tree.nodes
      .filter((node) => node.branchId === branchId)
      .sort(
        (a, b) =>
          a.tier - b.tier ||
          (a.kind === b.kind ? 0 : a.kind === 'active' ? -1 : 1),
      );
    const branchPoints = nodes.reduce((sum, node) => sum + node.level, 0);

    parent.add(
      scene.add.text(columnX, top, `${branch.name.toUpperCase()}  (${branchPoints} đ)`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: GOLD,
      }),
    );

    nodes.forEach((node, rowIndex) => {
      drawNodeRow(
        scene,
        parent,
        world,
        tree,
        node,
        columnX,
        top + HEADER_HEIGHT + rowIndex * (rowHeight + rowGap),
        columnWidth,
        rowHeight,
        state,
        onChanged,
      );
    });
  });

  // Dòng thông tin: node đang chọn hoặc thông báo vừa rồi.
  const detailY =
    top + HEADER_HEIGHT + Math.max(5, maxRows) * (rowHeight + rowGap) + 4;
  const selected = state.selected
    ? tree.nodes.find((node) => node.id === state.selected) ?? null
    : null;
  let detail = state.message;

  if (selected) {
    const definition = getSkillNode(selected.id);
    const lock =
      !selected.unlocked && selected.reasons.length > 0
        ? `\nKHOÁ: ${selected.reasons.join(' · ')}`
        : '';

    const effect = selected.linkedSkillName
      ? `\nNÂNG CẤP: tăng sát thương/giảm hồi chiêu của ${selected.linkedSkillName}.`
      : selected.passiveActive
        ? '\nBỊ ĐỘNG: có hiệu ứng trong game (một phần mô tả có thể chưa áp dụng).'
        : '\nCHƯA CÓ HIỆU ỨNG TRONG GAME.';

    detail = `${definition.name} (cấp ${selected.level}/${selected.maxLevel}): ${definition.description}${effect}${lock}`;
  }

  parent.add(
    scene.add.text(bounds.x, detailY, detail, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: selected && !selected.unlocked ? '#ff8fa3' : TEXT_COLOR,
      wordWrap: { width: bounds.width },
      lineSpacing: 3,
    }),
  );
}

function drawNodeRow(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  world: WorldScene,
  tree: PanelState,
  node: PanelNode,
  x: number,
  y: number,
  width: number,
  rowHeight: number,
  state: SkillTreeViewState,
  onChanged: () => void,
): void {
  const maxed = node.level >= node.maxLevel;
  const canLearn = node.unlocked && !maxed && tree.available > 0;
  const isSelected = state.selected === node.id;
  const stroke = maxed
    ? 0xffe066
    : node.level > 0
      ? 0x4da3ff
      : node.unlocked
        ? 0x3f8f55
        : 0x2a2e3a;

  const row = scene.add
    .rectangle(x, y, width, rowHeight, isSelected ? 0x1d2230 : 0x141823, 0.98)
    .setOrigin(0, 0)
    .setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xffffff : stroke)
    .setInteractive({ useHandCursor: true });

  row.on('pointerdown', () => {
    state.selected = node.id;
    state.message = '';
    onChanged();
  });
  parent.add(row);

  parent.add(
    scene.add.text(x + 8, y + 6, node.name, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: node.unlocked || node.level > 0 ? TEXT_COLOR : '#55596b',
    }),
  );
  parent.add(
    scene.add.text(
      x + 8,
      y + 21,
      `T${node.tier} · ${node.kind === 'active' ? 'CHỦ ĐỘNG' : 'BỊ ĐỘNG'}`,
      {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: node.kind === 'active' ? MUTED : '#9d8cff',
      },
    ),
  );

  // Ô cấp: đầy theo số cấp đã học.
  for (let i = 0; i < node.maxLevel; i += 1) {
    parent.add(
      scene.add
        .rectangle(
          x + 8 + i * 12,
          y + 38,
          9,
          6,
          i < node.level ? (maxed ? 0xffe066 : 0x4da3ff) : 0x2a2e3a,
        )
        .setOrigin(0, 0),
    );
  }

  makeButton(
    scene,
    parent,
    x + width - BUTTON_SIZE - 6,
    y + (rowHeight - BUTTON_SIZE) / 2,
    BUTTON_SIZE,
    BUTTON_SIZE,
    maxed ? 'MAX' : '+',
    canLearn,
    () => {
      const result = world.learnSkillNode(node.id);

      state.selected = node.id;
      state.message = result.ok ? '' : result.reason;
      onChanged();
    },
  );

  if (node.level > 0 && !maxed) {
    parent.add(
      scene.add
        .text(x + width - BUTTON_SIZE - 12, y + 6, `${node.level}/${node.maxLevel}`, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: GOOD,
        })
        .setOrigin(1, 0),
    );
  }
}
