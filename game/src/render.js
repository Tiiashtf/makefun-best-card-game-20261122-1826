// Cinder & Tide — the table.
//
// This file turns a duel state into the screen: the title, the table with
// both hands, the wards, the life totals, the log, and the win and loss
// screens. Cards are DOM elements with CSS transitions, so they slide,
// lift and snap into place; damage numbers float up from whatever they hit.
//
// The renderer is told what changed through `ui`: the selected card, the
// screen to show, and a queue of floating texts. It never touches the rules.

import { ELEMENTS, KIND_WARD } from './cards.js';
import { PHASE_OVER, PHASE_PLAY, PHASE_TITLE, START_LIFE, duelSummary } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** Build one card face. `playable` marks a card the player can afford. */
export function cardElement(card, { playable = false, selected = false, faceDown = false, small = false } = {}) {
  const element = ELEMENTS[card.def.element];
  const el = document.createElement('div');
  el.className = 'card' + (playable ? ' playable' : '') + (selected ? ' selected' : '') + (small ? ' small' : '');
  el.dataset.uid = String(card.uid);
  el.title = card.def.flavour;
  el.style.setProperty('--el', element.colour);
  el.style.setProperty('--el-dark', element.dark);
  if (faceDown) {
    el.classList.add('face-down');
    el.innerHTML = '<div class="card-back"><span class="back-glyph">✦</span><span class="back-word">CINDER<br>&amp; TIDE</span></div>';
    return el;
  }
  const stats = card.def.kind === KIND_WARD
    ? `<div class="card-stats"><span class="atk" title="Attack">⚔ ${card.def.attack}</span><span class="hp" title="Health">♥ ${card.def.health}</span></div>`
    : '<div class="card-stats"><span class="spell-tag">SPELL</span></div>';
  el.innerHTML = `
    <div class="card-cost" title="Ember cost">${card.def.cost}</div>
    <div class="card-element" title="${element.name}">${element.glyph} ${element.name}</div>
    <div class="card-name">${card.def.name}</div>
    <div class="card-art" style="background:${element.dark}"><span>${element.glyph}</span></div>
    <div class="card-text">${card.def.text}</div>
    ${stats}`;
  return el;
}

/** A small life bar: a number, a bar, and an armour badge when there is any. */
function lifeBlock(duelist, label) {
  const pct = Math.max(0, Math.min(100, (duelist.life / START_LIFE) * 100));
  const armour = duelist.armour > 0 ? `<span class="armour">${duelist.armour} ARMOUR</span>` : '';
  return `<div class="life-block">
    <div class="life-label">${label}</div>
    <div class="life-numbers"><span class="life-value">${duelist.life}</span><span class="life-max">/ ${START_LIFE}</span>${armour}</div>
    <div class="life-bar"><div class="life-fill" style="width:${pct}%"></div></div>
  </div>`;
}

/** Ember pips: filled for ember left, dim for spent, outline for unfilled max. */
function emberPips(duelist) {
  let pips = '';
  for (let i = 0; i < duelist.maxEmber; i += 1) {
    pips += `<span class="pip${i < duelist.ember ? ' lit' : ''}">●</span>`;
  }
  return `<div class="ember" title="Ember — spend it to play cards">${pips}<span class="ember-count">${duelist.ember}/${duelist.maxEmber} ember</span></div>`;
}

function wardElement(ward, ownerLabel) {
  const element = ELEMENTS[ward.def.element];
  const frozen = ward.frozen > 0 ? `<div class="frozen">❄ FROZEN ${ward.frozen}</div>` : '';
  const el = document.createElement('div');
  el.className = 'ward' + (ward.frozen > 0 ? ' is-frozen' : '');
  el.style.setProperty('--el', element.colour);
  el.style.setProperty('--el-dark', element.dark);
  el.innerHTML = `
    <div class="ward-glyph">${element.glyph}</div>
    <div class="ward-name">${ward.def.name}</div>
    <div class="ward-stats"><span class="atk">⚔ ${ward.attack}</span><span class="hp">♥ ${ward.health}</span></div>
    ${frozen}
    <div class="ward-owner">${ownerLabel}</div>`;
  return el;
}

