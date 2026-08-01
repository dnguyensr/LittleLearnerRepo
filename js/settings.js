import { setSpeechEnabled } from './speech.js';

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
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch (err) {
        return { ...defaults };
    }
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

    let holdTimer = null;

    settingsBtn.addEventListener('pointerdown', () => {
        holdTimer = setTimeout(() => {
            panel.hidden = false;
        }, HOLD_MS);
    });
    for (const evt of ['pointerup', 'pointerleave', 'pointercancel']) {
        settingsBtn.addEventListener(evt, () => clearTimeout(holdTimer));
    }

    closeBtn.addEventListener('click', () => {
        panel.hidden = true;
    });
    panel.addEventListener('pointerdown', e => {
        if (e.target === panel) panel.hidden = true;
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
