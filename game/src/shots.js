// Cinder & Tide — the screenshot scenes behind ?shot=title|table|win|loss.
//
// Each scene plays the real rules forward from a fresh duel with a fixed
// seed, steered by a simple autopilot (play a random affordable card, up to
// three a turn, then end the turn), so the frame is what a short game really
// looks like and the same seed always gives the same frame. The win and
// loss scenes set up a lethal position, then let the real rules finish it:
// a Flame Lash for the win, a rival ward's strike for the loss.

import { cardById } from './cards.js';
import { makeRng } from './random.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { canPlay, endTurn, newDuel, playCard } from './state.js';

const TABLE_TURNS = 7;

/** The active duelist plays up to three random affordable cards. */
function autopilotTurn(duel, rng) {
  const duelist = duel.active === 'you' ? duel.you : duel.rival;
  for (let step = 0; step < 3; step += 1) {
    if (duel.phase !== 'play') return;
    const affordable = duelist.hand.filter((card) => canPlay(duel, duelist, card));
    if (affordable.length === 0) return;
    const pick = affordable[Math.floor(rng() * affordable.length)];
    playCard(duel, duelist, pick.uid);
  }
}

/** Play the duel forward until `turns` full rounds have passed. */
function playForward(duel, rng, turns) {
  while (duel.phase === 'play' && duel.stats.turns < turns) {
    autopilotTurn(duel, rng);
    if (duel.phase !== 'play') break;
    endTurn(duel);
  }
}

/**
 * Stage the named scene and return the duel plus the screen to show.
 * Any unknown name stages the title.
 */
export function stageShot(name, seed) {
  const rng = makeRng(seed);
  const duel = newDuel(seed, rng);

  if (name === 'table') {
    playForward(duel, rng, TABLE_TURNS);
    return { duel, screen: SCREEN_PLAY };
  }

  if (name === 'win') {
    // A lively mid-game, then the rival left at 3 life and a Flame Lash in hand.
    playForward(duel, rng, 5);
    if (duel.phase !== 'play') return { duel, screen: SCREEN_OVER };
    duel.rival.life = 3;
    duel.rival.armour = 0;
    duel.you.ember = 10;
    duel.you.hand.push({ uid: 9001, def: cardById('flame-lash') });
    playCard(duel, duel.you, 9001);
    return { duel, screen: SCREEN_OVER };
  }

  if (name === 'loss') {
    // A lively mid-game, then you left at 2 life and a rival imp on the table.
    playForward(duel, rng, 5);
    if (duel.phase !== 'play') return { duel, screen: SCREEN_OVER };
    duel.you.life = 2;
    duel.you.armour = 0;
    duel.rival.wards.push({
      uid: 9002, def: cardById('cinder-imp'),
      attack: 2, health: 1, maxHealth: 1, frozen: 0, justSummoned: false,
    });
    duel.active = 'rival';
    endTurn(duel);
    return { duel, screen: SCREEN_OVER };
  }

  return { duel, screen: SCREEN_TITLE };
}