/** The whole table for a duel in progress. */
function playScreen(duel, ui) {
  const you = duel.you;
  const rival = duel.rival;
  const yourTurn = duel.active === 'you' && duel.phase === PHASE_PLAY;
  const root = document.createElement('div');
  root.className = 'table';

  const rivalHand = document.createElement('div');
  rivalHand.className = 'hand rival-hand';
  for (let i = 0; i < rival.hand.length; i += 1) {
    rivalHand.appendChild(cardElement({ uid: `r${i}`, def: rival.hand[i].def }, { faceDown: true, small: true }));
  }
  if (rival.hand.length === 0) rivalHand.innerHTML = '<div class="empty-hand">No cards in hand</div>';

  const rivalWards = document.createElement('div');
  rivalWards.className = 'wards rival-wards';
  rival.wards.forEach((ward) => rivalWards.appendChild(wardElement(ward, 'Maris')));
  if (rival.wards.length === 0) rivalWards.innerHTML = '<div class="empty-wards">No wards on the table</div>';

  const yourWards = document.createElement('div');
  yourWards.className = 'wards your-wards';
  you.wards.forEach((ward) => yourWards.appendChild(wardElement(ward, 'You')));
  if (you.wards.length === 0) yourWards.innerHTML = '<div class="empty-wards">Your wards will stand here — play a ward card</div>';

  const hand = document.createElement('div');
  hand.className = 'hand your-hand';
  you.hand.forEach((card, index) => {
    const el = cardElement(card, {
      playable: yourTurn && ui.canPlay(card),
      selected: ui.selectedUid === card.uid,
    });
    el.addEventListener('click', () => ui.onCardClick(card, index));
    hand.appendChild(el);
  });
  if (you.hand.length === 0) hand.innerHTML = '<div class="empty-hand">No cards — draw at the start of your turn</div>';

  const logLines = duel.log.map((line) => `<div class="log-line">${line}</div>`).join('');

  root.innerHTML = `
    <header class="topbar">
      <div class="brand">✦ CINDER &amp; TIDE</div>
      <div class="turn-banner">${duel.phase === PHASE_PLAY ? (yourTurn ? '— Your turn —' : '— Maris is thinking… —') : ''}</div>
      <div class="top-actions">
        <button class="text-btn" id="mute-btn" title="Mute (M)">${ui.muted ? 'MUTED' : 'SOUND'}</button>
        <button class="icon-btn" id="menu-btn" title="Back to title (Esc)">☰</button>
      </div>
    </header>
    <section class="rival-side">
      <div class="duelist rival-duelist">
        <div class="avatar rival-avatar">≈</div>
        <div class="duelist-info">
          <div class="duelist-name">Maris, the Tidecaller</div>
          <div class="duelist-sub">Rival · ${rival.deck.length} cards in deck · ${rival.hand.length} in hand</div>
        </div>
        ${lifeBlock(rival, 'Rival life')}
        ${emberPips(rival)}
      </div>
      <div class="rival-hand-wrap">${rivalHand.outerHTML}</div>
    </section>
    <section class="middle">
      <div class="middle-left">${rivalWards.outerHTML}</div>
      <div class="middle-centre">
        <div class="turn-count">Turn ${duel.stats.turns}</div>
        <div class="score-line">Score — You ${you.damageDealt} damage · Maris ${rival.damageDealt} damage</div>
        <button class="end-turn${yourTurn ? '' : ' disabled'}" id="end-turn-btn" ${yourTurn ? '' : 'disabled'}>End turn ⏎</button>
        <div class="hint">${yourTurn ? 'Click a glowing card to play it · keys 1–7 select, Enter plays' : 'Maris is playing…'}</div>
      </div>
      <div class="middle-right">${yourWards.outerHTML}</div>
    </section>
    <section class="your-side">
      <div class="duelist your-duelist">
        <div class="avatar your-avatar">▲</div>
        <div class="duelist-info">
          <div class="duelist-name">You, the Embercaller</div>
          <div class="duelist-sub">Your deck: ${you.deck.length} cards · ${you.hand.length} in hand</div>
        </div>
        ${lifeBlock(you, 'Your life')}
        ${emberPips(you)}
      </div>
      <div class="your-hand-wrap"></div>
    </section>
    <aside class="log"><div class="log-title">Duel log</div>${logLines}</aside>`;

  root.querySelector('.your-hand-wrap').appendChild(hand);
  return root;
}

