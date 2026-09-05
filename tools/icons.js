'use strict';

// Rasterises assets/favicon.svg to the PNGs that a manifest and Safari need.
//
// Why not just point everything at the SVG: Chrome will take an SVG in the
// manifest, but `apple-touch-icon` will not — Safari needs a real PNG, and
// Safari is the browser on the target tablet. Rather than commit binaries
// nobody can regenerate, the same pod is described once here as geometry and
// drawn procedurally. Keep this in sync with assets/favicon.svg by hand; the
// shape is four primitives and is not worth an SVG parser.
//
//   node tools/icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets');

// The palette is the P12-validated confirm green plus two lighter tints of it.
const POD_DARK = [0x1b, 0x5e, 0x20];
const POD_MID = [0x8b, 0xc3, 0x4a];
const BEAN = [0xdc, 0xed, 0xc8];
const GROUND = [0x2e, 0x7d, 0x32];

// Geometry in the 64-unit space assets/favicon.svg uses.
const BOX = 64;
const CORNER = 14;
const CENTER = 32;
const POD_RX = 26;
const POD_RY = 12;
const STROKE = 1.5;
const BEAN_R = 6.5;
const BEAN_X = [19, 32, 45];
const ROT = Math.PI / 4; // the SVG draws at rotate(-45), so sample at +45

/** Inside the rounded square that forms the icon's ground. */
function inGround(x, y) {
    const dx = Math.max(CORNER - x, 0, x - (BOX - CORNER));
    const dy = Math.max(CORNER - y, 0, y - (BOX - CORNER));
    return dx * dx + dy * dy <= CORNER * CORNER;
}

/** Colour of one sample point, in the icon's 64-unit space. */
function sample(x, y) {
    if (!inGround(x, y)) return null;

    // Into the pod's own frame, where it is axis-aligned.
    const ox = x - CENTER;
    const oy = y - CENTER;
    const px = ox * Math.cos(ROT) - oy * Math.sin(ROT);
    const py = ox * Math.sin(ROT) + oy * Math.cos(ROT);

    for (const bx of BEAN_X) {
        const bdx = px - (bx - CENTER);
        if (bdx * bdx + py * py <= BEAN_R * BEAN_R) return BEAN;
    }

    const inner = (px / POD_RX) ** 2 + (py / POD_RY) ** 2;
    if (inner <= 1) return POD_MID;

    const outer = (px / (POD_RX + STROKE)) ** 2 + (py / (POD_RY + STROKE)) ** 2;
    if (outer <= 1) return POD_DARK;

    return GROUND;
}

/** RGB pixels for one square icon, 4x4 supersampled so the pod edge is smooth. */
function render(size) {
    const SS = 4;
    const scale = BOX / size;
    const rgb = Buffer.alloc(size * size * 3);

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let hits = 0;

            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const x = (px + (sx + 0.5) / SS) * scale;
                    const y = (py + (sy + 0.5) / SS) * scale;
                    const c = sample(x, y);
                    // Outside the rounded corner: still opaque, still the
                    // ground colour. A transparent corner looks like damage
                    // on an iOS home screen, which masks its own shape.
                    const [cr, cg, cb] = c || GROUND;
                    r += cr;
                    g += cg;
                    b += cb;
                    hits++;
                }
            }

            const i = (py * size + px) * 3;
            rgb[i] = Math.round(r / hits);
            rgb[i + 1] = Math.round(g / hits);
            rgb[i + 2] = Math.round(b / hits);
        }
    }

    return rgb;
}

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgb) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // truecolour
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    // One filter byte (0 = None) in front of every scanline.
    const stride = size * 3;
    const raw = Buffer.alloc((stride + 1) * size);
    for (let y = 0; y < size; y++) {
        raw[y * (stride + 1)] = 0;
        rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

/** @type {{ name: string, size: number }[]} */
const TARGETS = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }
];

for (const { name, size } of TARGETS) {
    fs.writeFileSync(path.join(OUT_DIR, name), encodePng(size, render(size)));
    console.log(`${name} — ${size}x${size}`);
}
