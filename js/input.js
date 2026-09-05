import { unlockAudio } from './audio.js';
import { closestEl } from './dom.js';

const oskEl = document.getElementById('osk');
const keyboardBtn = document.getElementById('keyboard-btn');
const playArea = document.getElementById('play-area');
const settingsPanel = document.getElementById('settings-panel');

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
    // Letters never asks for a digit, so it gets the same board
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
            // Out of the tab order on purpose: this board is a *substitute* for
            // a keyboard, so someone who has one should not have to walk thirty
            // of its keys to reach the play area. Still fully usable by pointer.
            btn.tabIndex = -1;
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

/* ---------- Route by focus (P15) ----------
 *
 * Every keydown used to be swallowed, unconditionally. The reason was good —
 * this is an app for a toddler who will hold down keys, mash whole rows, and
 * find F5, Escape and the Windows key without trying — but the cost was that
 * nothing in the play area could be reached *or activated* by a keyboard, since
 * preventDefault on keydown kills Enter and Space as well as Tab.
 *
 * "Stop swallowing keys" was never available either: Free Play is literally a
 * keyboard smasher, and Math Lab reads Enter while Free Play reads Space, so the
 * same press means two different things.
 *
 * The rule that resolves it, in one sentence: if focus is on a control, the
 * keyboard drives the control; if focus is on the page, the keyboard drives the
 * mode. A toddler is always in the second case, so kiosk behaviour is untouched
 * for them. See docs/plans/15-keyboard-access.md.
 */

// Standard activation keys for a focused control. Everything else — letters,
// digits, Backspace, function keys — stays swallowed and routed in both states.
const ACTIVATION_KEYS = new Set(['Enter', ' ', 'Spacebar']);

const CONTROL_SELECTOR =
    'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/**
 * Whether the person is navigating by keyboard. Tab turns it on, any pointer
 * interaction turns it back off.
 *
 * Focus alone is not enough to decide this: tapping a mode button leaves focus
 * sitting on it, so a plain focus check made the next physical Enter re-trigger
 * that button instead of submitting a Math Lab answer.
 *
 * `:focus-visible` was tried instead and is not safe here either. This app
 * preventDefaults almost every key, but the digits a child types still count as
 * keyboard interaction to the browser, so the mode button they last tapped
 * starts matching `:focus-visible` and swallows the following Enter. The
 * browser's heuristic is answering a slightly different question than the one
 * being asked, so the state is tracked explicitly.
 */
let keyboardNav = false;

/**
 * The control that currently has keyboard focus, or null. `<body>` is the
 * resting state and is deliberately not a control: that is the case a child is
 * always in.
 */
function focusedControl() {
    if (!keyboardNav) return null;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    if (active === document.body || active === document.documentElement) return null;
    return active.matches(CONTROL_SELECTOR) ? active : null;
}

/**
 * Whether this event belongs to the focus layer rather than to the active mode.
 * Tab always does — it is the signal that someone is navigating by keyboard,
 * it is what the browser already uses to decide `:focus-visible`, and the worst
 * a toddler can do with it is make a focus ring appear.
 */
function isFocusKey(e) {
    if (e.key === 'Tab') {
        keyboardNav = true;
        return true;
    }
    return ACTIVATION_KEYS.has(e.key) && !!focusedControl();
}

/** Any pointer interaction hands the keyboard back to the active mode. */
function leaveKeyboardNav() {
    keyboardNav = false;
}

function handleKeyDown(e) {
    if (!settingsPanel.hidden) return true;

    // Escape is the way back out of keyboard navigation and into kiosk routing.
    // It is still routed to the mode when there was nothing focused, which is
    // what it did before.
    if (e.key === 'Escape') {
        const control = focusedControl();
        if (control) {
            e.preventDefault();
            leaveKeyboardNav();
            control.blur();
            return false;
        }
    }

    if (isFocusKey(e)) return true;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    dispatchKey(e.key, 'physical');
    flashOskKey(e.key);

    return false;
}

function handleKeyUp(e) {
    if (!settingsPanel.hidden) return true;
    // Space activates a button on key*up*, so the same rule has to hold here or
    // the press is swallowed on the way out instead of on the way in.
    if (isFocusKey(e)) return true;
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
    if (!settingsPanel.hidden) return true;
    if (isFocusKey(e)) return true;
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

    // A tap means the keyboard is no longer driving, so Enter and Space go back
    // to the active mode. This is what keeps a child who taps a mode button from
    // re-triggering it with the next Enter.
    document.addEventListener('pointerdown', leaveKeyboardNav, true);

    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('click', unlockAudio);

    updateOskVisibility();
}
