import { isHitBlockedByDomain } from '../combat/domainBarrier';
import Phaser from 'phaser';

import { BlasterWeapon } from '../combat/BlasterWeapon';
import { BowWeapon } from '../combat/BowWeapon';
import { DragonBowWeapon } from '../combat/DragonBowWeapon';
import { ExcaliburWeapon } from '../combat/ExcaliburWeapon';
import { DualBladesWeapon } from '../combat/DualBladesWeapon';
import { HammerWeapon } from '../combat/HammerWeapon';
import { ScytheWeapon } from '../combat/ScytheWeapon';
import { ShieldWeapon } from '../combat/ShieldWeapon';
import {
  StaffWeapon,
  WAND_WEAPON_CONFIG,
} from '../combat/StaffWeapon';
import { SwordWeapon } from '../combat/SwordWeapon';
import { VoidStaffWeapon } from '../combat/VoidStaffWeapon';
import type { Weapon, WeaponId } from '../combat/Weapon';
import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  isCharacterId,
  type CharacterDefinition,
  type CharacterId,
} from '../config/characters';
import {
  BLASTER_DAMAGE,
  BOSS_FIRST_DELAY_MS,
  BOSS_RESPAWN_MS,
  BOSS_SUMMON_MAX_MINIONS,
  GENERIC_DASH_ENABLED,
  BOSS_WARNING_MS,
  CHEST_INTERACT_RADIUS,
  CHEST_LIFETIME_MS,
  CHEST_LOOT_WEIGHTS,
  STEALTH_DETECT_RANGE,
  STEALTH_WANDER_MAX_MS,
  STEALTH_WANDER_MIN_MS,
  STEALTH_WANDER_RADIUS,
  VANISH_ENERGY_PER_SECOND,
  VANISH_LEVEL3_DRAIN_MULT,
  VANISH_REFRESH_MS,
  VANISH_SPEED_MULT,
  VANISH_STOP_COOLDOWN_MS,
  CHEST_OPEN_RADIUS,
  ENEMY_BULLET_DAMAGE,
  ENEMY_MAX_ALIVE,
  ENEMY_RESPAWN_MS,
  LEGENDARY_CHEST_DROP_CHANCE,
  LEGENDARY_CHEST_LIFETIME_MS,
  BEHIND_HIT_HALF_ANGLE_DEG,
  CRIT_BASE_DAMAGE_MULT,
  DUAL_GUARD_COOLDOWN_MS,
  DUAL_GUARD_DAMAGE_TAKEN,
  DUAL_GUARD_ENERGY_PER_SECOND,
  DUAL_GUARD_SPEED_FACTOR,
  DUAL_GUARD_TWO_HAND_SPEED_FACTOR,
  FORTRESS_COOLDOWN_MS,
  FORTRESS_ENERGY_PER_SECOND,
  MAX_ALIVE_CAP,
  MAX_BULLETS,
  MAX_ENEMY_BULLETS,
  MAX_LEGENDARY_CHESTS,
  MAX_WEAPON_CHESTS,
  MIN_RESPAWN_MS,
  RESPAWN_REDUCTION_PER_TIER,
  THREAT_ALIVE_BONUS,
  WEAPON_CHEST_DROP_CHANCE,
} from '../config/combatConfig';
import type { DamageType, ElementType } from '../config/damageTypeConfig';
import { effectiveResist, pureDamage } from '../combat/damage/resolveDamage';
import { ELEMENT_COLORS, ELEMENT_TYPES } from '../config/damageTypeConfig';
import {
  LeechLimiter,
  pickChainTargets,
} from '../combat/damage/elementEffects';
import {
  SCENE_KEYS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  CAMERA_FOLLOW_LERP_60FPS,
} from '../config/constants';
import {
  BOSS_GEM_COUNT,
  BOSS_GOLD_BASE,
  BOSS_GOLD_PER_NUMBER,
  GEM_DROP_CHANCE,
  GOLD_DROP_CHANCE,
  GOLD_DROP_MAX,
  GOLD_DROP_MIN,
  GOLD_PER_THREAT_TIER,
  MAX_DROPS_ALIVE,
  NPC_INTERACT_RADIUS,
  VILLAGE_REPEL_SPEED,
  VILLAGE_ZONE,
  isInsideVillage,
  type NpcRole,
} from '../config/economyConfig';
import {
  GEM_IDS,
  GEM_INFO,
  computeGemBonuses,
  createEmptyGemBonuses,
  type GemBonuses,
  type GemId,
} from '../config/gemConfig';
import { NEON, NEON_CSS } from '../config/palette';
import {
  applyGearBonuses,
  GEAR_INFO,
  GEAR_SLOT_LABELS,
  isGearId,
  type GearId,
  type GearSlot,
} from '../config/gearConfig';
import { gearLookKey, resolveGearLook } from '../config/gearLook';
import {
  type StatAllocation,
  type StatId,
} from '../config/statConfig';
import { WEAPON_INFO, isWeaponId } from '../config/weaponInfo';
import { BossEnemy, type BossSlam } from '../entities/BossEnemy';
import type {
  DamageDealtEvent,
  DotDamageEvent,
  HitModifierResult,
  StatusTuning,
} from '../entities/EnemyBase';
import {
  ATTACK_POWER_BASE,
  toDisplayDamage,
  toDisplayEnergy,
  toDisplayHealth,
} from '../config/scaleConfig';
import { DamageNumberManager } from '../vfx/DamageNumberManager';
import {
  DREAD_FEAR_MS,
  ICE_LANCE_CHILL,
  OVERHEAT_PENALTY_HEAT,
  OVERHEAT_SKILLS,
  PASSIVE_SCAN_MS,
  SHATTER_WARD,
  SPELL_ECHO_SKILLS,
  TOXIN,
} from '../config/treeSkillsConfig';
import { Enemy } from '../entities/Enemy';
import { LootDrop } from '../entities/LootDrop';
import type { Npc } from '../entities/Npc';
import { EnemyBase } from '../entities/EnemyBase';
import { Player } from '../entities/Player';
import { RangedEnemy } from '../entities/RangedEnemy';
import { WeaponChest } from '../entities/WeaponChest';
import { createPlaceholderPlayerSheet } from '../utils/placeholderPlayer';
import { progressStore } from '../progression/ProgressStore';
import type { CharacterSaveV8 } from '../progression/saveV8';
import { XP_PER_KILL } from '../progression/progressionConfig';
import {
  getSkill,
  type SkillContext,
  type SkillDefinition,
  type SkillId,
} from '../skills/skills';
import {
  getSkillCooldownMult,
  getSkillPower,
} from '../config/skillLevelConfig';
import { LIVE_SKILL_NODE, getLiveSkillForNode } from '../config/skillNodeMap';
import {
  computePassiveBundle,
  createEmptyPassiveBundle,
  getMissingHealthDamageMult,
  hasPassiveEffect,
  type PassiveBundle,
} from '../skills/tree/passiveEffects';
import { getClassSkillNodes } from '../skills/tree/skillTreeData';
import { FortressStand } from '../skills/fortressStand';
import {
  canRespecFree,
  getUnlockStatus,
} from '../skills/tree/skillTreeRules';
import type {
  BranchId,
  SkillKind,
  SkillNodeId,
  SkillTier,
} from '../skills/tree/skillTreeTypes';
import { InputController } from '../systems/InputController';
import { CorpseManager } from '../systems/CorpseManager';
import { MinionManager } from '../systems/MinionManager';
import { PlayerState } from '../systems/PlayerState';
import { VillageService, type VillageHost } from '../systems/VillageService';
import {
  NEC_COLOR,
  SOUL_SIPHON,
} from '../config/necromancerConfig';
import { Hud, type SkillStatus } from '../ui/Hud';
import { PlayerBars } from '../ui/PlayerBars';
import { TouchControls } from '../ui/TouchControls';
import { findNearestEnemy, findStickyTarget, selectTarget } from '../combat/targeting';
import { AimIndicator } from '../ui/combat/AimIndicator';
import type { SkillCastRequest } from '../input/SkillAimingController';
import { isTouchDevice } from '../utils/device';
import { isPerfOverlayEnabled, PerfOverlay } from '../utils/perfOverlay';
import { createDayNightToggle } from '../ui/DayNightToggle';
import { createAtmosphere } from '../vfx/atmosphere';
import { buildTown, type TownInfo } from '../world/town';
import type { ScenePortal } from '../world/portal';
import {
  decideBossAction,
  getPortalChargeProgress,
  isPortalDenyToastWorthy,
  type PortalDenyReason,
} from '../world/bossArenaRules';
import {
  MAP_STARTING_LANDS,
  REGION_TRACKER,
  WORLD,
} from '../config/worldConfig';
import {
  DEFAULT_MELEE_ARCHETYPE,
  DEFAULT_RANGED_ARCHETYPE,
  ELITE_AFFIXES,
  ELITE_ESCORT_ARCHETYPE,
  ELITE_ESCORT_RADIUS,
  ELITE_GEM_COUNT,
  ELITE_KILL_LABEL,
  ELITE_SPAWN_MIN_PLAYER_DISTANCE,
  ENEMY_ARCHETYPES,
  type ArchetypeId,
} from '../config/enemyConfig';
import { ELITE_VISUAL } from '../config/enemyVisualConfig';
import { EliteMarker } from '../entities/EliteMarker';
import { killXp, meleeStats } from '../systems/enemyStats';
import {
  eliteArchetype,
  escortOffsets,
  pickEliteAffix,
  pickEliteSpawnPoint,
  shouldSpawnElite,
} from '../world/eliteRules';
import { pickArchetype, pickStaggeredArchetype } from '../world/spawnPattern';
import { RegionBanner } from '../ui/RegionBanner';
import { createRegionTracker, type RegionTracker } from '../world/regionTracker';
import {
  effectiveThreatTier,
  evaluateConnection,
  findConnection,
  findMap,
  regionAt,
  timeThreatTier,
  type ConnectionDef,
  type MapDef,
  type MapId,
  type WorldFacts,
} from '../world/worldGraph';
import {
  BOSS_ARENA_ENTRY_SPAWN_DELAY_MS,
  BOSS_ARENA_FADE_TO_ARENA,
  BOSS_ARENA_FADE_TO_WORLD,
  BOSS_ARENA_PORTAL_CHARGE_MS,
  BOSS_ARENA_PORTAL_COOLDOWN_MS,
  BOSS_ARENA_PORTAL_EXTRA_INVULNERABLE_MS,
  BOSS_ARENA_PORTAL_FADE_MS,
  BOSS_ARENA_PORTAL_INTERACT_RADIUS,
  BOSS_ARENA_PORTAL_TOAST_COOLDOWN_MS,
} from '../config/bossArenaConfig';
import {
  RUN_SESSION_REGISTRY_KEY,
  applyRunSessionToPlayer,
  captureRunSession,
  extractRunSceneState,
  isRestorable,
  type RunSession,
} from '../progression/RunSession';
import {
  spawnAfterimage,
  spawnBurst,
  spawnGlow,
  spawnHitSpark,
  spawnRing,
} from '../utils/effects';

const WALL_THICKNESS = TILE_SIZE;

/** Cờ dữ liệu (`setData`) đánh dấu một quái là Elite (M3); `getEnemies()` lọc theo cờ này để đếm Elite đang sống. */
const ELITE_DATA_KEY = 'elite';

/** Tầm (px) ngọc Phản Đòn tìm kẻ địch để phản sát thương. */
const THORNS_RANGE = 170;

/** Kỹ năng đổi vị trí người chơi: bị chặn khi Bất Động Thành Lũy đang chạy (kèm kẹp vị trí ở POST_UPDATE). */
const FORTRESS_BLOCKED_SKILLS: ReadonlySet<string> = new Set([
  'shield_bash',
  'ground_slam',
  'evasive_roll',
  'blink',
  'shadow_step',
  'grapple_chain',
  'sword_tempest',
]);

const SPECIAL_WEAPON_IDS = [
  'bow',
  'scythe',
  'staff',
  'dual_blades',
  'hammer',
] as const;
const LEGENDARY_WEAPON_IDS = [
  'excalibur',
  'dragon_bow',
  'void_staff',
] as const;

const COMMON_GEAR_IDS = [
  'cloth_hood',
  'cloth_robe',
  'worn_boots',
] as const;
const SPECIAL_GEAR_IDS = [
  'iron_helm',
  'iron_cuirass',
  'swift_greaves',
] as const;
const LEGENDARY_GEAR_IDS = [
  'dragon_crown',
  'dragon_plate',
  'void_treads',
] as const;

type LootId = WeaponId | GearId;

const NORMAL_LOOT_IDS: readonly LootId[] = [
  ...SPECIAL_WEAPON_IDS,
  ...COMMON_GEAR_IDS,
  ...SPECIAL_GEAR_IDS,
];
const LEGENDARY_LOOT_IDS: readonly LootId[] = [
  ...LEGENDARY_WEAPON_IDS,
  ...LEGENDARY_GEAR_IDS,
];
/** Boss luôn rơi gear tốt; cấp món đồ tăng theo số thứ tự boss. */
const BOSS_LOOT_GEAR_IDS: readonly GearId[] = [
  ...SPECIAL_GEAR_IDS,
  ...LEGENDARY_GEAR_IDS,
];

function getLootName(id: LootId): string {
  return isWeaponId(id) ? WEAPON_INFO[id].name : GEAR_INFO[id].name;
}

function getLootTexture(id: LootId): string {
  return isWeaponId(id)
    ? WEAPON_INFO[id].textureKey
    : GEAR_INFO[id].textureKey;
}

/** Combat sandbox chính: map, 2 loại quái, vũ khí, kỹ năng, HUD. */
/** Tầm tự ngắm (px) trên cảm ứng. */
const AUTO_AIM_RANGE = 480;

export class WorldScene extends Phaser.Scene {
  protected player!: Player;
  private inputController!: InputController;
  private touchControls: TouchControls | null = null;
  private aimIndicator: AimIndicator | null = null;
  private deathAt = 0;
  private corpses!: CorpseManager;
  private minions!: MinionManager;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private weapons: (Weapon | null)[] = [];
  private activeWeaponIndex = 0;
  /** Song Thủ Khiên đang bật (kỹ năng bật/tắt, tiêu EN liên tục). */
  private dualGuardActive = false;
  /** Tàng Hình đang bật (không giới hạn thời gian, tiêu EN mỗi giây). */
  private vanishActive = false;
  /** Điểm lang thang của từng quái khi người chơi đang tàng hình và chưa bị phát hiện. */
  private readonly stealthWander = new WeakMap<
    EnemyBase,
    { x: number; y: number; until: number }
  >();
  /** Bất Động Thành Lũy đang chạy (null = không). */
  private fortress: FortressStand | null = null;
  private hud!: Hud;
  private damageNumbers!: DamageNumberManager;
  private playerBars!: PlayerBars;
  private spawnIndex = 0;
  /** M2: số lần đã sinh quái theo vùng (id vùng → đếm), dùng chọn archetype lệch pha với điểm sinh. */
  private readonly regionSpawnCounts = new Map<string, number>();
  /** M2: số điểm sinh của từng vùng (tính một lần mỗi lượt chơi). */
  private readonly regionSpawnPoints = new Map<string, number>();
  /** M3: số quái thường đã hạ theo vùng của VỊ TRÍ CHẾT kể từ lần Elite gần nhất của vùng (id vùng → đếm). Chỉ trong bộ nhớ. */
  private readonly regionKillCounts = new Map<string, number>();
  /** M3: số Elite đã sinh trong lượt này (chọn affix xoay vòng và archetype nền theo chỉ số này). */
  private elitesSpawned = 0;
  /** M3: thời điểm (`time.now`) Elite xuất hiện gần nhất; null = chưa có. */
  private lastEliteAt: number | null = null;
  /** Mục tiêu auto-aim đang khoá khi cầm Kiếm (xem `updateAutoAim`). */
  private autoAimTarget: EnemyBase | null = null;
  /** Chủ duy nhất của kho đồ, trang bị, cấp đồ (C2a/C2b) và tiến trình: cấp, điểm chỉ số, cây/ô kỹ năng (C3). */
  private playerState!: PlayerState;
  private heroLookKey = '';
  private panelOpen = false;
  /** Vàng, ngọc, lỗ ngọc và giao dịch ở làng. */
  private village!: VillageService;
  private drops: LootDrop[] = [];
  private gemBonuses: GemBonuses = createEmptyGemBonuses();
  private lifestealCarry = 0;
  private readonly darkLeech = new LeechLimiter();
  private nextGemEnergyAt = 0;
  private insideVillage = false;
  /** Biển tên vùng (W3): chỉ có ở map overworld; null ở Arena. */
  private regionBanner: RegionBanner | null = null;
  private regionTracker: RegionTracker | null = null;
  private lootDirty = false;
  private lastNoCombatToastAt = 0;
  private lastLootSaveAt = 0;

  protected boss: BossEnemy | null = null;
  protected bossNumber = 0;
  protected nextBossAt = 0;
  private bossWarningShown = false;
  /** Hết giờ ở map chính: Boss đang chờ ở Đấu Trường (chỉ BossArenaScene mới sinh Boss). */
  protected bossReady = false;
  /** Thời điểm tuyệt đối vào Đấu Trường (null ở map chính). */
  protected arenaEntryAt: number | null = null;
  private portalCooldownUntil = 0;
  private portalChargeStartedAt: number | null = null;
  private portalTraveling = false;
  /** Đã báo lỗi cầu nối save v8 trong lần vào scene này (reset ở create). */
  private saveBridgeFailureToasted = false;
  private lastPortalToastAt = 0;

