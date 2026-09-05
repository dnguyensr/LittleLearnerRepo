import { playSuccessSound } from './audio.js';
import { celebrationEmojis } from './data/decor.js';

// Every stop here must clear 4.5:1 against white text, because white text is
// painted straight onto it and this list is re-rolled on almost every keypress
// — see docs/plans/12-readable-contrast.md. The pastel palette this replaced
// put 83 of 90 text combinations below threshold, several at 1.2:1, which is
// invisible rather than merely low.
//
// `node tools/contrast.js` checks the list, and tests/contrast.spec.js fails
// the suite if a new gradient is added without checking it.
export const colors = [
    'linear-gradient(135deg, #4a3f8f 0%, #764ba2 100%)',
    'linear-gradient(135deg, #8e2d63 0%, #c02a5a 100%)',
    'linear-gradient(135deg, #1565a0 0%, #0e7c86 100%)',
    'linear-gradient(135deg, #1f6f3f 0%, #0f7355 100%)',
    'linear-gradient(135deg, #b5442a 0%, #8a4b12 100%)',
    'linear-gradient(135deg, #0e7c86 0%, #2f6fb8 100%)',
    'linear-gradient(135deg, #7b2f8f 0%, #c1436f 100%)',
    'linear-gradient(135deg, #8a4b12 0%, #a63333 100%)',
    'linear-gradient(135deg, #6a3ec4 0%, #3a4fa0 100%)',
    'linear-gradient(135deg, #a8306b 0%, #6a3ec4 100%)'
];

const scoreDisplay = document.getElementById('score-display');
const scoreCountEl = document.getElementById('word-count');
let score = 0;
let scoreStorageKey = null;

// The CSS media block collapses keyframes, but bubbles/stars/flying keys are
// spawned elements whose existence is the animation — suppress them at the
// source. Checked at call time so an OS-level toggle applies immediately.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Each scoring mode keeps its own persistent score in localStorage.
export function setScoreMode(modeId) {
    scoreStorageKey = `edamame-score-${modeId}`;
    try {
        score = Number(localStorage.getItem(scoreStorageKey)) || 0;
    } catch (err) {
        score = 0;
    }
    scoreCountEl.textContent = String(score);
}

export function randomBackground() {
    document.body.style.background = colors[Math.floor(Math.random() * colors.length)];
}

export function createBubble(x, y) {
    if (reducedMotion.matches) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.style.width = Math.random() * 100 + 50 + 'px';
    bubble.style.height = bubble.style.width;
    bubble.style.left = (x !== undefined ? x - 50 : Math.random() * window.innerWidth) + 'px';
    bubble.style.top = (y !== undefined ? y - 50 : Math.random() * window.innerHeight) + 'px';
    bubble.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2000);
}

export function createStar(x, y) {
    if (reducedMotion.matches) return;
    const star = document.createElement('div');
    star.className = 'star';
    star.textContent = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1000);
}

export function randomStar() {
    createStar(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight
    );
}

export function createFlyingKey(key) {
    if (reducedMotion.matches) return;
    const flyingKey = document.createElement('div');
    flyingKey.className = 'flying-key';
    flyingKey.textContent = key;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    flyingKey.style.left = centerX + 'px';
    flyingKey.style.top = centerY + 'px';
    flyingKey.style.transform = 'translate(-50%, -50%)';

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(window.innerWidth, window.innerHeight);
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance;
    const rotation = (Math.random() - 0.5) * 720;

    const hue = Math.random() * 360;
    flyingKey.style.color = `hsl(${hue}, 80%, 70%)`;

    flyingKey.animate([
        {
            transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
            opacity: 1
        },
        {
            transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0.3) rotate(${rotation}deg)`,
            opacity: 0
        }
    ], {
        duration: 1500,
        easing: 'ease-out',
        fill: 'forwards'
    });

    document.body.appendChild(flyingKey);
    setTimeout(() => flyingKey.remove(), 1500);
}

export function setScoreVisible(visible) {
    scoreDisplay.classList.toggle('active', visible);
}

export function celebrate() {
    score++;
    scoreCountEl.textContent = String(score);
    if (scoreStorageKey) {
        try {
            localStorage.setItem(scoreStorageKey, String(score));
        } catch (err) { /* ignore */ }
    }

    playSuccessSound();

    // The success sound and score still land under reduced motion; the
    // twenty-piece confetti storm does not (each spawn is a no-op there).
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            randomStar();
            createBubble();
        }, i * 50);
    }
}
