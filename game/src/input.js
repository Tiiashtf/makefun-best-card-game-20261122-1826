// Cinder & Tide — keyboard play.
//
// The mouse does the playing; the keyboard keeps up with it:
//   1–7  select the card in that hand slot
//   Enter play the selected card
//   E    end the turn
//   M    mute the sound
//   Esc  back to the title screen

export function installKeyboard(ui) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'm') {
      ui.onMute();
      return;
    }
    if (key === 'escape') {
      ui.onTitle();
      return;
    }
    if (ui.screen !== 'play') return;
    if (key === 'e') {
      ui.onEndTurn();
      return;
    }
    if (key === 'enter') {
      ui.onPlaySelected();
      return;
    }
    const slot = Number.parseInt(key, 10);
    if (slot >= 1 && slot <= 7) ui.onSelectSlot(slot - 1);
  });
}
