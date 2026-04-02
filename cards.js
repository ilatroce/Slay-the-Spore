/**
 * Shared card definitions and combat effect logic for Slay the Spore.
 */

const RUNTIME_CARD_ART_DIR = 'CardAssets';
const cardImagePreloadCache = new Map();

function getRuntimeCardImagePath(sourcePath) {
  const cleanPath = String(sourcePath || '').trim();
  if (!cleanPath) return cleanPath;

  const segments = cleanPath.split(/[\\/]/);
  const filename = segments[segments.length - 1];
  return filename ? `${RUNTIME_CARD_ART_DIR}/${filename}` : cleanPath;
}

function applyRuntimeCardImagePaths(cards) {
  cards.forEach((card) => {
    if (!card || typeof card !== 'object') return;

    const originalImg = String(card.originalImg || card.img || '').trim();
    if (!originalImg) return;

    card.originalImg = originalImg;
    card.img = getRuntimeCardImagePath(originalImg);
  });
}

function preloadCardImages(cards) {
  if (typeof Image === 'undefined') {
    return Promise.resolve([]);
  }

  const list = Array.isArray(cards) ? cards.filter(Boolean) : [cards].filter(Boolean);
  const relatedCardsByPath = new Map();

  list.forEach((entry) => {
    if (!entry || typeof entry === 'string') return;

    const runtimePath = getRuntimeCardImagePath(entry.originalImg || entry.img);
    if (!runtimePath) return;

    if (!relatedCardsByPath.has(runtimePath)) {
      relatedCardsByPath.set(runtimePath, []);
    }

    relatedCardsByPath.get(runtimePath).push(entry);
  });

  const uniquePaths = [...new Set(
    list
      .map((entry) => {
        if (typeof entry === 'string') {
          return getRuntimeCardImagePath(entry);
        }

        return getRuntimeCardImagePath(entry.originalImg || entry.img);
      })
      .filter(Boolean)
  )];

  return Promise.all(uniquePaths.map((path) => {
    if (cardImagePreloadCache.has(path)) {
      return cardImagePreloadCache.get(path);
    }

    const preloadPromise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().catch(() => undefined).finally(() => resolve(path));
          return;
        }

        resolve(path);
      };

      img.onerror = () => {
        const fallbackCards = relatedCardsByPath.get(path) || [];
        fallbackCards.forEach((card) => {
          if (card?.originalImg) {
            card.img = card.originalImg;
          }
        });
        resolve(path);
      };

      img.src = path;
    });

    cardImagePreloadCache.set(path, preloadPromise);
    return preloadPromise;
  }));
}

function scheduleCardImagePreload(cards) {
  const run = () => {
    void preloadCardImages(cards);
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 1200 });
    return;
  }

  setTimeout(run, 150);
}

function resolveAttackDamage(ctx, base) {
  if (typeof ctx.getAttackDamage === 'function') {
    return ctx.getAttackDamage(base);
  }

  const strength = Number(ctx.playerStrength || 0);
  const pendingNoPain = typeof ctx.consumePendingNoPain === 'function'
    ? Number(ctx.consumePendingNoPain() || 0)
    : 0;

  return base + strength + pendingNoPain;
}

function healPlayer(ctx, amount) {
  if (typeof ctx.healPlayer === 'function') {
    ctx.healPlayer(amount);
    return;
  }

  const heal = Math.max(0, Number(amount || 0));
  ctx.playerHP = Math.min(ctx.playerMaxHP, ctx.playerHP + heal);
  ctx.showFloatingText('player', `+${heal} HP`, '#4caf50');
  ctx.updateCombatUI();
}

function gainStrength(ctx, amount) {
  if (typeof ctx.gainStrength === 'function') {
    ctx.gainStrength(amount);
    return;
  }

  const gained = Math.max(0, Number(amount || 0));
  ctx.playerStrength += gained;
  ctx.showFloatingText('player', `+${gained} Strength`, '#ffcc00');
  ctx.updateCombatUI();
}

