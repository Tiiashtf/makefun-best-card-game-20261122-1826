// Cinder & Tide — the rules engine.
//
// This file owns the duel itself: whose turn it is, what ember buys, what
// each card does, how wards strike, and how a duel is won or lost. It knows
// nothing about the screen; the renderer reads the state it returns.
//
// The duel:
//   * Each duelist starts at 30 life with an empty hand and a 24-card deck.
//   * At the start of your turn you gain +1 max ember (up to 10), refill your
//     ember to that max, and draw a card. Drawing from an empty deck hurts:
//     fatigue deals 1 damage, then 2, then 3, and so on.
//   * Play any cards you can afford. A ward stays on the table; a spell
//     resolves at once. Resonance: the second card of one element you play
//     in a turn costs 1 less ember.
//   * End your turn: your wards strike the rival duelist, then the rival
//     takes their turn the same way.
//   * Armour absorbs damage before life does. A frozen ward cannot strike.
//   * Reduce the rival to 0 life and the duel is yours.

import { buildDeck, cardById, describePlay, ELEMENTS, KIND_SPELL, KIND_WARD } from './cards.js';

export const START_LIFE = 30;
export const MAX_EMBER = 10;
export const HAND_LIMIT = 7;
export const MAX_WARDS = 5;

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

/** A fresh duelist: life, armour, ember, hand, deck, wards, fatigue count. */
export function newDuelist(name, isRival, deck) {
  return {
    name, isRival, life: START_LIFE, armour: 0,
    ember: 0, maxEmber: 0, hand: [], deck, wards: [],
    fatigue: 0, cardsPlayed: 0, damageDealt: 0,
  };
}

/** A fresh duel. `rng` shuffles both decks; `seed` is kept for the record. */
export function newDuel(seed, rng) {
  const duel = {
    seed,
    turn: 0,
    phase: PHASE_PLAY,
    active: 'you', // 'you' | 'rival'
    winner: null, // 'you' | 'rival' | null
    log: [],
    lastPlay: null, // { by, card, resonance } — what the renderer animates
    elementsPlayed: [], // elements played this turn, for Resonance
    stats: { turns: 0, cardsPlayed: 0, damageDealt: 0 },
  };
  duel.you = newDuelist('You, the Embercaller', false, buildDeck(rng));
  duel.rival = newDuelist('Maris, the Tidecaller', true, buildDeck(rng));
  drawCards(duel, duel.you, 3, true);
  drawCards(duel, duel.rival, 3, true);
  startTurn(duel, duel.you);
  return duel;
}

export function activeDuelist(duel) {
  return duel.active === 'you' ? duel.you : duel.rival;
}

export function waitingDuelist(duel) {
  return duel.active === 'you' ? duel.rival : duel.you;
}

function say(duel, text) {
  duel.log.unshift(text);
  if (duel.log.length > 6) duel.log.length = 6;
}

/** Draw `count` cards; an empty deck deals rising fatigue damage instead. */
export function drawCards(duel, duelist, count, silent = false) {
  for (let i = 0; i < count; i += 1) {
    if (duelist.deck.length === 0) {
      duelist.fatigue += 1;
      hurtDuelist(duel, duelist, duelist.fatigue, 'fatigue');
      if (!silent) say(duel, `${duelist.name} draws from an empty deck — fatigue ${duelist.fatigue}!`);
      if (duel.phase === PHASE_OVER) return;
      continue;
    }
    const card = duelist.deck.pop();
    if (duelist.hand.length >= HAND_LIMIT) {
      if (!silent) say(duel, `${duelist.name}'s hand is full — ${card.def.name} is lost.`);
      continue;
    }
    duelist.hand.push(card);
  }
}

/** Damage that armour absorbs first; returns the life actually lost. */
export function hurtDuelist(duel, duelist, amount, source = '') {
  let remaining = amount;
  if (duelist.armour > 0) {
    const absorbed = Math.min(duelist.armour, remaining);
    duelist.armour -= absorbed;
    remaining -= absorbed;
  }
  duelist.life -= remaining;
  if (remaining > 0 && source !== 'fatigue') {
    const attacker = duelist.isRival ? duel.you : duel.rival;
    attacker.damageDealt += remaining;
    duel.stats.damageDealt += duelist.isRival ? remaining : 0;
  }
  if (duelist.life <= 0) {
    duelist.life = 0;
    duel.phase = PHASE_OVER;
    duel.winner = duelist.isRival ? 'you' : 'rival';
  }
  return remaining;
}

/** Heal, never past the starting life. */
export function healDuelist(duelist, amount) {
  duelist.life = Math.min(START_LIFE, duelist.life + amount);
}

/** The Resonance discount: 1 less ember for a second card of one element in a turn.
 * `elementsPlayed` only ever holds this turn's plays by the active duelist,
 * so no turn check is needed here; canPlay guards the turn instead. */
export function cardCost(duel, duelist, card) {
  const played = duel.elementsPlayed.filter((el) => el === card.def.element).length;
  return Math.max(0, card.def.cost - (played >= 1 ? 1 : 0));
}

export function canPlay(duel, duelist, card) {
  if (duel.phase !== PHASE_PLAY) return false;
  if (duelist.isRival !== (duel.active === 'rival')) return false;
  if (card.def.kind === KIND_WARD && duelist.wards.length >= MAX_WARDS) return false;
  return cardCost(duel, duelist, card) <= duelist.ember;
}

