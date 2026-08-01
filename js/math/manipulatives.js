import { speak, speakEach } from '../speech.js';

// Reusable tap-first widgets, built as DOM + CSS (no canvas, no libraries).
// Every tappable part is a real <button>: js/input.js skips play-area taps that
// land on a button, so widget taps never double-fire, and the widgets stay
// operable by keyboard and screen reader for free.
//
// Phase A ships the counter widgets the classical method needs; Phase C adds
// the Common Core set (ten frame, number line, open number line, base-ten
// blocks). numberBond() and barModel() arrive with Phase D.
//
// Widgets keep their state in the DOM (classes and data-* attributes) rather
// than in module variables, so a re-render can't desync from what's on screen
// and the methods stay stateless.

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

/**
 * Walk a group aloud, lighting each object as its number is spoken. The counts
 * are queued rather than interrupting one another, so they pace to the voice
 * and land after whatever the hint said first — the old version interrupted its
 * own intro and then chopped each number off with the next.
 *
 * `stillValid` abandons a walk-through that outlived its problem.
 */
export function countAloud(group, stillValid, { from = 0, delay = 600 } = {}) {
    const items = [...group.querySelectorAll('.tap-item, .math-emoji')]
        .filter(node => !node.classList.contains('eaten'));

    const light = index => {
        if (stillValid()) items[index].classList.add('counted');
    };

    const spoke = speakEach(items.map((_, i) => String(from + i + 1)), {
        onPhraseStart: light
    });

    if (!spoke) {
        items.forEach((_, i) => setTimeout(() => light(i), delay + i * delay));
    }
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

/* ---------- Ten frame ---------- */

/**
 * A 2×5 ten frame. Cells are tappable: tap an empty one to place a counter,
 * tap a filled one to take it back.
 *
 * @param {number} filled  counters already placed
 * @param {{ name?: string, interactive?: boolean }} [options]
 */
export function tenFrame(filled = 0, { name = 'frame', interactive = true } = {}) {
    const frame = el('div', 'ten-frame');
    frame.dataset.frame = name;
    for (let i = 0; i < 10; i++) {
        const cell = interactive ? tapButton('tf-cell', '') : el('div', 'tf-cell');
        if (i < filled) cell.classList.add('filled');
        if (interactive) cell.setAttribute('aria-label', `Ten frame space ${i + 1}`);
        frame.appendChild(cell);
    }
    return frame;
}

export function frameCount(frame) {
    return frame.querySelectorAll('.tf-cell.filled').length;
}

// Place a counter in the first empty cell. Returns false when the frame is full.
export function fillCell(frame) {
    const cell = frame.querySelector('.tf-cell:not(.filled)');
    if (!cell) return false;
    cell.classList.add('filled');
    return true;
}

// Take the last counter back out. Returns false when the frame is empty.
export function emptyCell(frame) {
    const cells = [...frame.querySelectorAll('.tf-cell.filled')];
    const cell = cells[cells.length - 1];
    if (!cell) return false;
    cell.classList.remove('filled');
    return true;
}

/* ---------- Number line ---------- */

/**
 * A tick-per-number line with a frog sitting on the current value. Tapping a
 * tick hops the frog there and trails the ticks it passed over.
 *
 * @param {number} max
 * @param {number} start
 * @param {{ min?: number }} [options]
 */
export function numberLine(max, start, { min = 0 } = {}) {
    const line = el('div', 'number-line');
    line.dataset.position = String(start);
    for (let v = min; v <= max; v++) {
        const tick = tapButton('nl-tick', String(v));
        tick.dataset.value = String(v);
        tick.setAttribute('aria-label', `Hop to ${v}`);
        line.appendChild(tick);
    }
    placeFrog(line, start);
    return line;
}

function placeFrog(line, value) {
    for (const el of line.querySelectorAll('.nl-tick.here')) el.classList.remove('here');
    const tick = line.querySelector(`.nl-tick[data-value="${value}"]`);
    if (tick) tick.classList.add('here');
}

/**
 * Hop the frog to `value`, marking everything it passed over. Returns the new
 * position, or null if that value isn't on this line.
 */
export function hopTo(line, value) {
    const tick = line.querySelector(`.nl-tick[data-value="${value}"]`);
    if (!tick) return null;

    const from = Number(line.dataset.position);
    const [lo, hi] = from < value ? [from, value] : [value, from];
    for (const t of line.querySelectorAll('.nl-tick')) {
        const v = Number(t.dataset.value);
        t.classList.toggle('hopped', v >= lo && v <= hi);
    }
    line.dataset.position = String(value);
    placeFrog(line, value);
    return value;
}

/* ---------- Open number line ---------- */

function stopEl(value, className = '') {
    return el('span', `ol-stop ${className}`.trim(), String(value));
}

/**
 * The open number line: no ticks, just landmarks. The child hops in tens and
 * ones and watches the running position, which is how the strategy is taught.
 *
 * @param {number} start
 * @param {1|-1} direction
 */
export function openNumberLine(start, direction) {
    const line = el('div', 'open-line');
    line.dataset.position = String(start);
    line.dataset.direction = String(direction);
    line.dataset.start = String(start);

    const track = el('div', 'ol-track');
    track.appendChild(stopEl(start, 'start'));
    line.appendChild(track);

    const controls = el('div', 'ol-controls');
    const sign = direction > 0 ? '+' : '−';
    for (const size of [10, 1]) {
        const btn = tapButton('ol-hop', `${sign}${size}`);
        btn.dataset.hop = String(size);
        btn.setAttribute('aria-label', `${direction > 0 ? 'Add' : 'Subtract'} ${size}`);
        controls.appendChild(btn);
    }
    const undo = tapButton('ol-hop ol-undo', '↶');
    undo.dataset.hop = 'undo';
    undo.setAttribute('aria-label', 'Undo the last hop');
    controls.appendChild(undo);
    line.appendChild(controls);

    return line;
}

// Hop by `size` in the line's direction. Returns the new position.
export function hopBy(line, size) {
    const direction = Number(line.dataset.direction);
    const next = Number(line.dataset.position) + size * direction;
    const track = line.querySelector('.ol-track');
    track.appendChild(el('span', 'ol-arc', `${direction > 0 ? '+' : '−'}${size}`));
    track.appendChild(stopEl(next));
    line.dataset.position = String(next);
    return next;
}

// Undo the last hop. Returns the position, unchanged if there's nothing to undo.
export function undoHop(line) {
    const track = line.querySelector('.ol-track');
    const stops = [...track.querySelectorAll('.ol-stop')];
    const arcs = [...track.querySelectorAll('.ol-arc')];
    if (stops.length < 2) return Number(line.dataset.position);

    stops.pop().remove();
    arcs.pop().remove();
    const position = Number(stops[stops.length - 1].textContent);
    line.dataset.position = String(position);
    return position;
}

/* ---------- Base-ten blocks ---------- */

/**
 * Tens rods and loose ones. Ten loose ones can be snapped into a rod, which is
 * what makes regrouping visible instead of a rule to remember.
 *
 * @param {number} rods
 * @param {number} ones
 */
export function baseTenBlocks(rods, ones) {
    const wrap = el('div', 'base-ten');

    const rodBox = el('div', 'btb-rods');
    for (let i = 0; i < rods; i++) rodBox.appendChild(el('div', 'btb-rod'));
    wrap.appendChild(rodBox);

    const oneBox = el('div', 'btb-ones');
    for (let i = 0; i < ones; i++) {
        const cube = tapButton('btb-one', '');
        cube.setAttribute('aria-label', `Loose one ${i + 1}`);
        oneBox.appendChild(cube);
    }
    wrap.appendChild(oneBox);

    return wrap;
}

export function blockCounts(wrap) {
    return {
        rods: wrap.querySelectorAll('.btb-rod').length,
        ones: wrap.querySelectorAll('.btb-one').length,
        selected: wrap.querySelectorAll('.btb-one.selected').length
    };
}

/**
 * Swap ten selected ones for a new rod. Returns true when a snap happened, so
 * the caller can celebrate the regroup.
 */
export function snapTen(wrap) {
    const selected = [...wrap.querySelectorAll('.btb-one.selected')];
    if (selected.length < 10) return false;
    for (const cube of selected.slice(0, 10)) cube.remove();
    const rod = el('div', 'btb-rod new');
    wrap.querySelector('.btb-rods').appendChild(rod);
    return true;
}

/* ---------- Dot card ---------- */

/**
 * The pictorial step between real objects and a bare numeral: the same
 * quantity as plain dots. Dots are `.tap-item`s inside a `.tap-counter`, so
 * handleCounterTap() and countAloud() work on them unchanged.
 */
export function dotCard(count) {
    const card = el('div', 'dot-card tap-counter');
    for (let i = 0; i < count; i++) {
        const dot = tapButton('dot tap-item', '');
        dot.setAttribute('aria-label', `Dot ${i + 1}`);
        card.appendChild(dot);
    }
    return card;
}

export function numeralCard(value) {
    return el('div', 'numeral-card', String(value));
}

/* ---------- Number bond ---------- */

function bondNode(value, className) {
    const known = value !== null && value !== undefined;
    const node = el(className.includes('nb-part') ? 'button' : 'div', `nb-node ${className}`);
    if (node instanceof HTMLButtonElement) node.type = 'button';
    if (known) {
        node.textContent = String(value);
    } else {
        // The unknown node carries the shell's answer slot, so the child's
        // typing lands inside the bond instead of in a box underneath it.
        const slot = el('span', 'nb-slot', '?');
        slot.dataset.slot = 'total';
        node.appendChild(slot);
    }
    return node;
}

/**
 * A part-whole number bond. Pass null for whichever value is unknown; that
 * node becomes the answer slot.
 *
 * @param {number|null} whole
 * @param {(number|null)[]} parts
 */
export function numberBond(whole, parts) {
    const bond = el('div', 'number-bond');
    bond.appendChild(bondNode(whole, 'nb-whole'));
    bond.appendChild(el('div', 'nb-branches', '<span></span><span></span>'));

    const partRow = el('div', 'nb-parts');
    parts.forEach((value, i) => {
        const node = bondNode(value, 'nb-part');
        node.dataset.part = String(i);
        if (value !== null) node.setAttribute('aria-label', `Part ${value}. Tap to break it up.`);
        partRow.appendChild(node);
    });
    bond.appendChild(partRow);

    return bond;
}

/**
 * Break a part into two, which is how make-a-ten is taught: 8 + 5 becomes
 * 8 + 2 + 3 so the 2 can complete the ten. Returns false if it already split.
 */
export function splitPart(bond, index, first, second) {
    const part = bond.querySelector(`.nb-part[data-part="${index}"]`);
    if (!part || part.classList.contains('split')) return false;

    part.classList.add('split');
    const kids = el('div', 'nb-split');
    kids.appendChild(el('span', 'nb-node nb-subpart', String(first)));
    kids.appendChild(el('span', 'nb-node nb-subpart', String(second)));
    part.appendChild(kids);
    return true;
}

/* ---------- Bar model ---------- */

/**
 * A part-whole bar. Segments are sized by their value so the picture stays
 * proportional, which is the point of the model.
 *
 * @param {{ value: number, covered?: boolean, slot?: boolean, label?: string }[]} segments
 * @param {{ brace?: string|null }} [options]
 */
export function barModel(segments, { brace = null } = {}) {
    const model = el('div', 'bar-model');
    const bar = el('div', 'bm-bar');

    segments.forEach((segment, i) => {
        const seg = el('div', 'bm-seg');
        seg.style.flexGrow = String(Math.max(1, segment.value));
        seg.dataset.segment = String(i);
        if (segment.covered) {
            seg.classList.add('covered');
            seg.textContent = '?';
            seg.dataset.value = String(segment.value);
        } else {
            seg.textContent = segment.label ?? String(segment.value);
        }
        if (segment.slot) {
            seg.textContent = '';
            const slot = el('span', 'bm-slot', '?');
            slot.dataset.slot = 'total';
            seg.appendChild(slot);
        }
        bar.appendChild(seg);
    });

    model.appendChild(bar);
    if (brace !== null) model.appendChild(el('div', 'bm-brace', brace));
    return model;
}

// Uncover a hidden segment, showing the value it was hiding.
export function revealSegment(model, index) {
    const seg = model.querySelector(`.bm-seg[data-segment="${index}"].covered`);
    if (!seg) return false;
    seg.classList.remove('covered');
    seg.classList.add('revealed');
    seg.textContent = seg.dataset.value;
    return true;
}
