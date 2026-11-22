// Cinder & Tide — the table's host.
//
// main.js owns the session: which screen is showing, what the player has
// selected, whose turn it is, and the slow reveal of the rival's turn. The
// rules live in state.js, the rival's mind in ai.js, the pictures in
// render.js, the noise in sound.js.
//
// Two ways in:
//   * Open game/index.html and play: title screen, then the duel.
//   * Open game/index.html?shot=title|table|win|loss&seed=N and the game
//     stages that scene from its own rules, for screenshots.

import { canPlay, endTurn, newDuel, playCard, PHASE_OVER } from './state.js';
import { playRivalTurn } from './ai.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, floatText } from './render.js';
import { installKeyboard } from './input.js';
import { makeRng, clockSeed } from './random.js';
import { stageShot } from './shots.js';
import { sfx, unlockAudio, setMuted, isMuted } from './sound.js';

const RECORD_KEY = 'cinder-and-tide-record';
const RIVAL_STEP_MS = 750;

let duel = null;
let rng = makeRng(clockSeed());
let rivalBusy = false;
let shotMode = false;

const ui = {
  screen: SCREEN_TITLE,
  selectedUid: null,
  muted: false,
  record: loadRecord(),
  canPlay: (card) => duel && canPlay(duel, duel.you, card),
  onCardClick,
  onSelectSlot,
  onPlaySelected,
  onEndTurn,
  onStart,
  onTitle,
  onMute,
};

function loadRecord() {
  try {
    const raw = window.localStorage.getItem(RECORD_KEY);
    if (!raw) return { wins: 0, losses: 0 };
    const parsed = JSON.parse(raw);
    return { wins: parsed.wins | 0, losses: parsed.losses | 0 };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function saveRecord() {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(ui.record));
  } catch {
    // Private mode or a sandbox without storage: the record is a nicety.
  }
}

function show() {
  render(duel, ui);
  if (duel && duel.phase === PHASE_OVER) {
    if (duel.winner === 'you') sfx.win();
    else sfx.lose();
  }
}

/** Start a fresh duel from the title screen. */
function onStart() {
  unlockAudio();
  sfx.playCard();
  rng = makeRng(clockSeed());
  duel = newDuel(rng() * 0xffffffff, rng);
  ui.screen = SCREEN_PLAY;
  ui.selectedUid = null;
  rivalBusy = false;
  show();
}

function onTitle() {
  unlockAudio();
  sfx.click();
  ui.screen = SCREEN_TITLE;
  ui.selectedUid = null;
  show();
}

function onMute() {
  ui.muted = !ui.muted;
  setMuted(ui.muted);
  show();
}

/** Click a card: select it, or play it at once when it is already selected. */
function onCardClick(card, index) {
  if (shotMode || rivalBusy) return;
  unlockAudio();
  if (!duel || duel.phase !== PHASE_PLAY || duel.active !== 'you') return;
  if (ui.selectedUid === card.uid) {
    playSelectedCard();
    return;
  }
  ui.selectedUid = card.uid;
  sfx.click();
  show();
}

function onSelectSlot(index) {
  if (shotMode || rivalBusy) return;
  if (!duel || duel.phase !== PHASE_PLAY || duel.active !== 'you') return;
  const card = duel.you.hand[index];
  if (!card) return;
  ui.selectedUid = card.uid;
  sfx.click();
  show();
}

function onPlaySelected() {
  if (shotMode || rivalBusy) return;
  playSelectedCard();
}

function playSelectedCard() {
  if (!duel || duel.phase !== PHASE_PLAY || duel.active !== 'you') return;
  const card = duel.you.hand.find((c) => c.uid === ui.selectedUid);
  if (!card) {
    ui.selectedUid = null;
    show();
    return;
  }
  if (!canPlay(duel, duel.you, card)) {
    ui.selectedUid = null;
    show();
    return;
  }
  const before = duel.rival.life;
  playCard(duel, duel.you, card.uid);
  ui.selectedUid = null;
  sfx.playCard();
  show();
  if (duel.rival.life < before) {
    const lifeEl = document.querySelector('.rival-duelist .life-value');
    floatText(lifeEl, `-${before - duel.rival.life}`, 'damage');
  }
  if (card.def.effect === 'heal' || card.def.effect === 'armour' || card.def.effect === 'armourDraw') {
    const lifeEl = document.querySelector('.your-duelist .life-value');
    floatText(lifeEl, card.def.effect === 'heal' ? `+${card.def.amount}` : `+${card.def.amount} ARMOUR`, card.def.effect === 'heal' ? 'heal' : 'armour');
  }
  checkOver();
}

/** End the player's turn: wards strike, then the rival plays, slowly. */
function onEndTurn() {
  if (shotMode || rivalBusy) return;
  if (!duel || duel.phase !== PHASE_PLAY || duel.active !== 'you') return;
  unlockAudio();
  sfx.turn();
  rivalBusy = true;
  const rivalLifeBefore = duel.rival.life;
  endTurn(duel);
  show();
  if (duel.rival.life < rivalLifeBefore) {
    const lifeEl = document.querySelector('.rival-duelist .life-value');
    floatText(lifeEl, `-${rivalLifeBefore - duel.rival.life}`, 'damage');
  }
  if (duel.phase === PHASE_OVER) {
    rivalBusy = false;
    checkOver();
    return;
  }
  // The rival's turn, one card at a time so the player can follow it.
  window.setTimeout(() => runRivalTurn(), RIVAL_STEP_MS);
}

function runRivalTurn() {
  if (!duel || duel.phase !== PHASE_PLAY) {
    rivalBusy = false;
    return;
  }
  const played = playRivalTurn(duel, rng);
  let step = 0;
  function revealNext() {
    if (!duel || duel.phase !== PHASE_PLAY) {
      rivalBusy = false;
      checkOver();
      return;
    }
    if (step < played.length) {
      step += 1;
      sfx.playCard();
      show();
      window.setTimeout(revealNext, RIVAL_STEP_MS);
      return;
    }
    const yourLifeBefore = duel.you.life;
    endTurn(duel);
    rivalBusy = false;
    sfx.strike();
    show();
    if (duel.you.life < yourLifeBefore) {
      const lifeEl = document.querySelector('.your-duelist .life-value');
      floatText(lifeEl, `-${yourLifeBefore - duel.you.life}`, 'damage');
    }
    checkOver();
  }
  revealNext();
}

/** Record the result and leave the end screen up. */
function checkOver() {
  if (!duel || duel.phase !== PHASE_OVER) return;
  if (duel.winner === 'you') ui.record.wins += 1;
  else ui.record.losses += 1;
  saveRecord();
}

/** Boot: a staged screenshot, or the title screen. */
function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') ?? '7', 10) || 7;
  if (shot) {
    shotMode = true;
    const staged = stageShot(shot, seed);
    duel = staged.duel;
    ui.screen = staged.screen;
    ui.muted = true;
    setMuted(true);
    render(duel, ui);
    document.title = `Cinder & Tide — ${shot}`;
    return;
  }
  duel = newDuel(clockSeed(), makeRng(clockSeed()));
  duel.phase = 'title';
  ui.screen = SCREEN_TITLE;
  installKeyboard(ui);
  render(duel, ui);
}

boot();
