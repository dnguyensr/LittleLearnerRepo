import { setSpeechEnabled } from './speech.js';
import { LEGACY_STAGE, loadProgress, clearProgress, describeProgress } from './math/ladder.js';

const STORAGE_KEY = 'lls-settings';
const defaults = {
    speech: true,
    phonics: false,
    mathTier: 'auto',
    betaModes: false,
    mathMethod: 'classical',
    mathLabLevel: 'auto'
};

function load() {
    let stored = {};
    try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (err) {
        return { ...defaults };
    }
    // mathLabLevel used to be '1'-'4'; it is now a stage id. A stored numeric
    // value would otherwise match no <option> and silently reset the dropdown.
    if (LEGACY_STAGE[stored.mathLabLevel]) {
        stored.mathLabLevel = LEGACY_STAGE[stored.mathLabLevel];
    }
    return { ...defaults, ...stored };
}

let settings = load();

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) { /* private mode etc. */ }
}

export function getSetting(key) {
    return settings[key];
}

const listeners = [];

// Notified on every setSetting call, so things outside the panel (the mode
// bar's beta gate, an active mode's level) can react without polling.
export function onSettingChange(fn) {
    listeners.push(fn);
}

export function setSetting(key, value) {
    settings[key] = value;
    save();
    if (key === 'speech') setSpeechEnabled(value);
    for (const fn of listeners) fn(key, value);
}

/* ---------- Parent settings panel (gear is hold-to-open) ---------- */

const HOLD_MS = 600;

export function initSettingsUI() {
    setSpeechEnabled(settings.speech);

    const settingsBtn = document.getElementById('settings-btn');
    const panel = document.getElementById('settings-panel');
    const closeBtn = document.getElementById('settings-close');
    const input = id => /** @type {HTMLInputElement} */ (document.getElementById(id));
    const select = id => /** @type {HTMLSelectElement} */ (document.getElementById(id));

    const speechBox = input('set-speech');
    const phonicsBox = input('set-phonics');
    const tierSelect = select('set-math-tier');
    const betaBox = input('set-beta-modes');
    const methodSelect = select('set-math-method');
    const labLevelSelect = select('set-mathlab-level');
    const betaRows = document.getElementById('beta-settings');

    speechBox.checked = settings.speech;
    phonicsBox.checked = settings.phonics;
    tierSelect.value = String(settings.mathTier);
    betaBox.checked = settings.betaModes;
    methodSelect.value = String(settings.mathMethod);
    labLevelSelect.value = String(settings.mathLabLevel);
    betaRows.hidden = !settings.betaModes;

    /* ---- Math Lab progress: read-out + two-tap reset ---- */

    const progressLabel = document.getElementById('mathlab-progress-label');
    const resetBtn = document.getElementById('mathlab-progress-reset');

    function refreshProgressRow() {
        progressLabel.textContent = describeProgress(loadProgress());
        resetBtn.textContent = 'Start over';
        resetBtn.classList.remove('armed');
    }
    refreshProgressRow();

    // Two taps to reset: one mis-tap in a parent panel shouldn't erase weeks
    // of a child's climbing.
    resetBtn.addEventListener('click', () => {
        if (!resetBtn.classList.contains('armed')) {
            resetBtn.textContent = 'Tap again to erase';
            resetBtn.classList.add('armed');
            return;
        }
        clearProgress();
        window.dispatchEvent(new CustomEvent('lls-mathlab-progress-reset'));
        refreshProgressRow();
    });

    let holdTimer = null;

    settingsBtn.addEventListener('pointerdown', () => {
        holdTimer = setTimeout(() => {
            panel.hidden = false;
            refreshProgressRow();
        }, HOLD_MS);
    });
    for (const evt of ['pointerup', 'pointerleave', 'pointercancel']) {
        settingsBtn.addEventListener(evt, () => clearTimeout(holdTimer));
    }

    // Closing the panel disarms a half-finished reset.
    closeBtn.addEventListener('click', () => {
        panel.hidden = true;
        refreshProgressRow();
    });
    panel.addEventListener('pointerdown', e => {
        if (e.target === panel) {
            panel.hidden = true;
            refreshProgressRow();
        }
    });

    speechBox.addEventListener('change', () => setSetting('speech', speechBox.checked));
    phonicsBox.addEventListener('change', () => setSetting('phonics', phonicsBox.checked));
    tierSelect.addEventListener('change', () => setSetting('mathTier', tierSelect.value));
    betaBox.addEventListener('change', () => {
        setSetting('betaModes', betaBox.checked);
        betaRows.hidden = !betaBox.checked;
    });
    methodSelect.addEventListener('change', () => setSetting('mathMethod', methodSelect.value));
    labLevelSelect.addEventListener('change', () => setSetting('mathLabLevel', labLevelSelect.value));
}
