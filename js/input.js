import { unlockAudio } from './audio.js';

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

const oskLayouts = {
    qwerty: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
        [' ']
    ],
    numpad: [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['Backspace', '0']
    ]
};

export function buildOsk(layoutName) {
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

function swallowKeyEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
}

export function initInput(activeModeGetter) {
    getActiveMode = activeModeGetter;

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', swallowKeyEvent, true);
    document.addEventListener('keypress', swallowKeyEvent, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', swallowKeyEvent, true);
    window.addEventListener('keypress', swallowKeyEvent, true);

    oskEl.addEventListener('pointerdown', function(e) {
        const btn = e.target.closest('.osk-key');
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
        if (e.target.closest('button')) return;
        mode.onTap(e.clientX, e.clientY);
    });

    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('click', unlockAudio);

    updateOskVisibility();
}