/** Play a card from a hand. Returns false when the play is not legal. */
export function playCard(duel, duelist, cardUid) {
  const index = duelist.hand.findIndex((card) => card.uid === cardUid);
  if (index === -1) return false;
  const card = duelist.hand[index];
  if (!canPlay(duel, duelist, card)) return false;
  const cost = cardCost(duel, duelist, card);
  const resonance = duel.elementsPlayed.includes(card.def.element);
  duelist.ember -= cost;
  duelist.hand.splice(index, 1);
  duel.elementsPlayed.push(card.def.element);
  duelist.cardsPlayed += 1;
  duel.stats.cardsPlayed += 1;
  duel.lastPlay = { by: duelist.isRival ? 'rival' : 'you', card, resonance };
  say(duel, `${duelist.name} plays ${describePlay(card)}${resonance ? ' — Resonance! 1 less ember.' : ''}`);
  if (card.def.kind === KIND_WARD) {
    summonWard(duel, duelist, card);
  } else {
    resolveSpell(duel, duelist, card);
  }
  return true;
}

function summonWard(duel, duelist, card) {
  const ward = {
    uid: card.uid, def: card.def,
    attack: card.def.attack, health: card.def.health,
    maxHealth: card.def.health, frozen: 0, justSummoned: true,
  };
  duelist.wards.push(ward);
  if (card.def.effect === 'drawOnSummon') drawCards(duel, duelist, card.def.draw);
  if (card.def.effect === 'damageOnSummon') {
    hurtDuelist(duel, duelist.isRival ? duel.you : duel.rival, card.def.amount, 'summon');
  }
}

/** Apply a spell's effect. Every spell in the catalogue lands here. */
function resolveSpell(duel, caster, card) {
  const foe = caster.isRival ? duel.you : duel.rival;
  const def = card.def;
  switch (def.effect) {
    case 'damage':
      hurtDuelist(duel, foe, def.amount, 'spell');
      break;
    case 'drawDamage':
      hurtDuelist(duel, foe, def.amount, 'spell');
      drawCards(duel, caster, def.draw);
      break;
    case 'damageAndWard':
      hurtDuelist(duel, foe, def.amount, 'spell');
      foe.wards.forEach((ward) => damageWard(duel, foe, ward, def.wardAmount));
      break;
    case 'damageAllWards':
      foe.wards.forEach((ward) => damageWard(duel, foe, ward, def.amount));
      break;
    case 'damageFreezeAll':
      foe.wards.forEach((ward) => {
        damageWard(duel, foe, ward, def.amount);
        ward.frozen = Math.max(ward.frozen, def.turns);
      });
      break;
    case 'freezeAll':
      foe.wards.forEach((ward) => { ward.frozen = Math.max(ward.frozen, def.turns); });
      break;
    case 'heal':
      healDuelist(caster, def.amount);
      break;
    case 'armour':
      caster.armour += def.amount;
      break;
    case 'armourDraw':
      caster.armour += def.amount;
      drawCards(duel, caster, def.draw);
      break;
    case 'draw':
      drawCards(duel, caster, def.draw);
      break;
    case 'buffWards':
      caster.wards.forEach((ward) => {
        ward.attack += def.amount;
        ward.health += def.health;
        ward.maxHealth += def.health;
      });
      break;
    default:
      break;
  }
}

function damageWard(duel, owner, ward, amount) {
  ward.health -= amount;
  if (ward.health <= 0) {
    owner.wards = owner.wards.filter((w) => w.uid !== ward.uid);
    say(duel, `${owner.name}'s ${ward.def.name} crumbles.`);
  }
}

/** Begin a duelist's turn: more ember, a fresh draw, a clean Resonance slate. */
export function startTurn(duel, duelist) {
  duel.active = duelist.isRival ? 'rival' : 'you';
  duel.elementsPlayed = [];
  duel.lastPlay = null;
  duelist.maxEmber = Math.min(MAX_EMBER, duelist.maxEmber + 1);
  duelist.ember = duelist.maxEmber;
  duel.turn += 1;
  duel.stats.turns = Math.max(duel.stats.turns, Math.ceil(duel.turn / 2));
  drawCards(duel, duelist, 1);
  if (duel.phase !== PHASE_OVER) {
    say(duel, `Turn ${duel.stats.turns} — ${duelist.name}'s move.`);
  }
}

/** Wards strike at the end of their owner's turn, then the turn passes. */
export function endTurn(duel) {
  if (duel.phase !== PHASE_PLAY) return;
  const attacker = activeDuelist(duel);
  const defender = waitingDuelist(duel);
  const strikers = attacker.wards.filter((ward) => ward.frozen === 0);
  strikers.forEach((ward) => {
    if (duel.phase !== PHASE_PLAY) return;
    hurtDuelist(duel, defender, ward.attack, 'ward');
    say(duel, `${attacker.name}'s ${ward.def.name} strikes for ${ward.attack}.`);
  });
  attacker.wards.forEach((ward) => {
    if (ward.frozen > 0) ward.frozen -= 1;
    ward.justSummoned = false;
  });
  if (duel.phase !== PHASE_PLAY) return;
  startTurn(duel, defender);
}

/** A one-line summary of the duel, for the end screens and the log. */
export function duelSummary(duel) {
  const you = duel.you;
  return {
    turns: duel.stats.turns,
    cardsPlayed: you.cardsPlayed,
    damageDealt: you.damageDealt,
    wardsLeft: you.wards.length,
  };
}

export { ELEMENTS, cardById };
