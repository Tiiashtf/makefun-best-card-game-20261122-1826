// Cinder & Tide — the card catalogue.
//
// Every card in the game lives here: its element, its ember cost, what it does,
// and the words on its face. Four elements, each with its own colour and shape
// so a card reads at a glance even at thumbnail size:
//   Ember (red, flame) — direct damage and heavy wards.
//   Tide  (blue, wave) — drawing cards, freezing wards, washing the board.
//   Grove (green, leaf) — healing, growth, tough wards.
//   Stone (grey, gem)  — armour and stubborn wards.
//
// A card is one of two kinds:
//   ward  — a creature that stays on the table and strikes the rival duelist
//           at the end of its owner's turn. It has attack and health.
//   spell — an instant effect that resolves and leaves the table at once.
//
// The deck every duelist shuffles is built by buildDeck below: 24 cards,
// two copies of the eight commons and one copy of the eight rares.

export const ELEMENT_EMBER = 'ember';
export const ELEMENT_TIDE = 'tide';
export const ELEMENT_GROVE = 'grove';
export const ELEMENT_STONE = 'stone';

export const KIND_WARD = 'ward';
export const KIND_SPELL = 'spell';

/** Element look: colour pair, glyph and label, used by the renderer. */
export const ELEMENTS = {
  [ELEMENT_EMBER]: { name: 'Ember', glyph: '▲', colour: '#e5484d', dark: '#7f1d1d', ink: '#fff7ed' },
  [ELEMENT_TIDE]: { name: 'Tide', glyph: '≈', colour: '#2f7fe0', dark: '#172554', ink: '#eff6ff' },
  [ELEMENT_GROVE]: { name: 'Grove', glyph: '✿', colour: '#3d9b4f', dark: '#14532d', ink: '#f0fdf4' },
  [ELEMENT_STONE]: { name: 'Stone', glyph: '◆', colour: '#8a8f98', dark: '#374151', ink: '#f9fafb' },
};

/**
 * One card definition. `effect` names the rule the state engine applies:
 *   damage      — deal `amount` damage to the rival duelist.
 *   damageAllWards — deal `amount` damage to every rival ward.
 *   damageAndWard — deal `amount` to the rival and `wardAmount` to every rival ward.
 *   heal        — restore `amount` life to the caster.
 *   armour      — gain `amount` armour.
 *   armourDraw  — gain `amount` armour and draw `draw` cards.
 *   draw        — draw `draw` cards.
 *   drawDamage  — deal `amount` damage and draw `draw` cards.
 *   buffWards   — your wards gain `amount` attack and `health` health.
 *   freezeAll   — freeze every rival ward for `turns` turns.
 *   ward        — summon the ward (attack/health on the card itself).
 */
