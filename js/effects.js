import { playSuccessSound } from './audio.js';

const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
];

const emojis = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '❤️', '💜', '💙', '💚', '💛', '🧡'];

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
    scoreStorageKey = `lls-score-${modeId}`;
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
    star.textContent = emojis[Math.floor(Math.random() * emojis.length)];
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