/** The title screen: the game's name, its promise, and the way in. */
function titleScreen(ui) {
  const root = document.createElement('div');
  root.className = 'title-screen';
  const record = ui.record;
  root.innerHTML = `
    <div class="title-card">
      <div class="title-glyphs"><span class="g-ember">▲</span><span class="g-tide">≈</span></div>
      <h1>CINDER<br>&amp; TIDE</h1>
      <p class="tagline">A duel of runes on the Ember Isles. Outwit Maris, the Tidecaller —<br>
      spend your ember, summon your wards, and bring her life to zero.</p>
      <button class="big-btn" id="start-btn">▶ &nbsp;Begin the Duel</button>
      <div class="title-meta">
        <span>30 life each</span><span>·</span><span>24-card decks</span><span>·</span><span>4 elements</span><span>·</span><span>Resonance: a 2nd card of one element costs 1 less</span>
      </div>
      ${record && (record.wins + record.losses) > 0 ? `<div class="record">Your record: ${record.wins} wins · ${record.losses} losses</div>` : ''}
      <details class="howto">
        <summary>How to play</summary>
        <ul>
          <li>Each turn you gain +1 max ember (up to 10) and draw a card.</li>
          <li>Click a glowing card to play it. Wards stay on the table and strike at the end of your turn.</li>
          <li>Spells strike at once: damage, healing, armour, card draw, freezing wards.</li>
          <li>Armour soaks damage before life does. Frozen wards cannot strike.</li>
          <li>Play two cards of one element in a turn and the second costs 1 less ember — Resonance.</li>
          <li>Empty deck? Drawing hurts: fatigue deals 1, then 2, then 3…</li>
          <li>Keyboard: 1–7 select a card · Enter plays it · E ends your turn · M mutes.</li>
        </ul>
      </details>
      <div class="title-foot">An original game — its own cards, art, sounds and names. No network needed.</div>
    </div>`;
  return root;
}

/** The win and loss screens, with the duel's numbers and a way back in. */
function overScreen(duel, ui) {
  const won = duel.winner === 'you';
  const summary = duelSummary(duel);
  const root = document.createElement('div');
  root.className = 'over-screen' + (won ? ' won' : ' lost');
  root.innerHTML = `
    <div class="over-card">
      <div class="over-glyph">${won ? '✦' : '≈'}</div>
      <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <p class="over-line">${won
        ? 'The tide breaks against your fire. Maris bows — the Ember Isles are yours.'
        : 'The tide takes the table. Maris keeps the isles — this time.'}</p>
      <div class="over-stats">
        <div class="stat"><span class="stat-num">${summary.turns}</span><span class="stat-label">turns</span></div>
        <div class="stat"><span class="stat-num">${summary.cardsPlayed}</span><span class="stat-label">cards played</span></div>
        <div class="stat"><span class="stat-num">${summary.damageDealt}</span><span class="stat-label">damage dealt</span></div>
        <div class="stat"><span class="stat-num">${duel.you.life}</span><span class="stat-label">life left</span></div>
      </div>
      <button class="big-btn" id="again-btn">${won ? '▶ &nbsp;Duel Again' : '↻ &nbsp;Try Again'}</button>
      <button class="ghost-btn" id="title-btn">Back to title</button>
    </div>`;
  if (won) spawnConfetti(root);
  return root;
}

/** A burst of falling ember and tide confetti across the win screen. */
function spawnConfetti(root) {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  const colours = ['#e5484d', '#2f7fe0', '#3d9b4f', '#f5c542', '#f9fafb'];
  for (let i = 0; i < 90; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[i % colours.length];
    piece.style.animationDelay = `${Math.random() * 1.2}s`;
    piece.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
    layer.appendChild(piece);
  }
  root.appendChild(layer);
}

/** A floating number over an element: damage, healing, armour. */
export function floatText(target, text, kind = 'damage') {
  if (!target || !target.getBoundingClientRect) return;
  const rect = target.getBoundingClientRect();
  const floater = document.createElement('div');
  floater.className = `floater ${kind}`;
  floater.textContent = text;
  floater.style.left = `${rect.left + rect.width / 2}px`;
  floater.style.top = `${rect.top}px`;
  document.body.appendChild(floater);
  window.setTimeout(() => floater.remove(), 1400);
}

/**
 * Render the current screen into #app. `ui` carries the callbacks and the
 * transient state (selection, mute, record); it is owned by main.js.
 */
export function render(duel, ui) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  let screen;
  if (ui.screen === SCREEN_TITLE || duel.phase === PHASE_TITLE) {
    screen = titleScreen(ui);
  } else if (duel.phase === PHASE_OVER) {
    screen = overScreen(duel, ui);
  } else {
    screen = playScreen(duel, ui);
  }
  app.appendChild(screen);
  wireButtons(duel, ui);
}

function wireButtons(duel, ui) {
  const start = document.getElementById('start-btn');
  if (start) start.addEventListener('click', () => ui.onStart());
  const again = document.getElementById('again-btn');
  if (again) again.addEventListener('click', () => ui.onStart());
  const titleBtn = document.getElementById('title-btn');
  if (titleBtn) titleBtn.addEventListener('click', () => ui.onTitle());
  const endTurn = document.getElementById('end-turn-btn');
  if (endTurn) endTurn.addEventListener('click', () => ui.onEndTurn());
  const mute = document.getElementById('mute-btn');
  if (mute) mute.addEventListener('click', () => ui.onMute());
  const menu = document.getElementById('menu-btn');
  if (menu) menu.addEventListener('click', () => ui.onTitle());
}