export const CARDS = [
  // ---- Ember ----
  { id: 'cinder-imp', name: 'Cinder Imp', element: ELEMENT_EMBER, cost: 2, kind: KIND_WARD,
    attack: 2, health: 1, text: 'A small spark with a big temper.', flavour: 'It bites first and asks never.' },
  { id: 'flame-lash', name: 'Flame Lash', element: ELEMENT_EMBER, cost: 3, kind: KIND_SPELL,
    effect: 'damage', amount: 4, text: 'Deal 4 damage to the rival.', flavour: 'A whip of living fire.' },
  { id: 'pyre-drake', name: 'Pyre Drake', element: ELEMENT_EMBER, cost: 6, kind: KIND_WARD,
    attack: 5, health: 5, text: 'A drake made of banked coals.', flavour: 'Where it lands, the table smoulders.' },
  { id: 'kindle-spark', name: 'Kindle Spark', element: ELEMENT_EMBER, cost: 1, kind: KIND_SPELL,
    effect: 'drawDamage', amount: 2, draw: 1, text: 'Deal 2 damage. Draw a card.', flavour: 'Every fire starts with one spark.' },
  { id: 'ember-nova', name: 'Ember Nova', element: ELEMENT_EMBER, cost: 5, kind: KIND_SPELL,
    effect: 'damageAndWard', amount: 3, wardAmount: 1, text: 'Deal 3 to the rival and 1 to each rival ward.', flavour: 'The sky catches light all at once.' },
  // ---- Tide ----
  { id: 'tidecaller', name: 'Tidecaller', element: ELEMENT_TIDE, cost: 3, kind: KIND_WARD,
    attack: 2, health: 3, effect: 'drawOnSummon', draw: 1, text: 'On summon: draw a card.', flavour: 'She hears what the water keeps.' },
  { id: 'frostbind', name: 'Frostbind', element: ELEMENT_TIDE, cost: 2, kind: KIND_SPELL,
    effect: 'freezeAll', turns: 2, text: 'Freeze all rival wards for 2 turns.', flavour: 'The tide goes still and hard as glass.' },
  { id: 'deep-current', name: 'Deep Current', element: ELEMENT_TIDE, cost: 2, kind: KIND_SPELL,
    effect: 'draw', draw: 2, text: 'Draw 2 cards.', flavour: 'What the deep gives, it gives twice.' },
  { id: 'riptide', name: 'Riptide', element: ELEMENT_TIDE, cost: 4, kind: KIND_SPELL,
    effect: 'damageAndWard', amount: 2, wardAmount: 3, text: 'Deal 2 to the rival and 3 to each rival ward.', flavour: 'The undertow takes the unwary.' },
  { id: 'stormcrow', name: 'Stormcrow', element: ELEMENT_TIDE, cost: 3, kind: KIND_WARD,
    attack: 3, health: 2, effect: 'damageOnSummon', amount: 1, text: 'On summon: deal 1 damage to the rival.', flavour: 'Its cry comes just before the rain.' },
  // ---- Grove ----
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: ELEMENT_GROVE, cost: 1, kind: KIND_WARD,
    attack: 1, health: 2, text: 'Small, sharp, and hard to pull up.', flavour: 'It grew where the last duel ended.' },
  { id: 'lifebloom', name: 'Lifebloom', element: ELEMENT_GROVE, cost: 2, kind: KIND_SPELL,
    effect: 'heal', amount: 6, text: 'Restore 6 life.', flavour: 'A flower that opens only for the hurt.' },
  { id: 'elder-treant', name: 'Elder Treant', element: ELEMENT_GROVE, cost: 5, kind: KIND_WARD,
    attack: 4, health: 6, text: 'Older than the isle it stands on.', flavour: 'It remembers every fire, and forgives none.' },
  { id: 'overgrowth', name: 'Overgrowth', element: ELEMENT_GROVE, cost: 3, kind: KIND_SPELL,
    effect: 'buffWards', amount: 2, health: 2, text: 'Your wards gain +2 attack and +2 health.', flavour: 'The green takes back the table.' },
  { id: 'root-snare', name: 'Root Snare', element: ELEMENT_GROVE, cost: 2, kind: KIND_SPELL,
    effect: 'damageFreezeAll', amount: 1, turns: 1, text: 'Deal 1 to all rival wards and freeze them 1 turn.', flavour: 'The floor itself reaches up.' },
  // ---- Stone ----
  { id: 'pebble-guard', name: 'Pebble Guard', element: ELEMENT_STONE, cost: 2, kind: KIND_WARD,
    attack: 1, health: 4, text: 'It does not move. That is the point.', flavour: 'A pebble with opinions.' },
  { id: 'bulwark', name: 'Bulwark', element: ELEMENT_STONE, cost: 3, kind: KIND_SPELL,
    effect: 'armour', amount: 6, text: 'Gain 6 armour.', flavour: 'Stone remembers how to stand.' },
  { id: 'stonefist-golem', name: 'Stonefist Golem', element: ELEMENT_STONE, cost: 4, kind: KIND_WARD,
    attack: 3, health: 5, text: 'Two fists, no hurry.', flavour: 'It was a mountain once. It still thinks like one.' },
  { id: 'quake', name: 'Quake', element: ELEMENT_STONE, cost: 4, kind: KIND_SPELL,
    effect: 'damageAllWards', amount: 2, text: 'Deal 2 damage to all rival wards.', flavour: 'The table itself objects.' },
  { id: 'mist-veil', name: 'Mist Veil', element: ELEMENT_STONE, cost: 2, kind: KIND_SPELL,
    effect: 'armourDraw', amount: 4, draw: 1, text: 'Gain 4 armour. Draw a card.', flavour: 'Behind the mist, anything could be waiting.' },
];

/** Cards dealt twice in a 24-card deck (the commons). */
export const COMMON_IDS = [
  'cinder-imp', 'flame-lash', 'kindle-spark', 'tidecaller',
  'deep-current', 'thorn-sprout', 'lifebloom', 'pebble-guard',
];

/** Cards dealt once in a 24-card deck (the rares). */
export const RARE_IDS = [
  'pyre-drake', 'ember-nova', 'frostbind', 'riptide',
  'stormcrow', 'elder-treant', 'overgrowth', 'root-snare',
  'bulwark', 'stonefist-golem', 'quake', 'mist-veil',
];

export function cardById(id) {
  return CARDS.find((card) => card.id === id) ?? null;
}

/**
 * Build a fresh 24-card deck and shuffle it with the given random source.
 * `rng` is a function returning a float in [0, 1); the same seed always
 * builds the same order, which keeps staged screenshots reproducible.
 */
export function buildDeck(rng) {
  const ids = [...COMMON_IDS, ...COMMON_IDS, ...RARE_IDS];
  const deck = ids.map((id) => ({ uid: 0, def: cardById(id) }));
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  deck.forEach((card, index) => { card.uid = index + 1; });
  return deck;
}

/** A short, human-readable line for the log when a card is played. */
export function describePlay(card) {
  if (card.def.kind === KIND_WARD) {
    return `${card.def.name} (${card.def.attack}/${card.def.health}) takes the table`;
  }
  return `${card.def.name} — ${card.def.text}`;
}
