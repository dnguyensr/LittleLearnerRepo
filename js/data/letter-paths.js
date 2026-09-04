// Uppercase stroke paths, as waypoints a child taps in order.
//
// Coordinates live in a 0–100 box with y increasing downward, which is the SVG
// convention, so an entry can be read against the rendered letter without
// flipping anything in your head.
//
// Each letter is a list of *strokes*; each stroke is a list of `[x, y]`
// waypoints. A new stroke lifts the pen: js/modes/letters.js draws segments
// within a stroke and never between the end of one and the start of the next.
//
// Stroke order and direction follow the way the letters are taught to write —
// top before bottom, left before right, the vertical spine of B/D/P/R before
// its bowl — because the motor sequence is part of what is being learned, not
// just the finished shape.
//
// Curves are polylines with enough waypoints to read as a curve. More points
// would trace more smoothly and ask more taps of a three-year-old; these are
// tuned for the fewest points that still look like the letter.
//
// See docs/plans/13-letter-formation.md.

/** @typedef {[number, number]} Waypoint */

/** @type {Record<string, Waypoint[][]>} */
export const letterPaths = {
    A: [[[50, 6], [16, 94]], [[50, 6], [84, 94]], [[28, 64], [72, 64]]],
    B: [
        [[22, 6], [22, 94]],
        [[22, 6], [60, 10], [74, 28], [60, 47], [22, 47]],
        [[22, 47], [64, 51], [78, 71], [62, 94], [22, 94]]
    ],
    C: [[[80, 24], [58, 8], [32, 16], [18, 50], [32, 84], [58, 92], [80, 76]]],
    D: [[[22, 6], [22, 94]], [[22, 6], [58, 12], [80, 50], [58, 88], [22, 94]]],
    E: [[[22, 6], [22, 94]], [[22, 6], [78, 6]], [[22, 50], [66, 50]], [[22, 94], [78, 94]]],
    F: [[[22, 6], [22, 94]], [[22, 6], [78, 6]], [[22, 50], [66, 50]]],
    G: [
        [[80, 24], [58, 8], [32, 16], [18, 50], [32, 84], [58, 92], [80, 76], [80, 54]],
        [[80, 54], [58, 54]]
    ],
    H: [[[22, 6], [22, 94]], [[78, 6], [78, 94]], [[22, 50], [78, 50]]],
    I: [[[50, 6], [50, 94]], [[30, 6], [70, 6]], [[30, 94], [70, 94]]],
    J: [[[70, 6], [70, 70], [58, 90], [38, 94], [24, 80]]],
    K: [[[22, 6], [22, 94]], [[76, 6], [22, 52]], [[40, 42], [78, 94]]],
    L: [[[24, 6], [24, 94]], [[24, 94], [78, 94]]],
    M: [[[18, 94], [18, 6], [50, 60], [82, 6], [82, 94]]],
    N: [[[22, 94], [22, 6], [78, 94], [78, 6]]],
    O: [[[50, 6], [22, 24], [14, 50], [22, 76], [50, 94], [78, 76], [86, 50], [78, 24], [50, 6]]],
    P: [[[22, 6], [22, 94]], [[22, 6], [62, 10], [76, 30], [62, 52], [22, 52]]],
    Q: [
        [[50, 6], [22, 24], [14, 50], [22, 76], [50, 94], [78, 76], [86, 50], [78, 24], [50, 6]],
        [[58, 68], [88, 98]]
    ],
    R: [
        [[22, 6], [22, 94]],
        [[22, 6], [62, 10], [76, 30], [62, 52], [22, 52]],
        [[44, 52], [80, 94]]
    ],
    S: [[[78, 22], [56, 8], [30, 14], [24, 34], [48, 48], [68, 58], [76, 76], [58, 92], [30, 90], [20, 76]]],
    T: [[[18, 8], [82, 8]], [[50, 8], [50, 94]]],
    U: [[[22, 6], [22, 62], [34, 86], [50, 94], [66, 86], [78, 62], [78, 6]]],
    V: [[[18, 6], [50, 94], [82, 6]]],
    W: [[[14, 6], [32, 94], [50, 40], [68, 94], [86, 6]]],
    X: [[[22, 6], [78, 94]], [[78, 6], [22, 94]]],
    Y: [[[24, 6], [50, 50]], [[76, 6], [50, 50]], [[50, 50], [50, 94]]],
    Z: [[[20, 8], [80, 8]], [[80, 8], [20, 92]], [[20, 92], [80, 92]]]
};

/** @param {string} letter */
export function pathFor(letter) {
    return letterPaths[String(letter).toUpperCase()] || null;
}

/** Total waypoints across every stroke, which is how many taps the letter asks for. */
export function waypointCount(letter) {
    const strokes = pathFor(letter);
    return strokes ? strokes.reduce((total, stroke) => total + stroke.length, 0) : 0;
}