  private nextAfterimageAt = 0;
  private chests: WeaponChest[] = [];
  private attackWasDown = false;
  protected obstacles!: Phaser.Physics.Arcade.StaticGroup;
  protected town!: TownInfo;

  protected characterId: CharacterId = DEFAULT_CHARACTER_ID;
  private character!: CharacterDefinition;
  private allSkills: SkillDefinition[] = [];
  /** 7 ô: 0–2 ô chính (luôn có skill), 3–6 ô phụ (có thể trống). */
  private skills: (SkillDefinition | null)[] = [];
  /** Thời điểm hết hồi chiêu theo từng kỹ năng, nên đổi ô không reset hồi chiêu. */
  private skillCooldownUntil: Partial<Record<SkillId, number>> = {};
  private passives: PassiveBundle = createEmptyPassiveBundle();
  private missingHealthMult = 1;
  private nextHitEnergyAt = 0;
  /** Dùng chung một tham chiếu cho mọi quái; cập nhật khi passive đổi. */
  private readonly statusTuning: StatusTuning = {
    burnMult: 1,
    poisonMult: 1,
    chillExtraMs: 0,
  };
  private heat = 0;
  private heatLastGainAt = 0;
  private echoReadyAt = 0;
  private shatterReadyAt = 0;
  private nextPassiveScanAt = 0;
  private bloodFreeReadyAt = 0;
  private nextSlashWaveAt = 0;
  private readonly lastAim = new Phaser.Math.Vector2(1, 0);
  private chilledNearby = 0;
  private readonly fearReadyAt = new WeakMap<EnemyBase, number>();
  private nextMomentumAt = 0;

  private runStartedAt = 0;
  private nextSpawnAt = 0;

  constructor(key: string = SCENE_KEYS.world) {
    super(key);
  }

  // ---- Điểm ghi đè cho BossArenaScene (mặc định = map chính) ----

  /** true ở BossArenaScene: chỉ ở đó Boss mới được sinh. */
  protected get inBossArena(): boolean {
    return false;
  }

  /** Id map (dữ liệu `config/worldConfig.ts`) mà scene này hiển thị; scene con ghi đè. */
  protected getMapId(): MapId {
    return MAP_STARTING_LANDS;
  }

  /** MapDef của scene hiện tại (dữ liệu hợp lệ đã được test khóa; thiếu = lỗi lập trình). */
  protected getMapDef(): MapDef {
    const map = findMap(WORLD, this.getMapId());

    if (map === null) {
      throw new Error(`Không tìm thấy map trong WORLD: ${this.getMapId()}`);
    }

    return map;
  }

  private getPortalConnection(portal: ScenePortal): ConnectionDef {
    const connection = findConnection(WORLD, portal.connectionId);

    if (connection === null) {
      throw new Error(`Không tìm thấy connection trong WORLD: ${portal.connectionId}`);
    }

    return connection;
  }

  /** Dựng bản đồ và trả thông tin điểm sinh/NPC/cổng. */
  protected buildMap(): TownInfo {
    return buildTown(this, this.obstacles);
  }