const CARDS = [
  {
    id: 'attack',
    name: 'Attack',
    type: 'attack',
    cost: 1,
    img: 'Cards/attack.png',
    desc: 'Deal 5 damage.',
    effect(ctx) {
      const dmg = resolveAttackDamage(ctx, 5);
      ctx.dealDamage('enemy', dmg);
    }
  },
  {
    id: 'block',
    name: 'Defend',
    type: 'defend',
    cost: 1,
    img: 'Cards/block.png',
    desc: 'Gain 5 Block.',
    effect(ctx) {
      const block = 5;
      ctx.playerBlock += block;
      ctx.showFloatingText('player', `+${block} Block`, '#55ccff');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'dayofpeace',
    name: 'Day of Peace',
    type: 'defend',
    cost: 3,
    img: 'Cards/dayofpeace.png',
    desc: 'Restore 20 HP.',
    effect(ctx) {
      healPlayer(ctx, 20);
    }
  },
  {
    id: 'launch',
    name: 'Launch',
    type: 'attack',
    cost: 2,
    img: 'Cards/launch.png',
    desc: 'Deal 13 damage.',
    effect(ctx) {
      const dmg = resolveAttackDamage(ctx, 13);
      ctx.dealDamage('enemy', dmg);
    }
  },
  {
    id: 'nopainnogain',
    name: 'No Pain No Gain',
    type: 'special',
    cost: 1,
    img: 'Cards/nopainnogain.png',
    desc: 'Self-damage deals +5 to enemy this turn.',
    effect(ctx) {
      ctx.statusNoPain = true;
      ctx.showFloatingText('player', 'No Pain!', '#ff9900');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'onfire',
    name: 'On Fire',
    type: 'special',
    cost: 1,
    img: 'Cards/onfire.png',
    desc: 'Each turn: -2 HP, +1 Strength. Stacks.',
    effect(ctx) {
      ctx.statusOnFire = Number(ctx.statusOnFire || 0) + 1;
      ctx.showFloatingText('player', 'On Fire!', '#ff6600');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'relax',
    name: 'Relax',
    type: 'defend',
    cost: 1,
    img: 'Cards/relax.png',
    desc: 'Heal 6 HP.',
    effect(ctx) {
      healPlayer(ctx, 6);
    }
  },
  {
    id: 'sacrifice',
    name: 'Sacrifice',
    type: 'special',
    cost: 1,
    img: 'Cards/sacrifice.png',
    desc: 'Lose 1 HP. Triggers No Pain.',
    effect(ctx) {
      const selfDamage = 1;
      ctx.playerHP = Math.max(0, ctx.playerHP - selfDamage);
      ctx.showFloatingText('player', `-${selfDamage} HP`, '#ff3366');

      if (ctx.statusNoPain) {
        const bonusDmg = 5;
        ctx.dealDamage('enemy', bonusDmg);
        ctx.showFloatingText('enemy', `NoPain! -${bonusDmg}`, '#ff9900');
      }

      ctx.updateCombatUI();
    }
  },
  {
    id: 'Strenght',
    name: 'Strength',
    type: 'special',
    cost: 1,
    img: 'Cards/Strenght.png',
    desc: 'Gain 2 Strength.',
    effect(ctx) {
      gainStrength(ctx, 2);
    }
  },
  {
    id: 'aurafarming',
    name: 'Aura Farming',
    type: 'special',
    cost: 3,
    img: 'Cards/Aura farming.png',
    desc: 'Gain 1 Energy now and each turn this combat.',
    effect(ctx) {
      ctx.addEnergyBonus(1, { grantNow: true });
    }
  },
  {
    id: 'dodgechance',
    name: 'Dodge Chance',
    type: 'defend',
    cost: 1,
    img: 'Cards/Dodge chance.png',
    desc: 'Next enemy turn: gain 50% Dodge.',
    effect(ctx) {
      ctx.addNextEnemyTurnDodgeChance(0.5);
      ctx.showFloatingText('player', '+50% Dodge', '#8ff0ff');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'flightchance',
    name: 'Flight Chance',
    type: 'defend',
    cost: 1,
    img: 'Cards/Flight chance.png',
    desc: 'Gain +2% Dodge this combat.',
    effect(ctx) {
      ctx.addDodgeChanceBonus(0.02);
      ctx.showFloatingText('player', '+2% Dodge', '#8ff0ff');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'healingarrows',
    name: 'Healing Arrows',
    type: 'special',
    cost: 1,
    img: 'Cards/Healing Arrows.png',
    desc: 'Whenever you heal, deal that much damage this combat.',
    effect(ctx) {
      ctx.addHealDamageMultiplier(1);
      ctx.showFloatingText('player', 'Healing Arrows', '#ffb347');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'healingaura',
    name: 'Healing Aura',
    type: 'defend',
    cost: 1,
    img: 'Cards/Healing Aura.png',
    desc: 'At the start of each turn, heal 10 HP this combat.',
    effect(ctx) {
      ctx.addTurnStartHeal(10);
      ctx.showFloatingText('player', 'Healing Aura', '#4caf50');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'plotting',
    name: 'Plotting',
    type: 'special',
    cost: 1,
    img: 'Cards/Plotting.png',
    desc: 'At the start of each turn, gain 1 Strength this combat. Stacks.',
    effect(ctx) {
      ctx.addTurnStartStrength(1);
      ctx.showFloatingText('player', 'Plotting', '#ffcc00');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'speeding',
    name: 'Speeding',
    type: 'special',
    cost: 1,
    img: 'Cards/Speeding.png',
    desc: 'Attacks hit twice and count as separate attacks this combat.',
    effect(ctx) {
      ctx.addAttackRepeatCount(1);
      ctx.showFloatingText('player', 'Speeding', '#ff758c');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'strongarms',
    name: 'Strong Arms',
    type: 'special',
    cost: 1,
    img: 'Cards/Strong Arms.png',
    desc: 'Whenever you gain Strength, deal that much damage this combat. Stacks.',
    effect(ctx) {
      ctx.addStrengthBurstStack(1);
      ctx.showFloatingText('player', 'Strong Arms', '#ff8844');
      ctx.updateCombatUI();
    }
  },
  {
    id: 'swamper',
    name: 'Swamper',
    type: 'special',
    cost: 1,
    img: 'Cards/Swamper.png',
    desc: 'Gain +2% enemy skip chance this combat.',
    effect(ctx) {
      ctx.addEnemySkipChanceBonus(0.02);
      ctx.tryApplyImmediateEnemySkip('Swamper', 0.02);
      ctx.showFloatingText('player', '+2% Skip', '#8ff0ff');
      ctx.updateCombatUI();
    }
  }
];

applyRuntimeCardImagePaths(CARDS);

const STARTER_DECK_IDS = [
  'attack',
  'attack',
  'attack',
  'attack',
  'block',
  'block',
  'block',
  'block'
];

function getCardById(id) {
  return CARDS.find((card) => card.id === id) || null;
}

function buildStarterDeck() {
  return STARTER_DECK_IDS
    .map((id) => getCardById(id))
    .filter(Boolean);
}

function buildBaseDeck() {
  return buildStarterDeck();
}

function createCombatStatus() {
  return {
    playerStrength: 0,
    statusOnFire: 0,
    statusNoPain: false,
    energyBonus: 0,
    dodgeChanceBonus: 0,
    nextEnemyTurnDodgeChance: 0,
    healDamageMultiplier: 0,
    turnStartHeal: 0,
    turnStartStrengthBonus: 0,
    attackRepeatCount: 1,
    strengthBurstStacks: 0,
    enemySkipChanceBonus: 0
  };
}

function applyTurnStartEffects(ctx) {
  if (ctx.statusOnFire) {
    const stacks = Math.max(1, Math.round(Number(ctx.statusOnFire) || 0));
    const burn = 2 * stacks;
    ctx.playerHP = Math.max(0, ctx.playerHP - burn);
    ctx.showFloatingText('player', `-${burn} HP`, '#ff6600');
    gainStrength(ctx, stacks);
  }

  if (ctx.turnStartHeal > 0) {
    healPlayer(ctx, ctx.turnStartHeal);
  }

  if (ctx.turnStartStrengthBonus > 0) {
    gainStrength(ctx, ctx.turnStartStrengthBonus);
  }
}

function applyTurnEndEffects(ctx) {
  ctx.statusNoPain = false;
}

if (typeof window !== 'undefined') {
  window.CARDS = CARDS;
  window.getCardById = getCardById;
  window.buildStarterDeck = buildStarterDeck;
  window.buildBaseDeck = buildBaseDeck;
  window.createCombatStatus = createCombatStatus;
  window.applyTurnStartEffects = applyTurnStartEffects;
  window.applyTurnEndEffects = applyTurnEndEffects;
  window.getRuntimeCardImagePath = getRuntimeCardImagePath;
  window.preloadCardImages = preloadCardImages;
  window.scheduleCardImagePreload = scheduleCardImagePreload;
}
