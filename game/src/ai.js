// Cinder & Tide — the rival's mind.
//
// Maris, the Tidecaller, plays by rules a human can read and counter:
//   1. Take the win when it is on the table.
//   2. Survive: heal or raise armour when life runs low.
//   3. Clear a dangerous ward before it strikes again.
//   4. Build a board when the table is empty; draw when the hand runs dry.
//   5. Otherwise spend ember on the best-value card in hand.
//
// Each candidate play is scored, the best one is taken, and the rival keeps
// playing while a good move remains. A little randomness keeps her from
// playing the same line every duel. The same function also drives the
// autopilot behind the staged screenshots, so those frames show real play.

import { canPlay, cardCost, playCard } from './state.js';
import { KIND_SPELL, KIND_WARD } from './cards.js';

/** Score one candidate play from the rival's point of view. Higher is better. */
function scorePlay(duel, card) {
  const rival = duel.rival;
  const you = duel.you;
  const def = card.def;
  const cost = cardCost(duel, rival, card);
  let score = 0;

  // 1. Lethal: a spell that ends the duel beats everything.
  if (def.effect === 'damage' && def.amount >= you.life) return 1000;
  if (def.effect === 'damageAndWard' && def.amount >= you.life) return 1000;
  if (def.effect === 'drawDamage' && def.amount >= you.life) return 1000;

  if (def.kind === KIND_WARD) {
    // A ward is worth its attack and health, more when the board is empty.
    score = def.attack * 2 + def.health;
    if (rival.wards.length === 0) score += 3;
    if (def.effect === 'drawOnSummon') score += 4;
    if (def.effect === 'damageOnSummon') score += 2;
  } else {
    switch (def.effect) {
      case 'damage':
        score = def.amount * 2;
        break;
      case 'drawDamage':
        score = def.amount * 2 + 3;
        break;
      case 'damageAndWard':
        score = def.amount * 2 + you.wards.length * 2;
        break;
      case 'damageAllWards':
      case 'damageFreezeAll':
        score = you.wards.length * 3;
        if (you.wards.some((ward) => ward.attack >= 4)) score += 4;
        break;
      case 'freezeAll':
        score = you.wards.reduce((sum, ward) => sum + ward.attack, 0) * 2;
        break;
      case 'heal':
        // Healing matters most when hurt; wasted at full life.
        score = rival.life < 12 ? 14 : rival.life < 20 ? 8 : 1;
        break;
      case 'armour':
        score = rival.life < 15 ? 10 : 5;
        break;
      case 'armourDraw':
        score = 7;
        break;
      case 'draw':
        score = rival.hand.length <= 2 ? 9 : 3;
        break;
      case 'buffWards':
        score = rival.wards.length * 4;
        break;
      default:
        score = 2;
        break;
    }
  }

  // Cheap cards are efficient; an expensive card must earn its ember.
  score -= cost * 0.5;
  // Resonance makes a second card of one element cheaper — and better.
  if (duel.elementsPlayed.includes(def.element)) score += 2;
  return score;
}

/**
 * Pick the rival's next play, or null when nothing is worth playing.
 * `rng` adds a small wobble so two duels never run the same line.
 */
export function chooseRivalPlay(duel, rng) {
  const rival = duel.rival;
  let best = null;
  let bestScore = 4; // below this, Maris holds her ember and ends the turn
  for (const card of rival.hand) {
    if (!canPlay(duel, rival, card)) continue;
    const score = scorePlay(duel, card) + rng() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * Play the rival's whole turn: keep taking the best play until none is
 * good enough, then return the list of cards played (the renderer animates
 * them one at a time). Stops early when the duel ends mid-turn.
 */
export function playRivalTurn(duel, rng) {
  const played = [];
  for (let step = 0; step < 6; step += 1) {
    if (duel.phase !== 'play') break;
    const card = chooseRivalPlay(duel, rng);
    if (!card) break;
    if (playCard(duel, duel.rival, card.uid)) played.push(card);
  }
  return played;
}
