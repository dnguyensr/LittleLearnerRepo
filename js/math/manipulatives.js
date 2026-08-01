import { speak } from '../speech.js';

// Reusable tap-first widgets, built as DOM + CSS (no canvas, no libraries).
// Every tappable part is a real <button>: js/input.js skips play-area taps that
// land on a button, so widget taps never double-fire, and the widgets stay
// operable by keyboard and screen reader for free.
//
// Phase A ships the counter widgets the classical method needs. tenFrame(),
// numberLine(), baseTenBlocks(), numberBond() and barModel() arrive with
// Phases C and D.

export function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
}

function tapButton(className, text) {
    const btn = el('button', className);
    btn.type = 'button';
    btn.textContent = text;
    return btn;
}

/**
 * A group of tappable objects. Each tap "pops" one object and speaks the
 * running count; tapping a counted object un-counts it, so a miscount is
 * always recoverable.
 */
export function tapCounter(emoji, count, { label = 'object', tappable = true } = {}) {
    const group = el('div', 'emoji-group tap-counter');
    for (let i = 0; i < count; i++) {
        if (tappable) {
            const btn = tapButton('math-emoji tap-item', emoji);
            btn.setAttribute('aria-label', `${label} ${i + 1}`);
            group.appendChild(btn);
        } else {
            group.appendChild(el('span', 'math-emoji', emoji));
        }
    }
    return group;
}

// Toggle one tapped object and speak the group's running total.
// Returns the new count, or null if the target wasn't a counter item.
export function handleCounterTap(target) {
    const item = target.closest('.tap-item');
    if (!item || item.classList.contains('eaten')) return null;

    item.classList.toggle('counted');
    const group = item.closest('.tap-counter');
    const counted = group.querySelectorAll('.tap-item.counted').length;
    if (item.classList.contains('counted')) speak(String(counted), { interrupt: true });
    return counted;
}

// Walk a group aloud, lighting one object per beat. `token` guards against a
// walk-through that outlives its problem; pass a getter that returns false to
// abandon it.
export function countAloud(group, stillValid, { from = 0, delay = 600 } = {}) {
    const items = [...group.querySelectorAll('.tap-item, .math-emoji')]
        .filter(node => !node.classList.contains('eaten'));
    items.forEach((node, i) => {
        setTimeout(() => {
            if (!stillValid()) return;
            node.classList.add('counted');
            speak(String(from + i + 1), { interrupt: true });
        }, delay + i * delay);
    });
}

/**
 * The eater story as a manipulative: tap the animal to eat one object at a
 * time. Returns the eater button so the caller can wire its own state.
 */
export function eaterButton(eaterEmoji, eaterName) {
    const btn = tapButton('eater-btn', eaterEmoji);
    btn.setAttribute('aria-label', `Feed the ${eaterName.toLowerCase()}`);
    return btn;
}

// Dim the next uneaten object in a group. Returns how many are eaten now.
export function eatOne(group) {
    const next = group.querySelector('.tap-item:not(.eaten)');
    if (next) {
        next.classList.remove('counted');
        next.classList.add('eaten');
    }
    return group.querySelectorAll('.tap-item.eaten').length;
}