  /** Khung thế giới vật lý (trước khi trừ tường biên). */
  protected getWorldBounds(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT };
  }

  protected getCameraBounds(): { x: number; y: number; width: number; height: number } {
    return this.getWorldBounds();
  }

  /** Ánh sáng/không khí của map (map chính: chu kỳ ngày/đêm). */
  protected createLighting(): void {
    createAtmosphere(this, this.player);
  }

  /** Nút/phím đổi ngày-đêm (Arena không có). */
  protected createDayNightControl(): void {
    createDayNightToggle(this);
  }

  /** Điểm có thuộc khu an toàn (làng) không. Arena luôn false. */
  protected isSafeZonePoint(x: number, y: number): boolean {
    return isInsideVillage(x, y);
  }

  /** Số quái sinh sẵn lúc vào scene. */
  protected getInitialEnemyCount(): number {
    return ENEMY_MAX_ALIVE;
  }

  /** Luật cho phép sinh quái ở frame này. */
  protected canSpawnEnemies(_time: number): boolean {
    return this.boss === null;
  }

  protected getMaxAliveEnemies(tier: number): number {
    return Math.min(MAX_ALIVE_CAP, ENEMY_MAX_ALIVE + tier * THREAT_ALIVE_BONUS);
  }

  /** Chơi lại sau khi chết. */
  protected restartRun(): void {
    this.scene.restart();
  }

  /** Xóa phiên đang chờ khôi phục (chết/lượt mới). */
  protected clearRunSession(): void {
    this.registry.set(RUN_SESSION_REGISTRY_KEY, null);
  }

  /**
   * Instance scene được DÙNG LẠI qua scene.start/restart nên mọi trường runtime không được create() nạp lại
   * phải được đặt về mặc định ở đây (cờ skill bật/tắt, mốc ICD passive, nhiệt, cache mục tiêu...).
   */
  private resetInstanceRuntimeState(): void {
    this.dualGuardActive = false;
    this.vanishActive = false;
    this.fortress = null;
    this.heat = 0;
    this.heatLastGainAt = 0;
    this.echoReadyAt = 0;
    this.shatterReadyAt = 0;
    this.nextPassiveScanAt = 0;
    this.bloodFreeReadyAt = 0;
    this.nextSlashWaveAt = 0;
    this.chilledNearby = 0;
    this.nextMomentumAt = 0;
    this.nextHitEnergyAt = 0;
    this.nextGemEnergyAt = 0;
    this.autoAimTarget = null;
    this.lastNoCombatToastAt = 0;
    this.lastLootSaveAt = 0;
    this.activeWeaponIndex = 0;
    this.weaponTime = 0;
    this.missingHealthMult = 1;
    this.enemyCache = [];
    this.enemyCacheFrame = -1;
  }

  /**
   * Tắt trạng thái skill đang bật TRƯỚC khi qua cổng, im lặng như khi người chơi chết
   * (không toast, không đặt hồi chiêu); Thành Lũy kết thúc như lúc scene shutdown.
   */
  private endSkillStatesForTravel(): void {
    this.vanishActive = false;
    this.dualGuardActive = false;
    this.applyDualGuardState();
    this.player.breakStealth();
    this.fortress?.end(false);
    this.fortress = null;
    this.player.setImmobilized(false);
  }

  /** Lấy (và hủy) phiên do scene trước chụp khi qua cổng; null = lượt mới. */
  private takeRunSession(): RunSession | null {
    const session = this.registry.get(RUN_SESSION_REGISTRY_KEY) as
      | RunSession
      | null
      | undefined;

    this.clearRunSession();

    return isRestorable(session) ? session : null;
  }

  init(data?: { characterId?: string }): void {
    if (data?.characterId && isCharacterId(data.characterId)) {
      this.characterId = data.characterId;
    }
  }

  create(): void {
    this.spawnIndex = 0;
    this.regionSpawnCounts.clear();
    this.regionSpawnPoints.clear();
    this.regionKillCounts.clear();
    this.elitesSpawned = 0;
    this.lastEliteAt = null;
    this.nextAfterimageAt = 0;
    this.attackWasDown = false;
    this.chests = [];
    this.drops = [];
    this.lifestealCarry = 0;
    this.insideVillage = false;
    this.lootDirty = false;
    this.resetInstanceRuntimeState();
    this.skillCooldownUntil = {};
    // Skill có thể xin làm mới hồi chiêu của chính nó sau khi WorldScene đã đặt hồi chiêu.
    this.events.off('skill-cooldown-reset');
    this.events.on('skill-cooldown-reset', (id: SkillId) => {
      this.skillCooldownUntil[id] = 0;
    });
    // Giảm thời gian hồi chiêu CÒN LẠI của skill đi một tỉ lệ (0.7 = giảm 70%).
    this.events.off('skill-cooldown-reduce');
    this.events.on('skill-cooldown-reduce', (id: SkillId, fraction: number) => {
      const now = this.time.now;
      const until = this.skillCooldownUntil[id] ?? 0;

      if (until > now) {
        this.skillCooldownUntil[id] = now + (until - now) * (1 - fraction);
      }
    });
    this.panelOpen = false;
    this.deathAt = 0;
    this.boss = null;
    this.bossNumber = 0;
    this.bossWarningShown = false;
    this.character = CHARACTERS[this.characterId];
    this.allSkills = [
      ...this.character.skills,
      ...this.character.treeSkills,
    ].map((id) => getSkill(id));
    // `this.time.now` chỉ cập nhật trong update() nên trong create() còn là giá trị cũ (có thể cách cả phút
    // khi scene vừa ngủ lâu); dùng đồng hồ tuyệt đối của game loop cho mọi mốc đặt ở đây.
    const startNow = this.game.loop.time;
    const restored = this.takeRunSession();

    this.bossReady = false;
    this.arenaEntryAt = this.inBossArena ? startNow : null;
    this.portalTraveling = false;
    this.portalChargeStartedAt = null;
    this.portalCooldownUntil = 0;
    this.lastPortalToastAt = 0;
    this.runStartedAt = startNow;
    this.nextSpawnAt = startNow + 1000;
    this.nextBossAt = startNow + BOSS_FIRST_DELAY_MS;

    if (restored) {
      const carried = extractRunSceneState(restored);

      this.skillCooldownUntil = carried.skillCooldownUntil as Partial<
        Record<SkillId, number>
      >;
      this.runStartedAt = carried.runStartedAt;
      this.nextBossAt = carried.nextBossAt;
      this.bossNumber = carried.bossNumber;
      this.bossReady = carried.bossReady;
      this.bossWarningShown = carried.bossWarningShown;
      this.portalCooldownUntil = startNow + BOSS_ARENA_PORTAL_COOLDOWN_MS;

      const fade = this.inBossArena
        ? BOSS_ARENA_FADE_TO_ARENA
        : BOSS_ARENA_FADE_TO_WORLD;

      this.cameras.main.fadeIn(BOSS_ARENA_PORTAL_FADE_MS, fade.r, fade.g, fade.b);
    }

    this.cameras.main.setBackgroundColor('#0b0b12');

    this.obstacles = this.physics.add.staticGroup();
    this.town = this.buildMap();

    const worldBounds = this.getWorldBounds();

    this.physics.world.setBounds(
      worldBounds.x + WALL_THICKNESS,
      worldBounds.y + WALL_THICKNESS,
      worldBounds.width - WALL_THICKNESS * 2,
      worldBounds.height - WALL_THICKNESS * 2,
    );

    this.player = new Player(
      this,
      this.town.playerSpawn.x,
      this.town.playerSpawn.y,
      {
        textureKey: this.character.textureKey,
        animPrefix: this.character.animPrefix,
        baseHealth: this.character.baseHealth,
        baseArmor: this.character.baseArmor,
        baseEnergy: this.character.baseEnergy,
        speedMultiplier: this.character.speedMultiplier,
        damageMultiplier: this.character.damageMultiplier,
      },
    );
    if (this.character.dashCharges) {
      this.player.configureDashCharges(
        this.character.dashCharges.max,
        this.character.dashCharges.rechargeMs,
      );
    }

    // Sau buildTown (đã đăng ký các nguồn sáng) và sau khi có người chơi (tầm nhìn ban đêm đi theo người).
    this.createLighting();

    this.touchControls = isTouchDevice() ? new TouchControls(this, this.characterId) : null;
    this.aimIndicator = this.touchControls ? new AimIndicator(this) : null;
    this.inputController = new InputController(this, this.touchControls);
    this.corpses = new CorpseManager(this);
    this.minions = new MinionManager(this);
    // Vũ khí bám tay phải cập nhật SAU khi vật lý đồng bộ vị trí player (POST_UPDATE),
    // nếu không vũ khí luôn chậm một frame so với thân khi chạy.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateWeaponsAfterPhysics, this);
    if (isPerfOverlayEnabled()) {
      new PerfOverlay(this);
    }
    // Hủy đăng ký lỗi lưu trữ khi scene tắt (đăng ký sau khi hud được tạo, bên dưới).
    let unsubscribeProgressError: (() => void) | null = null;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateWeaponsAfterPhysics, this);
      unsubscribeProgressError?.();
      unsubscribeProgressError = null;
      this.fortress?.end(false);
      this.fortress = null;
      this.inputController.destroy();
      this.corpses.destroy();
      this.minions.clear();
      this.regionBanner?.destroy();
      this.regionBanner = null;
      this.regionTracker = null;
    });

    // Một nguồn lưu (C4): đọc thẳng save v8; PlayerState nạp kho đồ (lọc vũ khí ngoài lớp,
    // vũ khí khởi đầu, chọn lại hai ô) và tiến trình.
    const save = progressStore.get(this.characterId);

    this.playerState = PlayerState.fromSave(
      save,
      {
        allowedWeapons: this.character.allowedWeapons,
        startingWeapons: this.character.startingWeapons,
        startingGear: this.character.startingGear,
        skills: Object.fromEntries(
          this.allSkills.map((skill) => [
            skill.id,
            {
              unlockLevel: skill.unlockLevel,
              requiresNode: skill.requiresNode,
            },
          ]),
        ),
      },
    );
    this.village = new VillageService(this.createVillageHost(), {
      gold: save.gold,
      gems: { ...save.gems },
      sockets: this.playerState.getLoadedSockets(),
    });
    this.player.onHurt = () => this.reflectThorns();
    this.damageNumbers = new DamageNumberManager(this);
    this.player.onDamageTaken = (type, amount) =>
      this.damageNumbers.spawnPlayerHit(
        this.player,
        this.player.x,
        this.player.y - 34,
        type,
        toDisplayHealth(amount),
      );
    this.passives = computePassiveBundle(
      this.characterId,
      this.playerState.getSkillLevels(),
    );
    this.rebuildSkills();
    this.applyPlayerStatistics();

    // Sau khi chỉ số/trang bị đã áp (để kẹp theo tối đa đúng): trả lại HP, giáp, EN, lượt dash đã chụp.
    if (restored) {
      applyRunSessionToPlayer(restored, this.player);
    }

    this.physics.add.collider(this.player, this.obstacles);

    const cameraBounds = this.getCameraBounds();

    this.cameras.main.setBounds(
      cameraBounds.x,
      cameraBounds.y,
      cameraBounds.width,
      cameraBounds.height,
    );
    this.cameras.main.startFollow(this.player, true, CAMERA_FOLLOW_LERP_60FPS, CAMERA_FOLLOW_LERP_60FPS);

    this.createCombat();

    this.hud = new Hud(this, () => this.openCharacterPanel('stats'), {
      onCast: (slot) => this.inputController.requestSkill(slot),
      getOptions: () =>
        this.getSkillsPanelState().skills.filter((skill) => skill.unlocked),
      onAssign: (skillId, slot) => {
        this.assignSkillToSlot(skillId, slot);
      },
    });

    // Lỗi lưu trữ kiểu khóa (conflict/readonly) của nhân vật đang chơi: báo một lần mỗi lần vào scene.
    let progressErrorToasted = false;

    this.saveBridgeFailureToasted = false;

    const toastProgressLocked = (): void => {
      if (progressErrorToasted) {
        return;
      }

      progressErrorToasted = true;
      this.hud?.showToast(
        progressStore.getLockReason(this.characterId) === 'conflict'
          ? 'DỮ LIỆU ĐÃ THAY ĐỔI Ở NƠI KHÁC — TIẾN TRÌNH KHÔNG ĐƯỢC LƯU. HÃY TẢI LẠI TRANG'
          : 'TIẾN TRÌNH KHÔNG ĐƯỢC LƯU. HÃY TẢI LẠI TRANG',
        '#ff8fa3',
      );
    };

    unsubscribeProgressError = progressStore.onError((_message, id, reason) => {
      if (
        id !== this.characterId ||
        (reason !== 'conflict' && reason !== 'readonly')
      ) {
        return;
      }

      toastProgressLocked();
    });

    // Nhân vật đã bị khóa từ trước (lỗi đã phát khi scene khác/chưa có): vẫn báo khi vào scene.
    if (progressStore.isLocked(this.characterId)) {
      toastProgressLocked();
    }

    this.hud.setGold(this.village.getGold());
    this.createDayNightControl();
    this.playerBars = new PlayerBars(this);

    // Biển tên vùng (W3): chỉ ở map overworld (Arena không có biển).
    if (this.getMapDef().kind === 'overworld') {
      this.regionBanner = new RegionBanner(this);
      this.regionTracker = createRegionTracker(REGION_TRACKER);
    } else {
      this.regionBanner = null;
      this.regionTracker = null;
    }

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.panelOpen = false;
    });

    // Tab mở menu nhân vật. C/I vẫn mở nhanh tab tương ứng.
    this.input.keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.openCharacterPanel('stats');
      }
    });
    this.input.keyboard?.on('keydown-C', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.openCharacterPanel('stats');
      }
    });
    this.input.keyboard?.on('keydown-I', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.openCharacterPanel('inventory');
      }
    });
    this.input.keyboard?.on('keydown-K', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.openCharacterPanel('skills');
      }
    });
    this.input.keyboard?.on('keydown-E', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.openCharacterPanel('equipment');
      }
    });

    // Cảm ứng: chạm màn hình khi đã chết để chơi lại (chờ 800ms tránh bấm nhầm).
    if (this.touchControls) {
      this.input.on('pointerdown', () => {
        if (this.player.isDead() && this.time.now - this.deathAt > 800) {
          this.restartRun();
        }
      });
    }

    // Sự kiện keydown đảm bảo một cú bấm R rất nhanh vẫn được xử lý.
    this.input.keyboard?.on('keydown-R', (event: KeyboardEvent) => {
      if (!event.repeat && this.player.isDead()) {
        this.restartRun();
      }
    });
  }

  private readonly weaponAim = new Phaser.Math.Vector2(1, 0);
  private weaponTime = 0;

  /** Chạy sau world.postUpdate: player.x/y đã là vị trí sẽ vẽ, nên tay/vũ khí khớp thân. */
  private updateWeaponsAfterPhysics(): void {
    const weapon = this.weapons[this.activeWeaponIndex] ?? null;

    weapon?.update(this.weaponTime, this.weaponAim);

    // Bất Động Thành Lũy: kẹp người chơi tại chỗ sau mọi dash/teleport/đẩy.
    this.fortress?.lockPosition();

    // Song Thủ: khiên cầm phụ vẫn cần cập nhật vị trí dù không phải vũ khí chính.
    if (this.dualGuardActive) {
      for (const other of this.weapons) {
        if (other instanceof ShieldWeapon && other !== weapon) {
          other.update(this.weaponTime, this.weaponAim);
        }
      }
    }
  }

  update(time: number, delta: number): void {
    // Lerp camera theo thời gian thực: tương đương 0.12/frame ở 60 FPS nhưng
    // không đổi cảm giác theo tần số quét (Camera.preRender đọc lerp này sau postUpdate).
    const cameraLerp = 1 - Math.pow(1 - CAMERA_FOLLOW_LERP_60FPS, delta / (1000 / 60));

    this.cameras.main.setLerp(cameraLerp, cameraLerp);
    this.corpses.update(time);
    this.damageNumbers.update(time);
    this.updateMissingHealthBonus();
    this.updatePassiveAuras(time);
    this.minions.update(
      time,
      this.player,
      this.getEnemies(),
      this.player.getStats().damageMultiplier,
    );
    this.updateAutoAim();

    if (this.player.isDead() && this.deathAt === 0) {
      this.deathAt = time;
      this.saveProgress();
    }

    const moveDirection = this.inputController.getDirection();
    const aim = this.inputController.getAimDirection(
      this.player.x,
      this.player.y,
    );

    if (aim.lengthSq() > 0) {
      this.lastAim.copy(aim).normalize();
    }

    // Luôn tiêu thụ yêu cầu để không tồn đọng; Dash chung chỉ chạy khi bật cờ rollback.
    if (
      this.inputController.consumeDashRequest() &&
      GENERIC_DASH_ENABLED &&
      !this.player.isDead()
    ) {
      const dashDirection =
        moveDirection.lengthSq() > 0
          ? moveDirection.clone()
          : aim.clone();

      if (this.player.tryDash(dashDirection, time)) {
        spawnBurst(this, this.player.x, this.player.y, NEON.dash, 8, 90);
      }
    }

    if (this.player.isDashing(time)) {
      this.player.updateDash(time);
      this.spawnDashTrail(time);
    } else {
      this.player.move(moveDirection);
    }

    this.player.updateCombat(time, delta);

    this.player.updateAnimation(time, aim, moveDirection);

    const weapon = this.weapons[this.activeWeaponIndex] ?? null;

    // Vị trí vũ khí cập nhật ở POST_UPDATE (updateWeaponsAfterPhysics); ở đây chỉ lưu aim.
    // Đang nhảy Đập Đất: vũ khí theo hướng do kỹ năng ép (giơ lên / chĩa xuống).
    this.weaponAim.copy(this.player.getWeaponAimOverride() ?? aim);
    this.weaponTime = time;

    // Trong làng không được chiến đấu; vẫn đọc input để nút đánh còn dùng làm nút tương tác NPC.
    const inVillage = this.isSafeZonePoint(this.player.x, this.player.y);
    const attackInput = this.inputController.isAttackDown();
    const attackDown =
      !this.player.isDead() &&
      !inVillage &&
      !this.player.isLeaping() &&
      attackInput;

    if (weapon && attackDown) {
      if (weapon.tryAttack(time, aim)) {
        this.player.breakStealth();
        this.player.playAttack(time, aim);
      }
    } else if (weapon && this.attackWasDown && !this.player.isDead()) {
      if (attackInput && weapon.cancelAttack) {
        // Nút bị KHÓA (vào làng/đang nhảy) chứ không phải thả thật: hủy sạch, không ra đòn.
        weapon.cancelAttack();
      } else {
        const released = weapon.releaseAttack?.(time, aim) ?? false;

        if (released) {
          this.player.breakStealth();
          this.player.playAttack(time, aim);
        }
      }
    }

    this.attackWasDown = attackDown;

    this.updateDualGuard(delta, inVillage);
    this.updateVanish(delta, inVillage, time);
    this.updateFortress(delta, inVillage);

    const skillRequest = this.inputController.consumeSkillRequest();

    if (skillRequest !== null && !this.portalTraveling) {
      if (inVillage) {
        if (time - this.lastNoCombatToastAt > 1500) {
          this.lastNoCombatToastAt = time;
          this.hud.showToast('KHÔNG THỂ CHIẾN ĐẤU TRONG LÀNG', NEON_CSS.rose);
        }
      } else {
        this.tryCastSkill(skillRequest, time, aim, moveDirection);
      }
    }

    const switchRequest = this.inputController.getWeaponSwitch();

    if (switchRequest !== null) {
      if (switchRequest === 'cycle') {
        const otherIndex = 1 - this.activeWeaponIndex;

        if (this.weapons[otherIndex]) {
          this.activateWeapon(otherIndex);
        }
      } else if (this.weapons[switchRequest]) {
        this.activateWeapon(switchRequest);
      }
    }

    // Đồng hồ Boss chạy toàn cục (kể cả trong làng): map chính chỉ đánh dấu "Boss chờ ở Đấu Trường".
    this.updateBoss(time);
    this.updateRegionBanner(time);

    if (!this.player.isDead()) {
      const stealthed = this.player.isStealthed(time);

      for (const enemy of this.getEnemies()) {
        // Người chơi trong làng: quái bên ngoài đứng yên, không săn đuổi.
        if (inVillage) {
          enemy.setVelocity(0, 0);
        } else {
          enemy.updateAI(
            stealthed
              ? this.getStealthTarget(enemy, time)
              : this.minions.getAggroTarget(enemy, this.player),
            time,
          );
        }
      }
    }

    if (!inVillage) {
      for (const weapon of this.weapons) {
        weapon?.applyField?.(this.getEnemies(), time);
      }

      this.updateEnemySpawning(time);
    }

    this.updateChests();
    this.updateLootDrops(time, delta);
    this.updateVillage();
    this.updatePortalVisual(time);

    const skillStatus: SkillStatus = {
      dashRemainingMs: this.player.getDashCooldownRemaining(time),
      skills: this.skills.map((skill, index) => {
        if (!skill) {
          return {
            keyLabel: `${index + 3}`,
            icon: '+',
            name: 'TRỐNG',
            color: '#55596b',
            colorValue: 0x55596b,
            unlockLevel: 1,
            cooldownMs: 0,
            remainingMs: 0,
            locked: true,
            lockLabel: '+',
            empty: true,
          };
        }

        const gapMs = Math.max(
          0,
          (this.skillCooldownUntil[skill.id] ?? 0) - time,
        );
        const charges = skill.usesDashCharges
          ? this.player.getDashCharges(time)
          : -1;

        return {
          keyLabel: `${index + 3}`,
          // Kỹ năng tích lượt hiện số lượt còn lại ngay trên ô.
          icon: charges >= 0 ? `${skill.icon}${charges}` : skill.icon,
          control: skill.control,
          name: skill.name,
          color: skill.colorCss,
          colorValue: skill.color,
          unlockLevel: skill.unlockLevel,
          cooldownMs: this.getEffectiveCooldown(skill),
          remainingMs: Math.max(
            gapMs,
            charges === 0 ? this.player.getNextDashChargeIn(time) : 0,
          ),
          locked: !this.isSkillUsable(skill),
          lockLabel: this.getSkillLockLabel(skill),
        };
      }),
    };

    this.touchControls?.updateDash(skillStatus.dashRemainingMs);
    this.touchControls?.updateSkills(skillStatus.skills);
    this.aimIndicator?.update(
      this.player.x,
      this.player.y,
      this.touchControls?.getAimPreview() ?? null,
    );

    this.playerBars.update(this.player);
    this.hud.update(
      this.player,
      weapon,
      this.playerState.getLevelSystem(),
      skillStatus,
      this.character.name,
      this.playerState.getStatPoints(),
    );
    this.hud.setRunInfo(
      time - this.runStartedAt,
      this.getThreatTier(time),
      this.getBossHudText(time),
    );
  }

  private createCombat(): void {
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: MAX_BULLETS,
    });
    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: MAX_ENEMY_BULLETS,
    });

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bulletObject, enemyObject) => {
        if (!(bulletObject instanceof Phaser.Physics.Arcade.Sprite)) {
          return;
        }

        if (!(enemyObject instanceof EnemyBase) || !enemyObject.isAlive()) {
          return;
        }

        if (!bulletObject.active) {
          return;
        }

        const damage =
          (bulletObject.getData('damage') as number | undefined) ??
          BLASTER_DAMAGE;
        const pierce =
          (bulletObject.getData('pierce') as number | undefined) ?? 0;
        const explodeRadius = bulletObject.getData('explodeRadius') as
          | number
          | undefined;
        const explodeDamage = bulletObject.getData('explodeDamage') as
          | number
          | undefined;

        const bulletType = bulletObject.getData('dmgType') as
          | DamageType
          | undefined;

        enemyObject.takeDamage(
          damage,
          bulletObject.x,
          bulletObject.y,
          bulletType ? { parts: pureDamage(bulletType) } : undefined,
        );
        spawnHitSpark(this, enemyObject.x, enemyObject.y, NEON.playerBullet);

        const chillMs =
          (bulletObject.getData('chillMs') as number | undefined) ?? 0;

        if (chillMs > 0) {
          enemyObject.applyChill(ICE_LANCE_CHILL.mult, chillMs);
        }

        if (explodeRadius && explodeDamage) {
          this.explodeAt(
            bulletObject.x,
            bulletObject.y,
            explodeRadius,
            explodeDamage,
          );
        }

        if (pierce > 0) {
          bulletObject.setData('pierce', pierce - 1);
        } else {
          bulletObject.disableBody(true, true);
        }
      },
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_playerObject, enemyObject) => {
        if (!(enemyObject instanceof EnemyBase) || !enemyObject.isAlive()) {
          return;
        }

        if (this.player.isStealthed(this.time.now)) {
          return;
        }

        if (
          this.player.takeDamage(
            enemyObject.getContactDamage(),
            this.time.now,
            this.getEnemyDamageScale(enemyObject),
            { x: enemyObject.x, y: enemyObject.y, boss: enemyObject === this.boss },
          )
        ) {
          this.cameras.main.shake(90, 0.0035);
        }
      },
    );

    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      (_playerObject, bulletObject) => {
        if (
          !(bulletObject instanceof Phaser.Physics.Arcade.Sprite) ||
          !bulletObject.active
        ) {
          return;
        }

        const bulletDamage =
          (bulletObject.getData('damage') as number | undefined) ??
          ENEMY_BULLET_DAMAGE;

        if (
          this.player.takeDamage(bulletDamage, this.time.now, 1, {
            x: bulletObject.x,
            y: bulletObject.y,
            boss: bulletObject.getData('boss') === true,
            type: bulletObject.getData('dmgType') as DamageType | undefined,
          })
        ) {
          this.cameras.main.shake(90, 0.0035);
        }

        spawnBurst(this, bulletObject.x, bulletObject.y, NEON.enemyBullet, 6, 100);
        bulletObject.disableBody(true, true);
      },
    );

    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.enemies, this.obstacles);

    for (let i = 0; i < this.getInitialEnemyCount(); i += 1) {
      this.spawnEnemy();
    }

    this.weapons = this.playerState.getEquippedWeapons().map((id) =>
      id ? this.createWeaponById(id) : null,
    );

    const firstEquipped = this.weapons.findIndex(
      (weapon) => weapon !== null,
    );

    this.activateWeapon(firstEquipped >= 0 ? firstEquipped : 0);
  }

  /**
   * Chọn archetype cho lần sinh này (M2). Vùng có điểm sinh riêng (`spawnTable.points` khác rỗng = Arena): giữ chuỗi
   * M1 `pattern[spawnIndex % length]`. Vùng ngoài làng: bộ đếm riêng của vùng + dịch pha theo vòng điểm sinh
   * (`pickStaggeredArchetype`) để mỗi điểm sinh gặp nhiều loại quái. Xác định, không ngẫu nhiên.
   */
  private pickSpawnArchetype(
    region: ReturnType<typeof regionAt>,
  ): ArchetypeId | null {
    if (region === null) {
      return null;
    }

    const table = region.spawnTable;

    if (table.points.length > 0) {
      return pickArchetype(table.pattern, this.spawnIndex);
    }

    let points = this.regionSpawnPoints.get(region.id);

    if (points === undefined) {
      points = 0;

      for (const spawn of this.town.enemySpawns) {
        if (regionAt(this.getMapDef(), spawn.x, spawn.y)?.id === region.id) {
          points += 1;
        }
      }

      this.regionSpawnPoints.set(region.id, points);
    }

    const count = this.regionSpawnCounts.get(region.id) ?? 0;

    this.regionSpawnCounts.set(region.id, count + 1);

    return pickStaggeredArchetype(table.pattern, count, points);
  }

  private spawnEnemy(): void {
    const point =
      this.town.enemySpawns[this.spawnIndex % this.town.enemySpawns.length];
    const spawnRegion = regionAt(this.getMapDef(), point.x, point.y);
    const archetypeId = this.pickSpawnArchetype(spawnRegion);
    // Pattern rỗng/không có vùng (không xảy ra với dữ liệu hiện có) → hành vi cũ: chỉ số % 3 === 2 là bắn xa.
    const isRanged =
      archetypeId === null
        ? this.spawnIndex % 3 === 2
        : ENEMY_ARCHETYPES[archetypeId].kind === 'ranged';
    const margin = 48;
    const spawnX = Phaser.Math.Clamp(
      point.x + Phaser.Math.Between(-48, 48),
      margin,
      WORLD_WIDTH - margin,
    );
    const spawnY = Phaser.Math.Clamp(
      point.y + Phaser.Math.Between(-48, 48),
      margin,
      WORLD_HEIGHT - margin,
    );

    this.spawnIndex += 1;

    // Bậc theo vùng của ĐIỂM SINH GỐC (W3, D2): vùng offset 0 = bậc thời gian toàn cục như trước.
    const region = regionAt(this.getMapDef(), point.x, point.y);
    const tier =
      region === null
        ? this.getThreatTier(this.time.now)
        : effectiveThreatTier(this.time.now - this.runStartedAt, region);
    const enemy = isRanged
      ? new RangedEnemy(
          this,
          spawnX,
          spawnY,
          this.enemyBullets,
          tier,
          archetypeId ?? DEFAULT_RANGED_ARCHETYPE,
        )
      : new Enemy(this, spawnX, spawnY, tier, archetypeId ?? DEFAULT_MELEE_ARCHETYPE);

    this.watchSpawnedEnemyDeath(enemy, {
      role: 'normal',
      tier,
      // M2 (M-D1): EXP theo archetype + bậc của chính quái này.
      xp: killXp(archetypeId ?? (isRanged ? DEFAULT_RANGED_ARCHETYPE : DEFAULT_MELEE_ARCHETYPE), tier),
    });

    this.watchEnemyHits(enemy);
    this.enemies.add(enemy);

    spawnRing(this, point.x, point.y, 60, enemy.getDeathColor(), 300);
    spawnGlow(this, point.x, point.y, enemy.getDeathColor(), 0.7, 300);
  }

  /**
   * Handler `died` DÙNG CHUNG cho quái sinh theo vùng (M3): quái thường, Elite và quái hộ tống. Hiệu ứng, xác, loot thường
   * và EXP giữ đúng như trước; khác nhau theo `role`: `normal` đếm vào bộ đếm Elite của vùng; `elite` thay lượt hòm thường
   * bằng thưởng Elite và báo hạ gục; `escort` như quái thường nhưng KHÔNG đếm vào bộ đếm Elite.
   */
  private watchSpawnedEnemyDeath(
    enemy: EnemyBase,
    options: {
      readonly role: 'normal' | 'elite' | 'escort';
      readonly tier: number;
      /** EXP khi hạ. */
      readonly xp: number;
      /** Máu tối đa ghi cho xác; bỏ trống = máu tối đa của chính quái (Elite truyền máu archetype nền, không ×5). */
      readonly corpseMaxHealth?: number;
    },
  ): void {
    enemy.once('died', () => {
      spawnBurst(this, enemy.x, enemy.y, enemy.getDeathColor(), 10, 150);
      spawnGlow(this, enemy.x, enemy.y, enemy.getDeathColor(), 1.2, 260);
      this.corpses.add(enemy.x, enemy.y, options.corpseMaxHealth ?? enemy.getMaxHealth());

      if (options.role === 'elite') {
        this.dropEliteLoot(enemy.x, enemy.y);
      } else {
        this.maybeDropWeaponChest(enemy.x, enemy.y);
      }

      this.dropLoot(enemy.x, enemy.y, options.tier);
      this.handleEnemyKilled(options.xp);

      if (options.role === 'elite') {
        this.hud.showToast(ELITE_KILL_LABEL, ELITE_VISUAL.colorCss);
      } else if (options.role === 'normal') {
        this.countRegionKill(enemy.x, enemy.y);
      }
    });
  }

  /** Thưởng chắc chắn của Elite (E5): `ELITE_GEM_COUNT` ngọc (như `dropBossLoot`) và 1 hòm thường. */
  private dropEliteLoot(x: number, y: number): void {
    for (let i = 0; i < ELITE_GEM_COUNT; i += 1) {
      this.spawnDrop(x, y, 'gem', Phaser.Utils.Array.GetRandom(GEM_IDS));
    }

    this.spawnWeaponChest(x, y, false);
  }

  /** Cộng một kill thường vào vùng của vị trí chết; đủ điều kiện (`shouldSpawnElite`) thì sinh Elite. */
  private countRegionKill(x: number, y: number): void {
    const region = regionAt(this.getMapDef(), x, y);

    if (region === null) {
      return;
    }

    const kills = (this.regionKillCounts.get(region.id) ?? 0) + 1;
    const now = this.time.now;

    this.regionKillCounts.set(region.id, kills);

    const aliveElites = this.getEnemies().filter((enemy) => enemy.getData(ELITE_DATA_KEY) === true).length;

    if (
      shouldSpawnElite(
        {
          killsInRegion: kills,
          aliveElites,
          sinceLastEliteMs: this.lastEliteAt === null ? Number.POSITIVE_INFINITY : now - this.lastEliteAt,
        },
        region,
      ) &&
      this.spawnElite(region)
    ) {
      this.regionKillCounts.set(region.id, 0);
    }
  }

  /**
   * Sinh một Elite ở `region` (E1, E3, E4, E6). Bỏ qua kiểm trần quái nhưng nằm trong group `enemies`.
   * Trả false (không đổi trạng thái) khi vùng không có điểm sinh dùng được.
   */
  private spawnElite(region: NonNullable<ReturnType<typeof regionAt>>): boolean {
    const regionPoints = this.town.enemySpawns.filter(
      (spawn) => regionAt(this.getMapDef(), spawn.x, spawn.y)?.id === region.id,
    );
    const point = pickEliteSpawnPoint(
      regionPoints,
      { x: this.player.x, y: this.player.y },
      ELITE_SPAWN_MIN_PLAYER_DISTANCE,
    );

    if (point === null || region.eliteSlots.length === 0) {
      return false;
    }

    const eliteIndex = this.elitesSpawned;
    const baseId = region.eliteSlots[eliteIndex % region.eliteSlots.length];
    const affixId = pickEliteAffix(eliteIndex);
    const affix = ELITE_AFFIXES[affixId];
    const profile = eliteArchetype(baseId, affixId);
    const tier = effectiveThreatTier(this.time.now - this.runStartedAt, region);
    const margin = 48;
    const x = Phaser.Math.Clamp(point.x, margin, WORLD_WIDTH - margin);
    const y = Phaser.Math.Clamp(point.y, margin, WORLD_HEIGHT - margin);

    this.elitesSpawned += 1;
    this.lastEliteAt = this.time.now;

    const elite = new Enemy(this, x, y, tier, baseId, profile);

    elite.setData(ELITE_DATA_KEY, true);

    if (affix.damageTakenMult !== undefined) {
      elite.damageTakenMult = affix.damageTakenMult;
    }

    this.watchSpawnedEnemyDeath(elite, {
      role: 'elite',
      tier,
      xp: killXp(profile, tier),
      corpseMaxHealth: meleeStats(tier, baseId).maxHealth,
    });
    this.watchEnemyHits(elite);
    this.enemies.add(elite);
    // Marker tự dọn khi quái `died` hoặc bị hủy (despawn).
    new EliteMarker(this, elite, affixId);

    this.hud.showToast(affix.label, ELITE_VISUAL.colorCss);
    spawnRing(this, x, y, ELITE_VISUAL.spawnRing.radius, ELITE_VISUAL.color, ELITE_VISUAL.spawnRing.durationMs);

    for (const offset of escortOffsets(affix.escortCount ?? 0, ELITE_ESCORT_RADIUS)) {
      this.spawnEliteEscort(x + offset.x, y + offset.y, tier);
    }

    return true;
  }

  /** Quái hộ tống của Elite `escorted`: sinh như quái thường (loot/EXP thường) nhưng không đếm vào bộ đếm Elite. */
  private spawnEliteEscort(x: number, y: number, tier: number): void {
    const margin = 48;
    const escort = new Enemy(
      this,
      Phaser.Math.Clamp(x, margin, WORLD_WIDTH - margin),
      Phaser.Math.Clamp(y, margin, WORLD_HEIGHT - margin),
      tier,
      ELITE_ESCORT_ARCHETYPE,
    );

    this.watchSpawnedEnemyDeath(escort, {
      role: 'escort',
      tier,
      xp: killXp(ELITE_ESCORT_ARCHETYPE, tier),
    });
    this.watchEnemyHits(escort);
    this.enemies.add(escort);
    spawnRing(this, escort.x, escort.y, 50, escort.getDeathColor(), 300);
  }

  private getThreatTier(time: number): number {
    return timeThreatTier(time - this.runStartedAt);
  }

  /** Biển tên vùng (W3): theo dõi vùng người chơi đứng, hiện biển khi vào vùng mới; ẩn khi chết/mở panel. */
  private updateRegionBanner(time: number): void {
    const banner = this.regionBanner;
    const tracker = this.regionTracker;

    if (banner === null || tracker === null) {
      return;
    }

    if (this.player.isDead() || this.panelOpen) {
      banner.hide();

      return;
    }

    const region = regionAt(this.getMapDef(), this.player.x, this.player.y);
    const shown = tracker.update(region?.display ? region.id : null, time);

    if (shown !== null && region?.display) {
      banner.show(region.display, time);
    }

    banner.update(time);
  }

  private updateEnemySpawning(time: number): void {
    if (!this.canSpawnEnemies(time)) {
      return;
    }

    const tier = this.getThreatTier(time);
    const maxAlive = this.getMaxAliveEnemies(tier);

    if (this.getEnemies().length >= maxAlive) {
      return;
    }

    if (time < this.nextSpawnAt) {
      return;
    }

    this.spawnEnemy();

    const interval = Math.max(
      MIN_RESPAWN_MS,
      ENEMY_RESPAWN_MS - tier * RESPAWN_REDUCTION_PER_TIER,
    );

    this.nextSpawnAt = time + interval;
  }

  private getBossHudText(time: number): string {
    if (this.boss) {
      return `TRÙM ${this.bossNumber}`;
    }

    if (this.bossReady) {
      return this.inBossArena
        ? `TRÙM ${this.bossNumber + 1} SẮP XUẤT HIỆN`
        : 'TRÙM ĐANG CHỜ Ở ĐẤU TRƯỜNG';
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((this.nextBossAt - time) / 1000),
    );
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = String(remainingSeconds % 60).padStart(2, '0');

    return `TRÙM SAU ${minutes}:${seconds}`;
  }

  private updateBoss(time: number): void {
    if (this.player.isDead()) {
      return;
    }

    const action = decideBossAction({
      inArena: this.inBossArena,
      now: time,
      nextBossAt: this.nextBossAt,
      bossAlive: this.boss !== null,
      bossReady: this.bossReady,
      bossWarningShown: this.bossWarningShown,
      warningMs: BOSS_WARNING_MS,
      arenaEntryAt: this.arenaEntryAt,
      entrySpawnDelayMs: BOSS_ARENA_ENTRY_SPAWN_DELAY_MS,
    });

    if (action === 'spawn') {
      this.spawnBoss();
    } else if (action === 'mark_ready') {
      this.bossReady = true;
      this.hud.showToast('TRÙM ĐANG CHỜ Ở ĐẤU TRƯỜNG', '#ff8fa3');
    } else if (action === 'warn') {
      this.bossWarningShown = true;
      this.hud.showToast(
        `TRÙM ${this.bossNumber + 1} SẮP XUẤT HIỆN`,
        '#ff8fa3',
      );
    }
  }

  private spawnBoss(): void {
    // Chốt chặn cuối: Boss chỉ tồn tại trong BossArenaScene.
    if (!this.inBossArena || this.boss) {
      return;
    }

    this.bossReady = false;
    this.bossNumber += 1;
    this.clearArenaForBoss();

    const point = this.getBossSpawnPoint();
    const boss = new BossEnemy(
      this,
      point.x,
      point.y,
      this.bossNumber,
      this.playerState.getLevel(),
      {
        onSlam: (slam) => this.handleBossSlam(slam),
        onSummon: (count, summoner) => this.summonBossMinions(count, summoner),
        projectiles: this.enemyBullets,
      },
    );

    boss.once('died', () => this.handleBossDefeated(boss));
    this.watchEnemyHits(boss);
    this.enemies.add(boss);
    this.boss = boss;
    this.nextSpawnAt = this.time.now + BOSS_RESPAWN_MS;

    spawnRing(this, point.x, point.y, 150, NEON.boss, 700);
    spawnGlow(this, point.x, point.y, NEON.boss, 2.2, 700);
    spawnBurst(this, point.x, point.y, NEON.boss, 18, 200);
    this.cameras.main.shake(360, 0.008);
    this.hud.showToast(
      `TRÙM ${this.bossNumber} THỨC TỈNH`,
      '#ff8fa3',
    );
  }

  /** Boss triệu hồi quái cận chiến hộ tống quanh mình (có giới hạn số lượng). */
  private summonBossMinions(count: number, summoner: BossEnemy): number {
    const room = BOSS_SUMMON_MAX_MINIONS - (this.getEnemies().length - 1);
    const total = Math.min(count, Math.max(0, room));
    const bounds = this.getWorldBounds();
    const tier = this.getThreatTier(this.time.now);

    for (let i = 0; i < total; i += 1) {
      const angle = (i / Math.max(1, total)) * Math.PI * 2 + Math.random();
      const x = Phaser.Math.Clamp(
        summoner.x + Math.cos(angle) * 110,
        bounds.x + 48,
        bounds.x + bounds.width - 48,
      );
      const y = Phaser.Math.Clamp(
        summoner.y + Math.sin(angle) * 110,
        bounds.y + 48,
        bounds.y + bounds.height - 48,
      );
      const minion = new Enemy(this, x, y, tier);

      minion.once('died', () => {
        spawnBurst(this, minion.x, minion.y, minion.getDeathColor(), 10, 150);
        this.corpses.add(minion.x, minion.y, minion.getMaxHealth());
        this.handleEnemyKilled();
      });
      this.watchEnemyHits(minion);
      this.enemies.add(minion);
      spawnRing(this, x, y, 50, minion.getDeathColor(), 300);
    }

    return total;
  }

  private clearArenaForBoss(): void {
    this.corpses.clear();

    for (const enemy of this.getEnemies()) {
      enemy.despawn();
    }

    for (const bullet of this.enemyBullets.getChildren()) {
      if (bullet instanceof Phaser.Physics.Arcade.Sprite) {
        bullet.disableBody(true, true);
      }
    }
  }

  protected getBossSpawnPoint(): { x: number; y: number } {
    const options = this.town.enemySpawns.map((point) => ({
      ...point,
      distance: Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        point.x,
        point.y,
      ),
    }));
    const preferred = options
      .filter(
        (option) =>
          option.distance >= 300 && option.distance <= 1000,
      )
      .sort((first, second) => first.distance - second.distance)[0];
    const fallback = options.sort(
      (first, second) => second.distance - first.distance,
    )[0];

    return preferred ?? fallback ?? { ...this.town.playerSpawn };
  }

  private handleBossSlam(slam: BossSlam): void {
    spawnRing(this, slam.x, slam.y, slam.radius, NEON.boss, 360);
    spawnGlow(this, slam.x, slam.y, NEON.boss, 1.8, 360);
    spawnBurst(this, slam.x, slam.y, NEON.boss, 14, 180);
    this.cameras.main.shake(150, 0.006);

    const distance = Phaser.Math.Distance.Between(
      slam.x,
      slam.y,
      this.player.x,
      this.player.y,
    );

    // Lĩnh Vực Thần Minh: slam/thiên thạch đặt ngay chỗ người chơi, nên phải xét vị trí boss (nguồn thật) chứ không phải tâm vùng nổ.
    const blockedByDomain =
      this.boss !== null &&
      isHitBlockedByDomain(this.boss.x, this.boss.y, this.player.x, this.player.y);

    if (
      !blockedByDomain &&
      distance <= slam.radius &&
      this.player.takeDamage(slam.damage, this.time.now, 1, {
        x: slam.x,
        y: slam.y,
        overhead: true,
        boss: true,
        type: slam.type,
      })
    ) {
      this.cameras.main.shake(220, 0.009);
    }
  }

  private handleBossDefeated(boss: BossEnemy): void {
    if (this.boss === boss) {
      this.boss = null;
    }

    this.nextBossAt = this.time.now + BOSS_RESPAWN_MS;
    this.nextSpawnAt = this.time.now + 2500;
    this.bossWarningShown = false;

    spawnBurst(this, boss.x, boss.y, NEON.boss, 24, 220);
    spawnGlow(this, boss.x, boss.y, NEON.legendary, 2.6, 800);
    spawnRing(this, boss.x, boss.y, 180, NEON.legendary, 800);
    this.cameras.main.shake(420, 0.01);

    this.hud.showToast(
      `TRÙM ${this.bossNumber} BỊ HẠ GỤC`,
      NEON_CSS.gold,
    );
    this.grantExperience(XP_PER_KILL * (5 + this.bossNumber * 2));
    this.grantBossLoot(this.bossNumber);
    this.dropBossLoot(boss.x, boss.y);
    this.saveProgress();
  }

  private grantBossLoot(tier: number): void {
    const id =
      BOSS_LOOT_GEAR_IDS[
        Math.floor(Math.random() * BOSS_LOOT_GEAR_IDS.length)
      ];

    if (!id) {
      return;
    }

    const reward = this.playerState.rewardGear(id, tier);

    if (!reward.ok) {
      return;
    }

    const rewardLevel = reward.level;

    this.applyPlayerStatistics();
    this.saveProgress();

    spawnBurst(this, this.player.x, this.player.y, NEON.legendary, 12, 120);
    spawnRing(
      this,
      this.player.x,
      this.player.y,
      90,
      NEON.legendary,
      600,
    );
    this.hud.showToast(
      `TRÙM RƠI: ${GEAR_INFO[id].name} LV${rewardLevel}`,
      '#ffb347',
    );
  }

  /** Nối hook "đánh trúng" của một quái vào hệ passive. */
  private watchEnemyHits(enemy: EnemyBase): void {
    enemy.hitModifier = (target, amount, sourceX, sourceY) =>
      this.modifyPlayerHit(target, amount, sourceX, sourceY);
    enemy.statusTuning = this.statusTuning;
    enemy.on('damaged', (dealt: number) => this.handlePlayerHit(dealt, enemy));
    enemy.on('died', () => {
      this.damageNumbers.flushTarget(enemy);
      this.spreadBurn(enemy, this.passives.burnSpreadHops);
    });
    enemy.on('damage-dealt', (event: DamageDealtEvent) =>
      this.damageNumbers.spawnHit(
        enemy,
        event.x,
        event.y,
        event.parts.map((part) => ({
          ...part,
          amount: toDisplayDamage(part.amount),
        })),
        event.crit,
      ),
    );
    enemy.on('dot-damage', (event: DotDamageEvent) =>
      this.damageNumbers.spawnDot(
        enemy,
        event.x,
        event.y,
        event.kind === 'burn' ? 'fire' : 'poison',
        toDisplayDamage(event.amount),
      ),
    );
    enemy.on('chain', (lightning: number) => this.chainLightning(enemy, lightning));
    enemy.on('dark-damage', (dark: number) => {
      const heal = this.darkLeech.take(
        dark,
        this.time.now,
        this.player.getMaxHealth(),
      );

      if (heal > 0) {
        this.player.heal(heal);
      }
    });
  }

  /** Lightning: lan sát thương sét sang tối đa 2 địch gần đó (mỗi bước ×0.6, không lan tiếp). */
  private chainLightning(source: EnemyBase, damage: number): void {
    const links = pickChainTargets(
      source,
      this.getEnemies().filter((e) => e.isAlive()),
      [source],
    );

    for (const { target, mult } of links) {
      spawnHitSpark(this, target.x, target.y, ELEMENT_COLORS.lightning);
      target.takeDamage(damage * mult, source.x, source.y, {
        parts: [{ type: 'lightning', ratio: 1 }],
        noProc: true,
      });
    }
  }

  /** Mồi Lửa: kẻ đang cháy chết thì lan Thiêu cho địch gần đó (thêm bước ở cấp 5). */
  private spreadBurn(source: EnemyBase, hops: number): void {
    const dot = source.getDotInfo('burn');

    if (hops <= 0 || !dot) {
      return;
    }

    const baseDps = dot.dps / Math.max(0.01, this.statusTuning.burnMult);

    for (const enemy of this.getEnemies()) {
      if (
        enemy === source ||
        !enemy.isAlive() ||
        enemy.hasDot('burn') ||
        Phaser.Math.Distance.Between(source.x, source.y, enemy.x, enemy.y) >
          this.passives.burnSpreadRadius
      ) {
        continue;
      }

      enemy.applyDot('burn', baseDps, dot.remainingMs);
      spawnHitSpark(this, enemy.x, enemy.y, ELEMENT_COLORS.fire);

      if (hops > 1) {
        this.spreadBurn(enemy, hops - 1);
      }
    }
  }

  /**
   * Đánh Lén (đòn từ phía sau) và Nhãn Quang (mục tiêu ở xa): cộng sát thương
   * và tung chí mạng ngay trước khi quái nhận đòn. Ngữ cảnh đòn gồm hướng
   * nguồn đánh so với hướng quái đang quay về phía người chơi.
   */
  private modifyPlayerHit(
    target: EnemyBase,
    amount: number,
    sourceX: number,
    sourceY: number,
  ): HitModifierResult {
    const p = this.passives;

    if (
      p.behindDamage <= 0 &&
      p.behindCritChance <= 0 &&
      p.farCritChance <= 0 &&
      p.damageVsChilled <= 0
    ) {
      return { amount, crit: false };
    }

    // Quái quay mặt về người chơi; đòn "từ phía sau" đến từ phía đối diện.
    const facingX = this.player.x - target.x;
    const facingY = this.player.y - target.y;
    const sourceDx = sourceX - target.x;
    const sourceDy = sourceY - target.y;
    const facingLen = Math.hypot(facingX, facingY);
    const sourceLen = Math.hypot(sourceDx, sourceDy);
    const behind =
      facingLen > 1 &&
      sourceLen > 1 &&
      (facingX * sourceDx + facingY * sourceDy) / (facingLen * sourceLen) <=
        -Math.cos(Phaser.Math.DegToRad(BEHIND_HIT_HALF_ANGLE_DEG));
    const far = facingLen >= p.farMinDistance && p.farCritChance > 0;

    let result = amount;

    // Băng Vĩnh Cửu: địch đang Lạnh chịu thêm sát thương.
    if (p.damageVsChilled > 0 && target.isChilled()) {
      result *= 1 + p.damageVsChilled;
    }

    let critChance = 0;
    let critMult = CRIT_BASE_DAMAGE_MULT;

    if (behind) {
      result *= 1 + p.behindDamage;
      critChance += p.behindCritChance;
    }

    if (far) {
      critChance += p.farCritChance;
      critMult += p.farCritDamage;
    }

    let crit = false;

    if (critChance > 0 && Math.random() < critChance) {
      result *= critMult;
      crit = true;
      spawnHitSpark(this, target.x, target.y, 0xffe066);
    }

    return { amount: result, crit };
  }

  /** Điểm chung cho mọi đòn trúng quái (vũ khí, kỹ năng, đạn). */
  private handlePlayerHit(dealt: number, enemy: EnemyBase): void {
    const now = this.time.now;

    // Ngọc Hút Máu: tích dồn phần lẻ vì máu là số nguyên nhỏ.
    if (this.gemBonuses.lifestealPercent > 0) {
      this.lifestealCarry += (dealt * this.gemBonuses.lifestealPercent) / 100;

      if (this.lifestealCarry >= 1) {
        const whole = Math.floor(this.lifestealCarry);

        this.lifestealCarry -= whole;
        this.player.heal(whole);
      }
    }

    // Ngọc Hút Ki: mỗi đòn trúng hồi EN (giới hạn 1 lần/100ms như passive).
    if (this.gemBonuses.energyLeech > 0 && now >= this.nextGemEnergyAt) {
      this.nextGemEnergyAt = now + 100;
      this.player.restoreEnergy(this.gemBonuses.energyLeech);
    }

    // Đà Chém cấp 5: đầy cộng dồn thì đòn trúng bắn thêm sóng chém phía trước.
    if (
      this.passives.momentumLevel >= 5 &&
      this.player.getMomentumStacks(now) >= this.passives.momentumMaxStacks &&
      now >= this.nextSlashWaveAt
    ) {
      this.nextSlashWaveAt = now + 500;
      this.explodeAt(
        this.player.x + this.lastAim.x * 85,
        this.player.y + this.lastAim.y * 85,
        60,
        2 * this.player.getStats().damageMultiplier,
        0xff5e6c,
      );
    }

    // Độc Tố: đòn trúng có cơ hội gắn 1 tầng Độc.
    if (
      this.passives.poisonApplyChance > 0 &&
      enemy.isAlive() &&
      Math.random() < this.passives.poisonApplyChance
    ) {
      enemy.addPoisonStack(
        TOXIN.dpsPerStack * this.player.getStats().damageMultiplier,
        TOXIN.durationMs,
        Math.max(1, this.passives.poisonMaxStacks),
      );
    }

    if (this.passives.momentumPerStack > 0 && now >= this.nextMomentumAt) {
      this.nextMomentumAt = now + 100;
      this.player.addMomentumStack(now);
    }

    // Một kỹ năng nhiều đòn không được hồi EN theo từng đòn: giới hạn 1 lần/100ms.
    if (this.passives.energyOnHit > 0 && now >= this.nextHitEnergyAt) {
      this.nextHitEnergyAt = now + 100;
      this.player.restoreEnergy(this.passives.energyOnHit);
    }
  }

  /** `xp`: mặc định XP_PER_KILL (minion Boss giữ nguyên); quái sinh theo vùng truyền `killXp(archetype, bậc)` (M2). */
  private handleEnemyKilled(xp: number = XP_PER_KILL): void {
    this.grantExperience(xp);

    if (this.passives.energyOnKill > 0) {
      this.player.restoreEnergy(this.passives.energyOnKill);
    }

    // Hút Hồn (nội tại Triệu Hồn Sư): hạ gục hồi EN, có cơ hội thêm xác.
    if (this.characterId === 'necromancer') {
      this.player.restoreEnergy(SOUL_SIPHON.energyOnKill);

      if (Math.random() < SOUL_SIPHON.extraCorpseChance) {
        this.corpses.add(
          this.player.x + Phaser.Math.Between(-40, 40),
          this.player.y + Phaser.Math.Between(-40, 40),
          3,
        );
        spawnGlow(this, this.player.x, this.player.y, NEC_COLOR, 1, 200);
      }
    }
  }

  private grantExperience(amount: number): void {
    const {
      previousLevel,
      levelsGained,
      statPointsGained: points,
    } = this.playerState.grantExperience(amount);

    if (levelsGained > 0) {
      // Điểm kỹ năng không lưu bộ đếm: luôn suy ra từ level (xem skillTreeRules),
      // nên ở đây chỉ báo cho người chơi, không cộng vào đâu cả.
      const hasSkillTree = getClassSkillNodes(this.characterId).length > 0;
      const skillText = hasSkillTree
        ? ` · +${levelsGained} ĐIỂM KỸ NĂNG`
        : '';

      this.announceSkillUnlocks(previousLevel, this.playerState.getLevel());
      this.hud.showToast(
        `LÊN CẤP! +${points} ĐIỂM CHỈ SỐ${skillText}`,
        NEON_CSS.gold,
      );
    }

    this.saveProgress();
  }

  private announceSkillUnlocks(
    previousLevel: number,
    currentLevel: number,
  ): void {
    for (const skill of this.allSkills) {
      if (
        !skill.requiresNode &&
        skill.unlockLevel > previousLevel &&
        skill.unlockLevel <= currentLevel
      ) {
        this.hud.showToast(
          `MỞ KHOÁ KỸ NĂNG: ${skill.name}`,
          skill.colorCss,
        );
      }
    }
  }

  private tryCastSkill(
    request: SkillCastRequest,
    time: number,
    autoAim: Phaser.Math.Vector2,
    moveDirection: Phaser.Math.Vector2,
  ): void {
    const skill = this.skills[request.slot];

    if (!skill || this.player.isDead() || this.player.isLeaping()) {
      return;
    }

    if (!this.isSkillUsable(skill)) {
      this.hud.showToast(
        skill.requiresNode && !this.isNodeLearned(skill)
          ? `${skill.name}: HỌC TRONG CÂY KỸ NĂNG`
          : `${skill.name} KHOÁ ĐẾN LV${skill.unlockLevel}`,
        '#8b8fa3',
      );
      return;
    }

    // Kỹ năng bật/tắt: bấm lần nữa để dừng (kiểm tra trước hồi chiêu).
    if (skill.id === 'dual_guard' && this.dualGuardActive) {
      this.stopDualGuard(time);
      return;
    }

    if (skill.id === 'poison_trap' && this.vanishActive) {
      this.stopVanish(time);
      return;
    }

    if (skill.id === 'fortress_stand' && this.fortress) {
      this.stopFortress(time);
      return;
    }

    // Đang dựng tường: không dùng kỹ năng di chuyển/dịch chuyển để thoát trạng thái cố định.
    if (this.fortress && FORTRESS_BLOCKED_SKILLS.has(skill.id)) {
      this.hud.showToast('ĐANG BẤT ĐỘNG', '#ff8fa3');
      return;
    }

    if (time < (this.skillCooldownUntil[skill.id] ?? 0)) {
      return;
    }

    // Điều kiện riêng của skill (vd. Cuồng Nộ không dùng khi đang BERSERK/EXHAUSTED): kiểm tra trước khi trừ EN.
    const blockReason = skill.canCast?.(this.player) ?? null;

    if (blockReason) {
      this.hud.showToast(blockReason, '#ff8fa3');
      return;
    }

    if (skill.id === 'dual_guard' && this.getShieldWeapon() === null) {
      this.hud.showToast('CẦN MANG KHIÊN', '#ff8fa3');
      return;
    }

    if (skill.id === 'fortress_stand' && !this.isShieldActive()) {
      this.hud.showToast('CẦN CẦM KHIÊN', '#ff8fa3');
      return;
    }

    // Kỹ năng `target`: chọn mục tiêu TRƯỚC khi trừ năng lượng để không mất tài nguyên oan.
    const control = skill.control;
    const target =
      control?.kind === 'target'
        ? selectTarget(
            control.select,
            this.getEnemies(),
            this.player.x,
            this.player.y,
            control.range,
          )
        : null;

    if (control?.kind === 'target' && !target) {
      this.hud.showToast('KHÔNG CÓ MỤC TIÊU', '#8b8fa3');
      return;
    }

    if (
      skill.needsCorpses &&
      this.corpses.findNear(
        this.player.x,
        this.player.y,
        skill.needsCorpses.radius,
      ).length < skill.needsCorpses.count
    ) {
      this.hud.showToast('CẦN XÁC CHẾT GẦN ĐÂY', '#9b6bff');
      return;
    }

    // Quá Nhiệt: Nhiệt đầy thì skill Hỏa kế tiếp miễn EN và mạnh hơn.
    const heats =
      this.passives.overheatMaxHeat > 0 && OVERHEAT_SKILLS.includes(skill.id);
    const overheated = heats && this.heat >= this.passives.overheatMaxHeat;
    // Huyết Hận cấp 5: dưới 30% HP, Lốc Xoáy miễn EN một lần mỗi 20s.
    const bloodFree =
      skill.id === 'cyclone' &&
      this.passives.bloodRageLevel >= 5 &&
      this.player.getHealth() < this.player.getMaxHealth() * 0.3 &&
      time >= this.bloodFreeReadyAt;

    if (
      skill.energyCost > 0 &&
      !overheated &&
      !bloodFree &&
      !this.player.consumeEnergy(skill.energyCost)
    ) {
      this.hud.showToast('KHÔNG ĐỦ NĂNG LƯỢNG', '#ff8fa3');
      return;
    }

    // Hướng tung: tới mục tiêu (target) > hướng người chơi kéo > hướng tự động.
    const aim = target
      ? new Phaser.Math.Vector2(
          target.x - this.player.x,
          target.y - this.player.y,
        ).normalize()
      : request.aim
        ? new Phaser.Math.Vector2(request.aim.x, request.aim.y)
        : autoAim;
    const aimPoint =
      control?.kind === 'point' && request.aim && request.reach !== null
        ? new Phaser.Math.Vector2(
            this.player.x + aim.x * control.range * request.reach,
            this.player.y + aim.y * control.range * request.reach,
          )
        : undefined;

    // Tấn công bằng kỹ năng sẽ phá tàn hình; kỹ năng tàng hình tự bật lại
    // trạng thái mới sau khi cast.
    if (!skill.keepsStealth) {
      this.player.breakStealth();
    }

    const castContext: SkillContext = {
      enemyBullets: this.enemyBullets,
      getEnemies: () => this.getEnemies(),
      power:
        getSkillPower(this.getSkillNodeLevel(skill.id)) *
        (overheated ? 1 + this.passives.overheatDamageBonus : 1),
      level: this.getSkillNodeLevel(skill.id),
      parts: skill.damageParts,
      noProc: skill.damageNoProc,
      corpses: this.corpses,
      minions: this.minions,
      scene: this,
      player: this.player,
      aim,
      aimExplicit: request.aim !== null,
      moveDirection,
      time,
      enemies: this.getEnemies(),
      bullets: this.bullets,
      aimPoint,
      target: target ?? undefined,
    };
    const cast = skill.cast(castContext);

    if (!cast) {
      return;
    }

    if (bloodFree) {
      this.bloodFreeReadyAt = time + 20000;
      this.hud.showToast('HUYẾT HẬN: MIỄN EN', '#ff5e6c');
    }

    if (heats) {
      this.heat = overheated
        ? 0
        : Math.min(this.passives.overheatMaxHeat, this.heat + 1);
      this.heatLastGainAt = time;

      if (!overheated && this.heat >= this.passives.overheatMaxHeat) {
        this.hud.showToast('NHIỆT ĐẦY', '#ff8a4d');
      }
    }

    if (skill.id === 'poison_trap') {
      this.vanishActive = true;
    }

    if (skill.id === 'dual_guard') {
      this.dualGuardActive = true;
      this.applyDualGuardState();
    }

    if (skill.id === 'fortress_stand') {
      this.startFortress(aim);
    }

    this.maybeEchoSkill(skill, castContext, time);

    this.skillCooldownUntil[skill.id] = time + this.getEffectiveCooldown(skill);
    this.player.playAttack(time, aim);

    // Rút Nhanh: lăn (và Ảnh Bộ ở cấp 5) mở cửa sổ bắn nhanh.
    if (
      skill.id === 'evasive_roll' ||
      (skill.id === 'shadow_step' && this.passives.quickDrawOnTeleport)
    ) {
      this.player.triggerQuickDraw(time);
    }
  }

  /** Dư Chấn: cơ hội cho skill chủ động vang lại sau một nhịp với sát thương giảm, miễn EN. */
  private maybeEchoSkill(
    skill: SkillDefinition,
    context: SkillContext,
    time: number,
  ): void {
    const p = this.passives;

    if (
      p.echoChance <= 0 ||
      time < this.echoReadyAt ||
      !SPELL_ECHO_SKILLS.includes(skill.id) ||
      Math.random() >= p.echoChance
    ) {
      return;
    }

    this.echoReadyAt = time + p.echoIcdMs;
    this.time.delayedCall(p.echoDelayMs, () => {
      if (this.player.isDead()) {
        return;
      }

      skill.cast({
        ...context,
        power: context.power * p.echoDamageFraction,
        enemies: this.getEnemies(),
        time: this.time.now,
      });
    });
  }

  /** Phản Xạ Ma: né thành công hoàn lại hồi chiêu của các kỹ năng đang hồi. */
  private refundCooldownsOnDodge(): void {
    const refund = this.passives.dodgeRefundMs;

    if (refund <= 0) {
      return;
    }

    const now = this.time.now;

    for (const key of Object.keys(this.skillCooldownUntil) as SkillId[]) {
      const until = this.skillCooldownUntil[key] ?? 0;

      if (until > now) {
        this.skillCooldownUntil[key] = Math.max(now, until - refund);
      }
    }
  }

  /** Giáp Vỡ Phản Chấn: xung kích quanh người khi giáp vừa bị đánh về 0. */
  private triggerShatterWard(): void {
    const p = this.passives;
    const now = this.time.now;

    if (p.shatterWardLevel <= 0 || now < this.shatterReadyAt) {
      return;
    }

    this.shatterReadyAt = now + p.shatterWardIcdMs;
    this.explodeAt(
      this.player.x,
      this.player.y,
      SHATTER_WARD.radius,
      SHATTER_WARD.damage *
        this.player.getStats().damageMultiplier *
        (1 + (p.shatterWardLevel - 1) * 0.1),
      0x9fd4ff,
    );

    if (p.shatterWardLevel >= SHATTER_WARD.restoreArmorLevel) {
      this.player.restoreArmor(SHATTER_WARD.restoreArmor);
    }
  }

  /** Hệ số sát thương quái gây ra cho người chơi (Uy Nghiêm, Độc Suy Nhược). */
  private getEnemyDamageScale(enemy: EnemyBase): number {
    const p = this.passives;
    let reduction = 0;

    if (
      p.auraDamageReduction > 0 &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      ) <= p.auraRadius
    ) {
      reduction += p.auraDamageReduction;
    }

    if (p.enfeeblePerStack > 0) {
      reduction += Math.min(
        p.enfeebleCap,
        p.enfeeblePerStack * enemy.getPoisonStacks(),
      );
    }

    return Math.max(0, 1 - reduction);
  }

  /** Quá Nhiệt tan dần, Tâm Băng đếm địch Lạnh, Uy Nghiêm quét aura; điều chỉnh hồi EN. */
  private updatePassiveAuras(time: number): void {
    const p = this.passives;

    if (this.heat > 0 && time - this.heatLastGainAt > p.overheatDecayMs) {
      this.heat = 0;
    }

    if (time >= this.nextPassiveScanAt && !this.player.isDead()) {
      this.nextPassiveScanAt = time + PASSIVE_SCAN_MS;
      this.chilledNearby = 0;

      if (p.energyRegenPerChilled > 0 || p.auraFearChance > 0) {
        for (const enemy of this.getEnemies()) {
          if (!enemy.isAlive()) {
            continue;
          }

          const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            enemy.x,
            enemy.y,
          );

          if (
            p.energyRegenPerChilled > 0 &&
            distance <= p.chilledRadius &&
            enemy.isChilled()
          ) {
            this.chilledNearby += 1;
          }

          if (
            p.auraFearChance > 0 &&
            distance <= p.auraRadius &&
            !(enemy instanceof BossEnemy) &&
            time >= (this.fearReadyAt.get(enemy) ?? 0)
          ) {
            this.fearReadyAt.set(enemy, time + p.auraFearIcdMs);

            if (Math.random() < p.auraFearChance) {
              enemy.applyStun(DREAD_FEAR_MS);
              spawnHitSpark(this, enemy.x, enemy.y, 0x6b4fa8);
            }
          }
        }
      }
    }

    const regenFactor =
      p.overheatMaxHeat > 0 && this.heat >= OVERHEAT_PENALTY_HEAT
        ? 1 - p.overheatRegenPenalty
        : 1;

    this.player.setEnergyRegenModifiers(
      Math.min(this.chilledNearby, p.chilledMaxCounted) *
        p.energyRegenPerChilled,
      regenFactor,
    );
  }

  private spawnDashTrail(time: number): void {
    if (time < this.nextAfterimageAt) {
      return;
    }

    this.nextAfterimageAt = time + 45;
    spawnAfterimage(
      this,
      this.player.x,
      this.player.y,
      this.player.texture.key,
      NEON.dash,
      this.player.frame.name,
    );
  }

  private getShieldWeapon(): ShieldWeapon | null {
    for (const weapon of this.weapons) {
      if (weapon instanceof ShieldWeapon) {
        return weapon;
      }
    }

    return null;
  }

  /**
   * Song Thủ Khiên: áp hệ số lên Player theo trạng thái hiện tại.
   * Cầm khiên hai tay (vũ khí chính là Khiên) chậm hơn; cầm khiên phụ thì chỉ hiển thị.
   */
  private applyDualGuardState(): void {
    const shield = this.getShieldWeapon();

    if (!this.dualGuardActive || !shield) {
      this.player.setMoveSpeedFactor(1);
      this.player.setDamageTakenFactor(1);
      shield?.setOffHand(false);
      return;
    }

    const twoHand = this.weapons[this.activeWeaponIndex] === shield;

    this.player.setDamageTakenFactor(DUAL_GUARD_DAMAGE_TAKEN);
    this.player.setMoveSpeedFactor(
      twoHand ? DUAL_GUARD_TWO_HAND_SPEED_FACTOR : DUAL_GUARD_SPEED_FACTOR,
    );
    shield.setOffHand(!twoHand);
  }

  private stopDualGuard(time: number, toast = 'SONG THỦ: TẮT'): void {
    this.dualGuardActive = false;
    this.applyDualGuardState();
    this.skillCooldownUntil.dual_guard = time + DUAL_GUARD_COOLDOWN_MS;
    this.hud.showToast(toast, '#6bd0ff');
  }

  /** Tiêu EN liên tục; tự tắt khi hết EN, chết, vào làng hoặc không còn Khiên. */
  private updateDualGuard(delta: number, inVillage: boolean): void {
    if (!this.dualGuardActive) {
      return;
    }

    if (this.player.isDead() || inVillage || this.getShieldWeapon() === null) {
      this.stopDualGuard(this.time.now);
      return;
    }

    if (
      !this.player.consumeEnergy((DUAL_GUARD_ENERGY_PER_SECOND * delta) / 1000)
    ) {
      this.stopDualGuard(this.time.now, 'HẾT NĂNG LƯỢNG · SONG THỦ TẮT');
      return;
    }

    this.applyDualGuardState();
  }

  /**
   * Người chơi tàng hình: quái KHÔNG đứng yên, vẫn di chuyển/tấn công như thường. Chúng chỉ nhận ra người chơi
   * khi lại gần (trong STEALTH_DETECT_RANGE) hoặc ưu tiên đồng minh; còn lại đi lang thang tới điểm ngẫu nhiên.
   */
  private getStealthTarget(
    enemy: EnemyBase,
    time: number,
  ): { x: number; y: number } {
    const aggro = this.minions.getAggroTarget(enemy, this.player);

    if (
      aggro !== this.player ||
      Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) <=
        STEALTH_DETECT_RANGE
    ) {
      return aggro;
    }

    let wander = this.stealthWander.get(enemy);

    if (
      !wander ||
      time >= wander.until ||
      Phaser.Math.Distance.Between(enemy.x, enemy.y, wander.x, wander.y) < 12
    ) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(
        STEALTH_WANDER_RADIUS * 0.4,
        STEALTH_WANDER_RADIUS,
      );

      wander = {
        x: enemy.x + Math.cos(angle) * distance,
        y: enemy.y + Math.sin(angle) * distance,
        until:
          time + Phaser.Math.Between(STEALTH_WANDER_MIN_MS, STEALTH_WANDER_MAX_MS),
      };
      this.stealthWander.set(enemy, wander);
    }

    return wander;
  }

  private stopVanish(time: number, toast = 'TÀNG HÌNH: TẮT'): void {
    this.vanishActive = false;
    this.player.breakStealth();
    this.applyDualGuardState(); // trả hệ số tốc chạy về đúng trạng thái (1 nếu không có Song Thủ)
    this.skillCooldownUntil.poison_trap = Math.max(
      this.skillCooldownUntil.poison_trap ?? 0,
      time + VANISH_STOP_COOLDOWN_MS,
    );
    this.hud.showToast(toast, '#c58cff');
  }

  /**
   * Tàng Hình không giới hạn thời gian: mỗi frame gia hạn trạng thái tàng hình + tăng tốc, và trừ EN theo giây.
   * Tự tắt khi hết EN, chết, vào làng, hoặc khi người chơi ra đòn/dùng skill khác (phá tàng hình).
   */
  private updateVanish(delta: number, inVillage: boolean, time: number): void {
    if (!this.vanishActive) {
      return;
    }

    if (this.player.isDead() || inVillage) {
      this.vanishActive = false;
      this.applyDualGuardState();
      return;
    }

    // Đã bị phá (ra đòn, dùng skill khác, ...): kết thúc.
    if (!this.player.isStealthed(time)) {
      this.stopVanish(time, 'TÀNG HÌNH BỊ PHÁ');
      return;
    }

    const drainMult =
      this.getSkillNodeLevel('poison_trap') >= 3 ? VANISH_LEVEL3_DRAIN_MULT : 1;

    if (
      !this.player.consumeEnergy(
        (VANISH_ENERGY_PER_SECOND * drainMult * delta) / 1000,
      )
    ) {
      this.stopVanish(time, 'HẾT NĂNG LƯỢNG · TÀNG HÌNH TẮT');
      return;
    }

    this.player.grantStealth(time, VANISH_REFRESH_MS);
    // Tàng hình làm chậm người chơi (hệ số < 1); gọi mỗi frame vì Song Thủ Khiên cũng ghi đè hệ số này.
    this.player.setMoveSpeedFactor(VANISH_SPEED_MULT);
  }

  /** Vũ khí đang cầm là Khiên. */
  private isShieldActive(): boolean {
    return this.weapons[this.activeWeaponIndex] instanceof ShieldWeapon;
  }

  private startFortress(aim: Phaser.Math.Vector2): void {
    const shield = this.getShieldWeapon();

    if (!shield || this.fortress) {
      return;
    }

    this.fortress = new FortressStand(this, this.player, aim, {
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
    });
    this.player.setImmobilized(true);
    shield.setPlanted(aim.angle());
  }

  /** Kết thúc Bất Động Thành Lũy (mọi lý do): gỡ tường, mở khoá di chuyển, đặt hồi chiêu. */
  private stopFortress(time: number, toast = 'BẤT ĐỘNG THÀNH LŨY: TẮT'): void {
    const fortress = this.fortress;

    if (!fortress) {
      return;
    }

    this.fortress = null;
    fortress.end(fortress.isBroken());
    this.player.setImmobilized(false);
    this.getShieldWeapon()?.setPlanted(null);
    this.skillCooldownUntil.fortress_stand = time + FORTRESS_COOLDOWN_MS;
    this.hud.showToast(toast, '#6bd0ff');
  }

  /** Tiêu EN liên tục; tự kết thúc khi tường vỡ, hết EN, chết, vào làng hoặc không còn cầm Khiên. */
  private updateFortress(delta: number, inVillage: boolean): void {
    const fortress = this.fortress;

    if (!fortress) {
      return;
    }

    const time = this.time.now;

    if (this.player.isDead() || inVillage || !this.isShieldActive()) {
      this.stopFortress(time);
    } else if (fortress.isBroken()) {
      this.stopFortress(time, 'THÀNH LŨY ĐÃ VỠ');
    } else if (
      !this.player.consumeEnergy((FORTRESS_ENERGY_PER_SECOND * delta) / 1000)
    ) {
      this.stopFortress(time, 'HẾT NĂNG LƯỢNG · THÀNH LŨY TẮT');
    }
  }

  private activateWeapon(index: number): void {
    this.activeWeaponIndex = index;
    this.attackWasDown = false;
    this.weapons.forEach((weapon, weaponIndex) => {
      weapon?.setActive(weaponIndex === index);
    });
    this.applyDualGuardState();
  }

  private saveProgress(): void {
    // Một nguồn lưu (C4): PlayerState dựng save v8; không dựng được thì không ghi, không ném.
    let built: CharacterSaveV8 | null = null;
    let failure: unknown = null;

    try {
      built = this.playerState.toSave(
        {
          gold: this.village.getGold(),
          gems: { ...this.village.getGems() },
          sockets: this.village.getSocketsSnapshot(),
        },
        progressStore.get(this.characterId),
      );
    } catch (error) {
      failure = error;
    }

    if (built) {
      progressStore.commit(this.characterId, built);
    } else {
      console.error('saveProgress: không dựng được save v8, bỏ qua lần ghi', failure);

      if (!this.saveBridgeFailureToasted) {
        this.saveBridgeFailureToasted = true;
        this.hud?.showToast(
          'LƯU TIẾN TRÌNH THẤT BẠI — HÃY BÁO LỖI VÀ TẢI LẠI TRANG',
          '#ff8fa3',
        );
      }
    }
  }

  openCharacterPanel(
    tab: 'stats' | 'inventory' | 'skills' | 'equipment',
  ): void {
    if (this.panelOpen || this.player.isDead() || this.portalTraveling) {
      return;
    }

    this.panelOpen = true;
    this.portalChargeStartedAt = null;
    this.inputController.resetRequests();
    this.scene.launch(SCENE_KEYS.characterPanel, {
      tab,
      worldKey: this.scene.key,
    });
    this.scene.pause();
  }

  onPanelClosed(): void {
    this.panelOpen = false;
    this.inputController.resetRequests();
    this.touchControls?.reloadLayout();
  }

  /** Vẽ lại sprite Đấu sĩ theo mũ/giáp/giày đang mặc (chỉ khi ngoại hình đổi). */
  private refreshHeroLook(): void {
    if (this.character.style !== 'knight') {
      return;
    }

    const look = resolveGearLook(this.playerState.getEquippedGear());
    const key = gearLookKey(look);

    if (key === this.heroLookKey) {
      return;
    }

    this.heroLookKey = key;
    createPlaceholderPlayerSheet(
      this,
      this.character.textureKey,
      this.character.palette,
      this.character.style,
      look,
    );
  }

  private applyPlayerStatistics(): void {
    this.refreshHeroLook();
    const base = applyGearBonuses(
      this.playerState.getStatSheet().getCombatStats(),
      this.playerState.getEquippedGear(),
      this.playerState.getGearLevels(),
    );

    // Ngọc khảm trên đồ đang mặc.
    const gems = computeGemBonuses(
      this.playerState.getEquippedGear(),
      this.village.getSocketsSnapshot(),
    );

    this.gemBonuses = gems;

    // Kỹ năng bị động từ cây: giáp tối đa, sát thương theo máu đã mất, né đòn.
    const resist = { ...base.resist };

    for (const [type, value] of Object.entries(this.character.baseResist ?? {})) {
      resist[type as ElementType] = (resist[type as ElementType] ?? 0) + (value ?? 0);
    }

    this.player.applyStats({
      ...base,
      resist,
      maxHealthBonus: base.maxHealthBonus + gems.maxHealth,
      maxArmorBonus: base.maxArmorBonus + this.passives.maxArmor + gems.maxArmor,
      damageMultiplier:
        base.damageMultiplier *
        this.missingHealthMult *
        (1 + gems.damagePercent / 100),
      // Nhãn Quang cấp 5: tầm bắn +10%.
      bulletSpeedMultiplier: base.bulletSpeedMultiplier * this.passives.rangeMult,
    });
    this.player.setDodgeChance(this.passives.dodgeChance + gems.dodgePercent / 100);
    this.player.setArmorRegenSpeed(this.passives.armorRegenSpeed);
    this.player.setEnergyAbsorb(
      this.passives.energyAbsorb,
      this.passives.energyPerDamage,
    );
    this.player.onArmorBroken = () => this.triggerShatterWard();
    this.player.onDodge = () => this.refundCooldownsOnDodge();
    this.statusTuning.burnMult = 1 + this.passives.burnDamage;
    this.statusTuning.poisonMult = 1 + this.passives.poisonDamage;
    this.statusTuning.chillExtraMs = this.passives.chillExtraMs;
    this.player.configureQuickDraw(
      this.passives.quickDrawBonus,
      this.passives.quickDrawWindowMs,
    );
    this.player.configureMomentum(
      this.passives.momentumPerStack,
      this.passives.momentumMaxStacks,
      this.passives.momentumDurationMs,
    );
  }

  /** Huyết Hận: sát thương đổi theo máu đã mất; chỉ áp lại khi giá trị thật sự đổi. */
  private updateMissingHealthBonus(): void {
    const mult = getMissingHealthDamageMult(
      this.passives,
      this.player.getMaxHealth() - this.player.getHealth(),
    );

    if (Math.abs(mult - this.missingHealthMult) > 0.0005) {
      this.missingHealthMult = mult;
      this.applyPlayerStatistics();
    }
  }

  private refreshPassives(): void {
    this.passives = computePassiveBundle(
      this.characterId,
      this.playerState.getSkillLevels(),
    );
    this.missingHealthMult = getMissingHealthDamageMult(
      this.passives,
      this.player.getMaxHealth() - this.player.getHealth(),
    );
    this.applyPlayerStatistics();
  }

  getGearLevel(gearId: GearId): number {
    return this.playerState.getGearLevel(gearId);
  }

  addStatPoint(statId: StatId): boolean {
    if (!this.playerState.spendStatPoint(statId).ok) {
      return false;
    }

    this.applyPlayerStatistics();
    this.saveProgress();

    return true;
  }

  /**
   * Cấp đã học (0–5) của node cây gắn với skill live theo `LIVE_SKILL_NODE`.
   * Skill không gắn node nào (ví dụ Tàng Hình, kỹ năng Triệu Hồn Sư) luôn là 0.
   */
  private getSkillNodeLevel(skillId: SkillId): number {
    const nodeId = LIVE_SKILL_NODE[skillId];

    return nodeId ? this.playerState.getSkillLevel(nodeId) : 0;
  }

  /** Hồi chiêu sau khi tính cấp kỹ năng. Skill tích lượt giữ nguyên (CD là khoảng nghỉ giữa lượt). */
  private getEffectiveCooldown(skill: {
    id: SkillId;
    cooldownMs: number;
    usesDashCharges?: boolean;
  }): number {
    if (skill.usesDashCharges) {
      return skill.cooldownMs;
    }

    const base = Math.round(
      skill.cooldownMs * getSkillCooldownMult(this.getSkillNodeLevel(skill.id)),
    );

    // Quân Luật cấp 5: Tiếng Hô Chiến hồi nhanh hơn 2s.
    return skill.id === 'war_cry' && this.passives.warDisciplineLevel >= 5
      ? Math.max(1000, base - 2000)
      : base;
  }

  /** Điểm kỹ năng: tổng nhận (level − 1), đã tiêu, còn lại. Không lưu, luôn tính lại. */
  getSkillPointSummary(): {
    earned: number;
    spent: number;
    available: number;
  } {
    return this.playerState.getSkillPointSummary();
  }

  getSkillTreePanelState(): {
    level: number;
    earned: number;
    spent: number;
    available: number;
    freeRespec: boolean;
    nodes: {
      id: SkillNodeId;
      name: string;
      branchId: BranchId;
      kind: SkillKind;
      tier: SkillTier;
      maxLevel: number;
      level: number;
      unlocked: boolean;
      reasons: readonly string[];
      /** Tên skill live được nâng khi lên cấp node này; null = chưa có hiệu ứng. */
      linkedSkillName: string | null;
      /** Node bị động có hiệu ứng thật trong game. */
      passiveActive: boolean;
    }[];
  } {
    const level = this.playerState.getLevel();
    const skillLevels = this.playerState.getSkillLevels();

    return {
      level,
      ...this.getSkillPointSummary(),
      freeRespec: canRespecFree(level),
      nodes: getClassSkillNodes(this.characterId).map((node) => {
        const status = getUnlockStatus(node, level, skillLevels);

        return {
          id: node.id,
          name: node.name,
          branchId: node.branchId,
          kind: node.kind,
          tier: node.tier,
          maxLevel: node.maxLevel,
          level: skillLevels[node.id] ?? 0,
          unlocked: status.unlocked,
          reasons: status.reasons,
          linkedSkillName: (() => {
            const liveId = getLiveSkillForNode(node.id);

            return liveId ? getSkill(liveId).name : null;
          })(),
          passiveActive: hasPassiveEffect(node),
        };
      }),
    };
  }

  /** Học hoặc nâng 1 cấp. Thất bại không đổi dữ liệu và trả về lý do. */
  learnSkillNode(
    id: SkillNodeId,
  ): { ok: true } | { ok: false; reason: string } {
    const result = this.playerState.learnSkillNode(id, this.characterId);

    if (!result.ok) {
      return result;
    }

    this.refreshPassives();
    this.saveProgress();

    return { ok: true };
  }

  /** Hồi toàn bộ điểm kỹ năng; miễn phí tới Lv10, sau đó chưa có chi phí nên bị từ chối. */
  respecSkills(): boolean {
    if (!this.playerState.respecSkills().ok) {
      return false;
    }

    this.refreshPassives();
    this.saveProgress();

    return true;
  }

  equipWeaponFromInventory(weaponId: WeaponId, slot: 0 | 1): boolean {
    const result = this.playerState.equipWeapon(weaponId, slot);

    if (!result.ok) {
      if (result.reason === 'not_allowed') {
        this.hud.showToast(
          `${this.character.name} KHÔNG DÙNG ĐƯỢC ${WEAPON_INFO[weaponId].name}`,
          '#ff6b6b',
        );
      } else if (result.reason === 'in_other_slot') {
        const otherSlot: 0 | 1 = slot === 0 ? 1 : 0;

        this.hud.showToast(
          `${WEAPON_INFO[weaponId].name} ĐÃ Ở Ô ${otherSlot + 1}`,
          '#8b8fa3',
        );
      }

      return false;
    }

    const previous = this.weapons[slot];

    previous?.setActive(false);
    previous?.destroy();

    const weapon = this.createWeaponById(weaponId);

    this.weapons[slot] = weapon;
    weapon.setActive(slot === this.activeWeaponIndex);
    this.attackWasDown = false;
    this.saveProgress();
    this.hud.showToast(
      `${WEAPON_INFO[weaponId].name} ĐÃ TRANG BỊ [${slot + 1}]`,
      NEON_CSS.gold,
    );

    return true;
  }

  unequipWeapon(slot: 0 | 1): boolean {
    const weapon = this.weapons[slot];

    if (!weapon) {
      return false;
    }

    weapon.setActive(false);
    weapon.destroy();
    this.weapons[slot] = null;
    this.playerState.unequipWeapon(slot);
    this.attackWasDown = false;

    if (this.activeWeaponIndex === slot) {
      const otherSlot: 0 | 1 = slot === 0 ? 1 : 0;

      if (this.weapons[otherSlot]) {
        this.activateWeapon(otherSlot);
      }
    }

    this.saveProgress();
    this.hud.showToast(
      `${WEAPON_INFO[weapon.id].name} ĐÃ THÁO`,
      '#8b8fa3',
    );

    return true;
  }

  equipGearFromInventory(gearId: GearId): boolean {
    if (!this.playerState.equipGear(gearId).ok) {
      return false;
    }

    const info = GEAR_INFO[gearId];

    this.applyPlayerStatistics();
    this.saveProgress();
    this.hud.showToast(
      `${info.name} ĐÃ TRANG BỊ · ${GEAR_SLOT_LABELS[info.slot]}`,
      info.colorCss,
    );

    return true;
  }

  unequipGear(slot: GearSlot): boolean {
    const unequipped = this.playerState.unequipGear(slot);

    if (!unequipped.ok) {
      return false;
    }

    const gearId = unequipped.id;

    this.applyPlayerStatistics();
    this.saveProgress();
    this.hud.showToast(
      `${GEAR_INFO[gearId].name} ĐÃ THÁO`,
      '#8b8fa3',
    );

    return true;
  }

  discardWeapon(weaponId: WeaponId): boolean {
    const result = this.playerState.discardWeapon(weaponId);

    if (!result.ok) {
      if (result.reason === 'equipped') {
        this.hud.showToast('HÃY THÁO RA TRƯỚC KHI VỨT BỎ', '#ff8fa3');
      }

      return false;
    }

    this.saveProgress();
    this.hud.showToast(
      `${WEAPON_INFO[weaponId].name} ĐÃ VỨT BỎ`,
      '#8b8fa3',
    );

    return true;
  }

  discardGear(gearId: GearId): boolean {
    const result = this.playerState.discardGear(gearId);

    if (!result.ok) {
      if (result.reason === 'equipped') {
        this.hud.showToast('HÃY THÁO RA TRƯỚC KHI VỨT BỎ', '#ff8fa3');
      }

      return false;
    }

    this.village.releaseGear(gearId);
    this.saveProgress();
    this.hud.showToast(
      `${GEAR_INFO[gearId].name} ĐÃ VỨT BỎ`,
      '#8b8fa3',
    );

    return true;
  }

  getCharacterId(): CharacterId {
    return this.characterId;
  }

  getCharacterName(): string {
    return this.character.name;
  }

  getStatPanelState(): {
    characterName: string;
    level: number;
    statPoints: number;
    allocation: StatAllocation;
    maxHealth: number;
    maxArmor: number;
    maxEnergy: number;
    /** Sức đánh hiển thị (100 = gốc; mỗi điểm Sức mạnh +10, trang bị/ngọc cộng %). */
    attackPower: number;
    damagePercent: number;
    cooldownPercent: number;
    speedPercent: number;
    /** Kháng nguyên tố hiệu dụng (điểm %, sau khi chặn trần). */
    resistPercent: Record<ElementType, number>;
  } {
    const baseStats = this.playerState.getStatSheet().getCombatStats();
    const stats = this.player.getStats();

    return {
      characterName: this.character.name,
      level: this.playerState.getLevel(),
      statPoints: this.playerState.getStatPoints(),
      allocation: this.playerState.getAllocation(),
      maxHealth: toDisplayHealth(this.player.getMaxHealth()),
      maxArmor: toDisplayHealth(this.player.getMaxArmor()),
      maxEnergy: toDisplayEnergy(this.player.getMaxEnergy()),
      attackPower: Math.round(ATTACK_POWER_BASE * stats.damageMultiplier),
      damagePercent: Math.round((stats.damageMultiplier - 1) * 100),
      cooldownPercent: Math.round((1 - baseStats.cooldownMultiplier) * 100),
      speedPercent: Math.round((stats.moveSpeedMultiplier - 1) * 100),
      resistPercent: Object.fromEntries(
        ELEMENT_TYPES.map((type) => [
          type,
          Math.round(
            effectiveResist(type, {}, { resist: stats.resist }) * 100,
          ),
        ]),
      ) as Record<ElementType, number>,
    };
  }

  getInventoryPanelState(): {
    inventory: WeaponId[];
    equipped: [WeaponId | null, WeaponId | null];
  } {
    return {
      inventory: this.playerState.getWeapons(),
      equipped: this.playerState.getEquippedWeapons(),
    };
  }

  getEquipmentPanelState(): {
    characterName: string;
    level: number;
    weapons: { slot: 0 | 1; weaponId: WeaponId | null }[];
    gear: { slot: GearSlot; gearId: GearId | null }[];
    weaponInventory: WeaponId[];
    gearInventory: GearId[];
  } {
    const equippedGear = this.playerState.getEquippedGear();
    const equippedGearIds = Object.values(equippedGear);
    const equippedWeapons = this.playerState.getEquippedWeapons();

    return {
      characterName: this.character.name,
      level: this.playerState.getLevel(),
      weapons: [
        { slot: 0, weaponId: equippedWeapons[0] },
        { slot: 1, weaponId: equippedWeapons[1] },
      ],
      gear: [
        { slot: 'hat', gearId: equippedGear.hat },
        { slot: 'armor', gearId: equippedGear.armor },
        { slot: 'boots', gearId: equippedGear.boots },
      ],
      weaponInventory: this.playerState
        .getWeapons()
        .filter((weaponId) => !equippedWeapons.includes(weaponId)),
      gearInventory: this.playerState
        .getGear()
        .filter((gearId) => !equippedGearIds.includes(gearId)),
    };
  }

  /** Kỹ năng từ cây đã học node chưa (kỹ năng không đòi node luôn true). */
  private isNodeLearned(skill: SkillDefinition): boolean {
    return (
      !skill.requiresNode ||
      this.playerState.getSkillLevel(skill.requiresNode) >= 1
    );
  }

  /** Dùng/gán được: đủ level và (nếu là kỹ năng từ cây) đã học node. */
  private isSkillUsable(skill: SkillDefinition): boolean {
    return (
      this.playerState.getLevel() >= skill.unlockLevel &&
      this.isNodeLearned(skill)
    );
  }

  private getSkillLockLabel(skill: SkillDefinition): string {
    return skill.requiresNode && !this.isNodeLearned(skill)
      ? 'CÂY'
      : `LV${skill.unlockLevel}`;
  }

  /** Dựng lại 7 ô từ 3 ô chính + 4 ô phụ. */
  private rebuildSkills(): void {
    this.skills = this.playerState
      .getSlotIds()
      .map((id) => (id ? getSkill(id) : null));
  }

  private getSlotIds(): (SkillId | null)[] {
    return this.playerState.getSlotIds();
  }

  /** Gán kỹ năng vào ô 0–6 (0–2 chính, 3–6 phụ). Kỹ năng đã nằm ở ô khác sẽ hoán đổi. */
  assignSkillToSlot(skillId: SkillId, slot: number): boolean {
    const result = this.playerState.assignSkill(skillId, slot);

    if (!result.ok) {
      if (result.reason === 'not_learned' || result.reason === 'level_locked') {
        const locked = getSkill(skillId);

        this.hud.showToast(
          result.reason === 'not_learned'
            ? `${locked.name}: HỌC TRONG CÂY KỸ NĂNG`
            : `${locked.name} KHOÁ ĐẾN LV${locked.unlockLevel}`,
          '#8b8fa3',
        );
      } else if (result.reason === 'main_slot_empty') {
        this.hud.showToast('Ô CHÍNH KHÔNG ĐƯỢC ĐỂ TRỐNG', '#ff8fa3');
      }

      return false;
    }

    const skill = getSkill(skillId);

    this.rebuildSkills();
    this.saveProgress();
    this.hud.showToast(`${skill.name} → Ô ${slot + 3}`, skill.colorCss);

    return true;
  }

  /** Bỏ kỹ năng khỏi ô phụ (3–6). */
  clearSkillSlot(slot: number): boolean {
    if (!this.playerState.clearSkillSlot(slot).ok) {
      return false;
    }

    this.rebuildSkills();
    this.saveProgress();

    return true;
  }

  private getSkillSlot(skillId: SkillId): number | null {
    const index = this.getSlotIds().indexOf(skillId);

    return index === -1 ? null : index;
  }

  getSkillsPanelState(): {
    characterName: string;
    level: number;
    skills: {
      id: SkillId;
      icon: string;
      name: string;
      description: string;
      unlockLevel: number;
      cooldownMs: number;
      energyCost: number;
      colorCss: string;
      color: number;
      unlocked: boolean;
      /** Chữ khi khoá: "LV7" hoặc "CÂY" (chưa học node). */
      lockLabel: string;
      assignedSlot: number | null;
    }[];
    /** 7 ô: 0–2 chính, 3–6 phụ (null = trống). */
    loadout: (SkillId | null)[];
  } {
    const level = this.playerState.getLevel();

    return {
      characterName: this.character.name,
      level,
      skills: this.allSkills.map((skill) => ({
        id: skill.id,
        icon: skill.icon,
        name: skill.name,
        description: skill.description,
        unlockLevel: skill.unlockLevel,
        cooldownMs: this.getEffectiveCooldown(skill),
        energyCost: skill.energyCost,
        colorCss: skill.colorCss,
        color: skill.color,
        unlocked: this.isSkillUsable(skill),
        lockLabel: this.getSkillLockLabel(skill),
        assignedSlot: this.getSkillSlot(skill.id),
      })),
      loadout: this.getSlotIds(),
    };
  }

  private updateChests(): void {
    const interact = this.inputController.consumeInteractRequest();

    if (this.player.isDead()) {
      this.hud.setInteractPrompt(null);
      this.portalChargeStartedAt = null;
      return;
    }

    let nearestOpened: WeaponChest | null = null;
    let nearestOpenedDistance = Number.POSITIVE_INFINITY;
    let nearestClosed: WeaponChest | null = null;
    let nearestClosedDistance = Number.POSITIVE_INFINITY;

    for (const chest of this.chests) {
      if (!chest.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        chest.x,
        chest.y,
      );

      // Chạm vào hòm → tự mở và lộ vũ khí.
      if (!chest.isOpened() && distance <= CHEST_OPEN_RADIUS) {
        this.openChest(chest);
      }

      if (chest.isOpened()) {
        if (
          distance <= CHEST_INTERACT_RADIUS &&
          distance < nearestOpenedDistance
        ) {
          nearestOpened = chest;
          nearestOpenedDistance = distance;
        }
      } else if (
        distance <= CHEST_INTERACT_RADIUS &&
        distance < nearestClosedDistance
      ) {
        nearestClosed = chest;
        nearestClosedDistance = distance;
      }
    }

    const nearNpc = this.getNearbyNpc();
    const portal = this.town.portal ?? null;
    const nearPortal =
      portal !== null &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        portal.x,
        portal.y,
      ) <= BOSS_ARENA_PORTAL_INTERACT_RADIUS;
    const now = this.time.now;

    this.inputController.setPickupAvailable(
      nearestOpened !== null || nearNpc !== null || nearPortal,
    );
    this.updatePortalCharge(now, nearPortal);

    if (nearestOpened) {
      this.hud.setInteractPrompt(
        this.touchControls
          ? `CHẠM NÚT ĐÁNH ĐỂ NHẶT ${nearestOpened.getItemName()}`
          : `NHẤN F ĐỂ NHẶT ${nearestOpened.getItemName()}`,
      );
    } else if (nearNpc) {
      this.hud.setInteractPrompt(
        this.touchControls
          ? `CHẠM NÚT ĐÁNH ĐỂ NÓI CHUYỆN VỚI ${nearNpc.spec.name}`
          : `NHẤN F ĐỂ NÓI CHUYỆN VỚI ${nearNpc.spec.name}`,
      );
    } else if (nearPortal && portal) {
      this.hud.setInteractPrompt(this.getPortalPrompt(portal));
    } else if (nearestClosed) {
      this.hud.setInteractPrompt('CHẠM HÒM ĐỂ MỞ');
    } else {
      this.hud.setInteractPrompt(null);
    }

    if (interact) {
      if (nearestOpened) {
        this.pickUpChest(nearestOpened);
      } else if (nearNpc) {
        this.openVillageShop(nearNpc.role);
      } else if (nearPortal && portal) {
        this.tryStartPortalCharge(portal, now);
      }
    }
  }

  // ---- Cổng dịch chuyển (vào/ra Đấu Trường Boss) ----

  private getWorldFacts(): WorldFacts {
    return {
      bossAlive: this.boss !== null,
      bossReady: this.bossReady,
      playerLevel: this.playerState.getLevel(),
    };
  }

  private getPortalDeny(portal: ScenePortal, time: number): PortalDenyReason | null {
    return evaluateConnection(this.getPortalConnection(portal), this.getWorldFacts(), {
      panelOpen: this.panelOpen,
      playerDead: this.player.isDead(),
      now: time,
      portalCooldownUntil: this.portalCooldownUntil,
      leaping: this.player.isLeaping(),
      traveling: this.portalTraveling,
    });
  }

  /**
   * NGUỒN DUY NHẤT của "cổng đang khóa vì Boss" (toast, prompt, trạng thái khóa visual dùng chung).
   * Đầu vào truy cập trung tính (evaluateConnection mặc định) nên chỉ còn lý do 'boss_alive' có thể xảy ra.
   */
  private isPortalLockedByBoss(portal: ScenePortal): boolean {
    return (
      evaluateConnection(this.getPortalConnection(portal), this.getWorldFacts()) === 'boss_alive'
    );
  }

  private getPortalPrompt(portal: ScenePortal): string {
    if (this.portalChargeStartedAt !== null) {
      return 'ĐANG KÍCH HOẠT CỔNG…';
    }

    if (this.isPortalLockedByBoss(portal)) {
      return 'CỔNG KHÓA — HẠ TRÙM ĐỂ MỞ';
    }

    const action = portal.kind === 'enter' ? 'VÀO ĐẤU TRƯỜNG' : 'VỀ LÀNG';

    return this.touchControls
      ? `CHẠM NÚT ĐÁNH ĐỂ ${action}`
      : `NHẤN F ĐỂ ${action}`;
  }

  private tryStartPortalCharge(portal: ScenePortal, time: number): void {
    if (this.portalChargeStartedAt !== null) {
      return;
    }

    const reason = this.getPortalDeny(portal, time);

    if (reason !== null) {
      if (isPortalDenyToastWorthy(reason) && time - this.lastPortalToastAt > BOSS_ARENA_PORTAL_TOAST_COOLDOWN_MS) {
        this.lastPortalToastAt = time;
        this.hud.showToast('CỔNG KHÓA — HẠ TRÙM ĐỂ MỞ', NEON_CSS.rose);
      }

      return;
    }

    this.portalChargeStartedAt = time;

    // Rời đi khi còn vật phẩm trên sàn: chỉ cảnh báo, không chặn.
    if (this.drops.length > 0 || this.chests.some((chest) => chest.active)) {
      this.hud.showToast('CÒN VẬT PHẨM TRÊN SÀN — SẼ MẤT KHI RỜI ĐI', NEON_CSS.gold);
    }
  }

  /** Cập nhật vòng sạc: hủy nếu rời cổng/bị từ chối, đủ thời gian thì chuyển scene. */
  private updatePortalCharge(time: number, nearPortal: boolean): void {
    const portal = this.town.portal;

    if (this.portalChargeStartedAt === null || !portal) {
      return;
    }

    if (!nearPortal || this.getPortalDeny(portal, time) !== null) {
      this.portalChargeStartedAt = null;
      portal.visual.setCharge(0);
      return;
    }

    const progress = getPortalChargeProgress(
      time,
      this.portalChargeStartedAt,
      BOSS_ARENA_PORTAL_CHARGE_MS,
    );

    portal.visual.setCharge(progress);

    if (progress >= 1) {
      this.startPortalTravel(portal, time);
    }
  }

  /** Lưu tiến trình, chụp RunSession rồi mờ màn hình và stop→start sang scene đích. */
  private startPortalTravel(portal: ScenePortal, time: number): void {
    const connection = this.getPortalConnection(portal);
    const targetMap = findMap(WORLD, connection.to.mapId);

    if (targetMap === null) {
      throw new Error(`Không tìm thấy map đích trong WORLD: ${connection.to.mapId}`);
    }

    const fade =
      connection.direction === 'enter' ? BOSS_ARENA_FADE_TO_ARENA : BOSS_ARENA_FADE_TO_WORLD;

    this.portalTraveling = true;
    this.portalChargeStartedAt = null;
    this.endSkillStatesForTravel();
    portal.visual.setCharge(0);
    portal.visual.playActivate();
    this.inputController.resetRequests();
    this.player.setImmobilized(true);
    this.player.setVelocity(0, 0);
    this.player.grantInvulnerability(
      time,
      BOSS_ARENA_PORTAL_FADE_MS + BOSS_ARENA_PORTAL_EXTRA_INVULNERABLE_MS,
    );
    this.hud.setInteractPrompt(null);

    this.saveProgress();
    this.registry.set(
      RUN_SESSION_REGISTRY_KEY,
      captureRunSession(this.player, {
        skillCooldownUntil: this.skillCooldownUntil,
        runStartedAt: this.runStartedAt,
        nextBossAt: this.nextBossAt,
        bossNumber: this.bossNumber,
        bossReady: this.bossReady,
        bossWarningShown: this.bossWarningShown,
      }),
    );

    const targetKey = targetMap.sceneKey;
    const camera = this.cameras.main;

    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetKey, { characterId: this.characterId });
    });
    camera.fadeOut(BOSS_ARENA_PORTAL_FADE_MS, fade.r, fade.g, fade.b);
  }

  private updatePortalVisual(time: number): void {
    const portal = this.town.portal;

    if (!portal) {
      return;
    }

    portal.visual.setLocked(this.isPortalLockedByBoss(portal));
    portal.visual.update(time);
  }

  // ---- Làng, vàng, ngọc ----

  private getNearbyNpc(): Npc | null {
    let nearest: Npc | null = null;
    let nearestDistance = NPC_INTERACT_RADIUS;

    for (const npc of this.town.npcs) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.x,
        npc.y,
      );

      if (distance <= nearestDistance) {
        nearest = npc;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  /** Mở cửa hàng của NPC (thương nhân / thợ rèn) và tạm dừng thế giới. */
  openVillageShop(role: NpcRole): void {
    if (this.panelOpen || this.player.isDead()) {
      return;
    }

    this.panelOpen = true;
    this.portalChargeStartedAt = null;
    this.inputController.resetRequests();
    this.hud.setInteractPrompt(null);
    this.scene.launch(SCENE_KEYS.villageShop, { role });
    this.scene.pause();
  }

  getVillage(): VillageService {
    return this.village;
  }

  /** Túi đồ cho UI làng: vũ khí/trang bị đang sở hữu kèm trạng thái đang dùng. */
  getVillageInventory(): {
    weapons: { id: WeaponId; equipped: boolean; starting: boolean }[];
    gear: { id: GearId; equipped: boolean; level: number }[];
  } {
    const equippedWeapons = this.playerState.getEquippedWeapons();

    return {
      weapons: this.playerState.getWeapons().map((id) => ({
        id,
        equipped: equippedWeapons.includes(id),
        starting: this.character.startingWeapons.includes(id),
      })),
      gear: this.playerState.getGear().map((id) => ({
        id,
        equipped: Object.values(this.playerState.getEquippedGear()).includes(id),
        level: this.playerState.getGearLevel(id),
      })),
    };
  }

  getGemBonuses(): Readonly<GemBonuses> {
    return this.gemBonuses;
  }

  private createVillageHost(): VillageHost {
    return {
      getAllowedWeapons: () => this.character.allowedWeapons,
      isStartingWeapon: (id) => this.character.startingWeapons.includes(id),
      ownsWeapon: (id) => this.playerState.ownsWeapon(id),
      isWeaponEquipped: (id) => this.playerState.getEquippedWeapons().includes(id),
      addWeapon: (id) => {
        this.playerState.addWeapon(id);
      },
      removeWeapon: (id) => {
        this.playerState.removeWeapon(id);
      },
      ownsGear: (id) => this.playerState.ownsGear(id),
      isGearEquipped: (id) =>
        Object.values(this.playerState.getEquippedGear()).includes(id),
      addGear: (id) => {
        this.playerState.addGear(id);
      },
      removeGear: (id) => {
        this.playerState.removeGear(id);
      },
      getGearLevel: (id) => this.playerState.getGearLevel(id),
      setGearLevel: (id, level) => {
        this.playerState.setGearLevel(id, level);
      },
      onChanged: () => {
        this.applyPlayerStatistics();
        this.hud.setGold(this.village.getGold());
        this.saveProgress();
      },
    };
  }

  /** Quái chết: có cơ hội rơi vàng và ngọc (tỉ lệ ở `economyConfig`). */
  private dropLoot(x: number, y: number, tier: number): void {
    if (Math.random() < GOLD_DROP_CHANCE) {
      this.spawnDrop(
        x,
        y,
        'gold',
        Phaser.Math.Between(GOLD_DROP_MIN, GOLD_DROP_MAX) +
          tier * GOLD_PER_THREAT_TIER,
      );
    }

    if (Math.random() < GEM_DROP_CHANCE) {
      this.spawnDrop(x, y, 'gem', Phaser.Utils.Array.GetRandom(GEM_IDS));
    }
  }

  private dropBossLoot(x: number, y: number): void {
    const gold = BOSS_GOLD_BASE + this.bossNumber * BOSS_GOLD_PER_NUMBER;
    const chunks = 6;

    for (let i = 0; i < chunks; i += 1) {
      this.spawnDrop(x, y, 'gold', Math.ceil(gold / chunks));
    }

    for (let i = 0; i < BOSS_GEM_COUNT; i += 1) {
      this.spawnDrop(x, y, 'gem', Phaser.Utils.Array.GetRandom(GEM_IDS));
    }
  }

  private spawnDrop(
    x: number,
    y: number,
    kind: 'gold' | 'gem',
    payload: number | string,
  ): void {
    if (this.drops.length >= MAX_DROPS_ALIVE) {
      this.drops.shift()?.destroy();
    }

    const tint =
      kind === 'gem' ? GEM_INFO[payload as GemId].color : undefined;

    this.drops.push(new LootDrop(this, x, y, kind, payload, tint));
  }

  private collectDrop(drop: LootDrop): void {
    if (drop.kind === 'gold') {
      const amount = drop.payload as number;

      this.village.addGold(amount);
      this.floatText(drop.x, drop.y, `+${amount}`, '#ffd24a');
    } else {
      const gem = drop.payload as GemId;

      this.village.addGem(gem);
      this.floatText(
        drop.x,
        drop.y,
        `+1 ${GEM_INFO[gem].name}`,
        GEM_INFO[gem].colorCss,
      );
    }

    this.hud.setGold(this.village.getGold());
    this.lootDirty = true;
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y - 16, text, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color,
        fontStyle: 'bold',
        stroke: '#0b0c12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9000);

    this.tweens.add({
      targets: label,
      y: label.y - 28,
      alpha: 0,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  private updateLootDrops(time: number, delta: number): void {
    if (!this.player.isDead()) {
      for (let i = this.drops.length - 1; i >= 0; i -= 1) {
        const drop = this.drops[i];

        if (
          drop.step(time, delta, this.player.x, this.player.y, () =>
            this.collectDrop(drop),
          )
        ) {
          drop.destroy();
          this.drops.splice(i, 1);
        }
      }
    }

    // Gộp lần lưu: nhặt liên tục không ghi localStorage mỗi lần.
    if (this.lootDirty && time - this.lastLootSaveAt > 2000) {
      this.lootDirty = false;
      this.lastLootSaveAt = time;
      this.saveProgress();
    }
  }

  /** Ngọc Phản Đòn: bị đánh thì phản sát thương cho kẻ địch gần nhất. */
  private reflectThorns(): void {
    const damage = this.gemBonuses.thornsDamage;

    if (damage <= 0) {
      return;
    }

    let target: EnemyBase | null = null;
    let best = THORNS_RANGE;

    for (const enemy of this.getEnemies()) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );

      if (enemy.isAlive() && distance <= best) {
        target = enemy;
        best = distance;
      }
    }

    if (target) {
      target.takeDamage(damage, this.player.x, this.player.y);
      spawnHitSpark(this, target.x, target.y, GEM_INFO.thorns.color);
    }
  }

  /** Khu làng an toàn: báo vào/ra, quái lọt vào bị đẩy ra ngoài. */
  private updateVillage(): void {
    const inside = this.isSafeZonePoint(this.player.x, this.player.y);

    // Làng cách biệt hoàn toàn: người chơi bất khả xâm phạm, đạn quái bị xoá.
    this.player.setSafeZone(inside);

    for (const bullet of this.enemyBullets.getChildren()) {
      if (
        bullet instanceof Phaser.Physics.Arcade.Sprite &&
        bullet.active &&
        this.isSafeZonePoint(bullet.x, bullet.y)
      ) {
        bullet.disableBody(true, true);
      }
    }

    if (inside !== this.insideVillage) {
      this.insideVillage = inside;
      this.hud.showToast(
        inside ? 'VÀO LÀNG — KHU AN TOÀN' : 'RỜI LÀNG — CẨN THẬN!',
        inside ? NEON_CSS.emerald : NEON_CSS.rose,
      );
    }

    const centerX = VILLAGE_ZONE.x + VILLAGE_ZONE.width / 2;
    const centerY = VILLAGE_ZONE.y + VILLAGE_ZONE.height / 2;

    for (const enemy of this.getEnemies()) {
      if (enemy.isAlive() && this.isSafeZonePoint(enemy.x, enemy.y)) {
        const away = new Phaser.Math.Vector2(
          enemy.x - centerX,
          enemy.y - centerY,
        );

        if (away.lengthSq() === 0) {
          away.set(1, 0);
        }

        away.normalize().scale(VILLAGE_REPEL_SPEED);
        enemy.setVelocity(away.x, away.y);
      }
    }
  }

  private maybeDropWeaponChest(x: number, y: number): void {
    if (Math.random() < LEGENDARY_CHEST_DROP_CHANCE) {
      const legendaryCount = this.chests.filter((chest) =>
        chest.isLegendary(),
      ).length;

      if (legendaryCount < MAX_LEGENDARY_CHESTS) {
        this.spawnWeaponChest(x, y, true);
      }

      return;
    }

    const normalCount = this.chests.filter(
      (chest) => !chest.isLegendary(),
    ).length;

    if (normalCount >= MAX_WEAPON_CHESTS) {
      return;
    }

    if (Math.random() >= WEAPON_CHEST_DROP_CHANCE) {
      return;
    }

    this.spawnWeaponChest(x, y, false);
  }

  private spawnWeaponChest(
    x: number,
    y: number,
    legendary: boolean,
  ): void {
    const margin = WALL_THICKNESS + 24;
    const chest = new WeaponChest(
      this,
      Phaser.Math.Clamp(x, margin, WORLD_WIDTH - margin),
      Phaser.Math.Clamp(y, margin, WORLD_HEIGHT - margin),
      legendary,
    );

    this.chests.push(chest);

    if (legendary) {
      this.hud.showToast('HÒM HUYỀN THOẠI!', '#ffb347');
      spawnRing(this, chest.x, chest.y, 90, NEON.legendary, 500);
      spawnGlow(this, chest.x, chest.y, NEON.legendary, 1.8, 500);
    }

    this.time.delayedCall(
      legendary ? LEGENDARY_CHEST_LIFETIME_MS : CHEST_LIFETIME_MS,
      () => {
        if (chest.active) {
          this.removeChest(chest);
        }
      },
    );
  }

  private openChest(chest: WeaponChest): void {
    // Hòm chỉ rơi vũ khí lớp này dùng được; trang bị (gear) giữ nguyên.
    const pool = (
      chest.isLegendary() ? LEGENDARY_LOOT_IDS : NORMAL_LOOT_IDS
    ).filter((id) => !isWeaponId(id) || this.character.allowedWeapons.includes(id));
    // Chọn theo trọng số (`CHEST_LOOT_WEIGHTS`, mặc định 1).
    const weightOf = (lootId: LootId): number =>
      CHEST_LOOT_WEIGHTS[lootId] ?? 1;
    let roll =
      Math.random() * pool.reduce((sum, lootId) => sum + weightOf(lootId), 0);
    let id = pool[pool.length - 1];

    for (const candidate of pool) {
      roll -= weightOf(candidate);

      if (roll < 0) {
        id = candidate;
        break;
      }
    }

    chest.open(id, getLootName(id), getLootTexture(id));
  }

  private pickUpChest(chest: WeaponChest): void {
    const id = chest.getItemId();

    if (!id || (!isWeaponId(id) && !isGearId(id))) {
      return;
    }

    spawnBurst(this, chest.x, chest.y, NEON.chest, 8, 100);
    this.removeChest(chest);
    this.hud.setInteractPrompt(null);

    if (isGearId(id)) {
      const info = GEAR_INFO[id];

      if (!this.playerState.addGear(id).ok) {
        this.hud.showToast(`${info.name} ĐÃ SỞ HỮU`, '#8b8fa3');
        return;
      }

      this.saveProgress();
      this.hud.showToast(
        `${info.name} ĐÃ THÊM VÀO TRANG BỊ`,
        NEON_CSS.gold,
      );
      return;
    }

    if (!this.playerState.addWeapon(id).ok) {
      this.hud.showToast(
        `${WEAPON_INFO[id].name} ĐÃ SỞ HỮU`,
        '#8b8fa3',
      );
      return;
    }

    this.saveProgress();
    this.hud.showToast(
      `${WEAPON_INFO[id].name} ĐÃ THÊM VÀO TÚI ĐỒ`,
      NEON_CSS.gold,
    );
  }

  private removeChest(chest: WeaponChest): void {
    this.chests = this.chests.filter((item) => item !== chest);

    if (chest.active) {
      chest.destroy();
    }
  }

  private createWeaponById(id: WeaponId): Weapon {
    switch (id) {
      case 'sword':
        return new SwordWeapon(this, this.player, () => this.getEnemies());
      case 'shield':
        return new ShieldWeapon(this, this.player, () => this.getEnemies());
      case 'blaster':
        return new BlasterWeapon(this, this.player, this.bullets);
      case 'bow':
        return new BowWeapon(this, this.player, this.bullets);
      case 'scythe':
        return new ScytheWeapon(this, this.player, () => this.getEnemies());
      case 'dual_blades':
        return new DualBladesWeapon(this, this.player, () => this.getEnemies());
      case 'hammer':
        return new HammerWeapon(this, this.player, () => this.getEnemies());
      case 'staff':
        return new StaffWeapon(this, this.player, this.bullets);
      case 'wand':
        return new StaffWeapon(this, this.player, this.bullets, WAND_WEAPON_CONFIG);
      case 'excalibur':
        return new ExcaliburWeapon(this, this.player, () =>
          this.getEnemies(),
        );
      case 'dragon_bow':
        return new DragonBowWeapon(
          this,
          this.player,
          this.bullets,
          (x, y, radius, damage) =>
            this.explodeAt(x, y, radius, damage, 0xff8a4d),
        );
      case 'void_staff':
        return new VoidStaffWeapon(this, this.player);
    }
  }

  private explodeAt(
    x: number,
    y: number,
    radius: number,
    damage: number,
    color = 0xff8a4d,
  ): void {
    for (const enemy of this.getEnemies()) {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

      if (distance <= radius) {
        enemy.takeDamage(damage, x, y);
        spawnHitSpark(this, enemy.x, enemy.y, color);
      }
    }

    spawnRing(this, x, y, radius, color, 300);
    spawnGlow(this, x, y, color, 1.6, 300);
    spawnBurst(this, x, y, color, 10, 140);
    this.cameras.main.shake(100, 0.004);
  }

  /**
   * Cảm ứng: khi không kéo joystick ngắm, tự quay về quái còn sống gần nhất
   * (trong tầm AUTO_AIM_RANGE). Không có quái thì giữ hướng ngắm cũ.
   */
  private updateAutoAim(): void {
    if (!this.touchControls || this.player.isDead()) {
      return;
    }

    // Kiếm đánh combo nên giữ mục tiêu hiện tại khi còn hợp lệ; vũ khí khác chọn gần nhất mỗi frame như cũ.
    const stickyAim = this.weapons[this.activeWeaponIndex]?.id === 'sword';
    const nearest = stickyAim
      ? (this.autoAimTarget = findStickyTarget(
          this.autoAimTarget,
          this.getEnemies(),
          this.player.x,
          this.player.y,
          AUTO_AIM_RANGE,
        ))
      : findNearestEnemy(
          this.getEnemies(),
          this.player.x,
          this.player.y,
          AUTO_AIM_RANGE,
        );

    if (nearest) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        nearest.x,
        nearest.y,
      );

      this.touchControls.setAutoAim(Math.cos(angle), Math.sin(angle));
    } else {
      // Không có quái: ngắm theo hướng đang chạy.
      const move = this.touchControls.getMoveVector();

      if (move.lengthSq() > 0) {
        this.touchControls.setAutoAim(move.x, move.y);
      }
    }
  }

  /** Danh sách quái còn sống; cache trong cùng một frame để tránh cấp phát lặp. */
  private enemyCache: EnemyBase[] = [];
  private enemyCacheFrame = -1;

  protected getEnemies(): EnemyBase[] {
    const frame = this.game.getFrame();

    if (frame !== this.enemyCacheFrame) {
      this.enemyCacheFrame = frame;
      this.enemyCache = this.enemies
        .getChildren()
        .filter(
          (child): child is EnemyBase =>
            child instanceof EnemyBase && child.isAlive(),
        );
    }

    return this.enemyCache.filter((enemy) => enemy.isAlive());
  }

}
