import { unlockAudio } from './audio.js';
import { closestEl } from './dom.js';

const oskEl = document.getElementById('osk');
const keyboardBtn = document.getElementById('keyboard-btn');
const playArea = document.getElementById('play-area');

export const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

let keyboardVisible = isTouchDevice;
let getActiveMode = () => null;

const specialKeyLabels = {
    ' ': '␣', 'Enter': '↵', 'Escape': 'ESC', 'Backspace': '⌫', 'Tab': '⇥',
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
    'Shift': '⇧', 'Control': 'Ctrl', 'Alt': 'Alt', 'Meta': '⊞', 'OS': '⊞',
    'CapsLock': 'Caps', 'Insert': 'Ins', 'Delete': 'Del', 'Home': 'Home',
    'End': 'End', 'PageUp': 'PgUp', 'PageDown': 'PgDn', 'PrintScreen': 'PrtSc',
    'ScrollLock': 'ScrLk', 'Pause': 'Pause', 'NumLock': 'NumLk'
};

export function displayLabel(key) {
    if (specialKeyLabels[key]) return specialKeyLabels[key];
    if (key.length === 1) return key.toUpperCase();
    return key;
}

/* ---------- On-screen keyboard layouts ---------- */

const letterRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    [' ']
];

const oskLayouts = {
    qwerty: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ...letterRows],
    // Letters and Words never ask for a digit, so they get the same board
    // without the number row: one less row of keys for a small hand to fumble
    // past, and one less row of screen the play area has to give up.
    letters: letterRows,
    // Two rows, not a phone keypad's four. On a 681px-tall iPhone the 4-row
    // grid ate 252px — 37% of the screen — and pushed the Math Lab
    // manipulatives below the fold, so a toddler had to scroll to reach the
    // blocks they were being asked to count. Two rows cost 131px instead.
    // Reading order (1-5, 6-0) also beats a keypad's bottom-up 7-8-9 for
    // children who are still learning the number line.
    numpad: [
        ['1', '2', '3', '4', '5', 'Backspace'],
        ['6', '7', '8', '9', '0', 'Enter']
    ]
};

// Set the on-screen keyboard for the active mode; null hides it entirely
// (for modes that provide their own touch surface, like the piano).
export function setOskLayout(layoutName) {
    if (!layoutName) {
        oskEl.innerHTML = '';
        oskEl.classList.remove('visible');
        oskEl.setAttribute('aria-hidden', 'true');
        keyboardBtn.style.display = 'none';
        return;
    }
    keyboardBtn.style.display = '';
    buildOsk(layoutName);
    updateOskVisibility();
}

function buildOsk(layoutName) {
    const layout = oskLayouts[layoutName] || oskLayouts.qwerty;
    oskEl.classList.toggle('numpad', layoutName === 'numpad');
    oskEl.innerHTML = '';

    for (const row of layout) {
        const rowEl = document.createElement('div');
        rowEl.className = 'osk-row';
        for (const key of row) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'osk-key';
            btn.dataset.key = key;
            btn.textContent = displayLabel(key);
            if (key === ' ') {
                btn.classList.add('wide');
                btn.setAttribute('aria-label', 'Space');
            }
            if (key === 'Backspace') {
                btn.setAttribute('aria-label', 'Backspace');
            }
            if (key === 'Enter') {
                btn.textContent = '✓';
                btn.classList.add('confirm');
                btn.setAttribute('aria-label', 'Check answer');
            }
            rowEl.appendChild(btn);
        }
        oskEl.appendChild(rowEl);
    }
}

function updateOskVisibility() {
    oskEl.classList.toggle('visible', keyboardVisible);
    oskEl.setAttribute('aria-hidden', String(!keyboardVisible));
    keyboardBtn.classList.toggle('active', keyboardVisible);
    keyboardBtn.setAttribute('aria-pressed', String(keyboardVisible));
}

// Highlight a key as a hint for the learner: subtle by default,
// strong (pulsing) after repeated misses. Pass null to clear.
export function setOskHint(key, strong = false) {
    for (const el of oskEl.querySelectorAll('.osk-key.hint, .osk-key.hint-strong')) {
        el.classList.remove('hint', 'hint-strong');
    }
    if (!key) return;
    let btn = null;
    try {
        btn = oskEl.querySelector(`[data-key="${CSS.escape(key)}"]`);
    } catch (err) { /* ignore */ }
    if (btn) {
        btn.classList.add(strong ? 'hint-strong' : 'hint');
    }
}

export function flashOskKey(key) {
    const normalized = key.length === 1 ? key.toUpperCase() : key;
    let btn = null;
    try {
        btn = oskEl.querySelector(`[data-key="${CSS.escape(normalized)}"]`);
    } catch (err) { /* ignore bad selectors */ }
    if (btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
    }
}

/* ---------- Dispatch ---------- */

function dispatchKey(key, source) {
    unlockAudio();
    const mode = getActiveMode();
    if (mode) {
        mode.onKey(key, source);
    }
}

function handleKeyDown(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    dispatchKey(e.key, 'physical');
    flashOskKey(e.key);

    return false;
}

function handleKeyUp(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const mode = getActiveMode();
    if (mode && mode.onKeyUp) {
        mode.onKeyUp(e.key);
    }

    return false;
}

function swallowKeyEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
}

export function initInput(activeModeGetter) {
    getActiveMode = activeModeGetter;

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('keypress', swallowKeyEvent, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('keypress', swallowKeyEvent, true);

    oskEl.addEventListener('pointerdown', function(e) {
        const btn = closestEl(e.target, '.osk-key');
        if (!btn) return;
        e.preventDefault();
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
        dispatchKey(btn.dataset.key, 'onscreen');
    });

    keyboardBtn.addEventListener('click', function() {
        keyboardVisible = !keyboardVisible;
        updateOskVisibility();
    });

    playArea.addEventListener('pointerdown', function(e) {
        unlockAudio();
        const mode = getActiveMode();
        if (!mode || !mode.onTap) return;
        if (closestEl(e.target, 'button')) return;
        mode.onTap(e.clientX, e.clientY);
    });

    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('click', unlockAudio);

    updateOskVisibility();
}
