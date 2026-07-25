import { setSpeechEnabled } from './speech.js';

const STORAGE_KEY = 'lls-settings';
const defaults = {
    speech: true,
    phonics: false,
    mathTier: 'auto'
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

export function setSetting(key, value) {
    settings[key] = value;
    save();
    if (key === 'speech') setSpeechEnabled(value);
}

/* ---------- Parent settings panel (gear is hold-to-open) ---------- */

const HOLD_MS = 600;

export function initSettingsUI() {
    setSpeechEnabled(settings.speech);

    const settingsBtn = document.getElementById('settings-btn');
    const panel = document.getElementById('settings-panel');
    const closeBtn = document.getElementById('settings-close');
    const speechBox = document.getElementById('set-speech');
    const phonicsBox = document.getElementById('set-phonics');
    const tierSelect = document.getElementById('set-math-tier');

    speechBox.checked = settings.speech;
    phonicsBox.checked = settings.phonics;
    tierSelect.value = String(settings.mathTier);

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
}
