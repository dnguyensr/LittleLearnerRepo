import { initInput, setOskLayout } from './input.js';
import { unlockAudio } from './audio.js';
import { cancelSpeech } from './speech.js';
import { initSettingsUI } from './settings.js';
import { freeplayMode } from './modes/freeplay.js';
import { pianoMode } from './modes/piano.js';
import { lettersMode } from './modes/letters.js';
import { numbersMode } from './modes/numbers.js';
import { patternsMode } from './modes/patterns.js';
import { mathLabMode } from './modes/mathlab.js';
import { wordsMode } from './modes/words.js';

// Math Lab replaced the original Math mode once it had been tried on a real
// device. js/modes/math.js and #math-container are deliberately left in the
// tree, unreferenced, so the old mode can be re-registered here if Math Lab
// turns out to regress for a child.
const modes = [freeplayMode, pianoMode, lettersMode, numbersMode, patternsMode, mathLabMode, wordsMode];
const defaultModeId = 'free';

const instructions = document.getElementById('instructions');
const topButtons = document.querySelector('.top-buttons');
const keyboardBtn = document.getElementById('keyboard-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let activeMode = null;
const modeButtons = {};

function setMode(id) {
    const mode = modes.find(m => m.id === id);
    if (!mode || mode === activeMode) return;

    if (activeMode) {
        activeMode.deactivate();
    }
    cancelSpeech();
    activeMode = mode;
    // Build the OSK first: activate() may set hints on its keys
    setOskLayout(mode.oskLayout);
    mode.activate();

    for (const m of modes) {
        modeButtons[m.id].classList.toggle('active', m === mode);
        modeButtons[m.id].setAttribute('aria-pressed', String(m === mode));
    }

    instructions.textContent = mode.instructions;
}

function buildModeButtons() {
    for (const mode of modes) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'top-btn';
        btn.id = `${mode.id}-btn`;
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = `${mode.icon}<span class="btn-label"> ${mode.label}</span>`;
        btn.addEventListener('click', () => {
            // Tapping the active mode's button hops back to Free Play
            if (activeMode === mode && mode.id !== defaultModeId) {
                setMode(defaultModeId);
            } else {
                setMode(mode.id);
            }
        });
        topButtons.insertBefore(btn, keyboardBtn);
        modeButtons[mode.id] = btn;
    }
}

/* ---------- Fullscreen ---------- */

if (document.documentElement.requestFullscreen) {
    fullscreenBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });
} else {
    fullscreenBtn.style.display = 'none';
}

/* ---------- Init ---------- */

document.addEventListener('contextmenu', e => e.preventDefault());

buildModeButtons();
initInput(() => activeMode);
initSettingsUI();
setMode(defaultModeId);
unlockAudio();
