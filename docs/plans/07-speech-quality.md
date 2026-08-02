# P7 — Speech quality

Goal: the app should sound like a person, not a 1998 answering machine — on the devices it's actually used on.

> **Status (2026-08-02):** Phases A, A2 and A3 done — voice selection fixed,
> counting paced to the voice, and the iOS novelty-voice bug closed. Phase B is a
> **spike, not a commitment**: a bundled neural engine costs 63–92 MB on a
> child's tablet, and must clear a hardware gate on the real target device
> before any of it is merged. **A3 is evidence against needing it at all** — the
> worst-sounding device turned out to be a ranking bug, not a missing engine.

## Where the bad voice actually comes from

Speech quality is whatever voices the browser exposes; the app ships no engine. Every platform's `getVoices()` is broken differently, which is what produced the reported symptoms:

| Platform | What you get | Notes |
| --- | --- | --- |
| **Windows — Edge** | 250+ voices, including Microsoft's "(Natural)" neural set | The best case by a wide margin |
| **Windows — Chrome / Firefox** | Old SAPI voices only (David, Zira) | The robotic voice. **Not fixable from our side** — the natural voices aren't exposed to these browsers at all |
| **iOS Safari** | Preloaded voices only; **Siri voices never appear**; `default: true` on *every* voice; the novelty and Eloquence sets are listed alongside the real ones | Names carry no quality marker — `voiceURI` is the only tier signal. Installing higher-quality variants can make preloaded ones vanish |
| **Android Chrome** | Lists voices that aren't installed and silently substitutes a generic one | The list is partly fictional, so a voice picker can't be trusted |

**The tablet/phone case is not the safe one.** It's the case where the platform APIs are least reliable — which is what makes the ranking work below load-bearing rather than cosmetic.

## Phase A — fix the picker (done 2026-08-01)

The old picker took the **first** voice matching `/en[-_]/` + `/natural/i`, decided **once at page load**. Both halves were wrong.

- [x] **The list is empty at load.** `getVoices()` populates asynchronously, so the startup pick was made from nothing and every early utterance fell through to the browser default. When `voiceschanged` fired mid-session the voice changed under the child — the reported "woman in Letters, then an Australian man that stuck". It was a load-time race, not anything to do with modes.
- [x] **"First English match" ignores region.** Edge enumerates ~250 voices across every English region; with Australia sorting before the United States, the first `(Natural)` hit is Australian while the content says "APPLES".
- [x] Replaced with a **score → deterministic tiebreak** ranking: locale fit first (exact `navigator.language`, then `en-US`, then any English), then quality markers in the name (`Natural`/`Neural`, then `Premium`/`Enhanced`), ties broken by name. Same device, same voice, every launch.
- [x] **`voice.default` is never scored** — iOS reports it `true` for everything, so the old fallback picked an arbitrary first voice on exactly the platform we care most about.
- [x] Voice is resolved **lazily per utterance** and re-ranked when the list changes, instead of being frozen at load.
- [x] `rankVoices()` is exported pure and covered by `tests/speech.spec.js` against realistic Edge and iOS voice lists — headless browsers expose no voices, so the ranking is tested directly.

## Phase A2 — counting follows the voice, not a stopwatch (done 2026-08-01)

Numbers mode counted objects on a fixed 500 ms timer and spoke each number with `interrupt: true`. Since a spoken digit actually takes **~1.25 s**, every number cut off the one before it — so the *better* the voice, the more chopped it sounded. Measured, not guessed: chained utterances start at 63 ms, 1323 ms, 2594 ms, 3747 ms, with only ~13 ms of engine gap between them.

- [x] `speakEach(phrases, { onPhraseStart })` in `js/speech.js`: **queue** the announcement and the whole count in one go, never interrupting, and reveal each object as its number actually starts. Only the first phrase interrupts, to clear whatever came before. The browser's own inter-utterance gap turns out to be exactly the rhythm counting wants, so there is no hand-rolled chain and no guessed delay.
- [x] `speak()` now takes `onStart`/`onEnd` and returns whether anything was queued, so callers can fall back to a timer when speech is off or unsupported.
- [x] Same fix applied to the other two places with the identical bug: `countAloud()` in `js/math/manipulatives.js` and `showHint()` in `js/modes/math.js`. Both previously interrupted their own intro line ("Take away 3!") with the first count, and `countAloud` called twice in one hint used to race two overlapping timers — queueing fixes that for free.
- [x] Safety net: one timer per object, ~2 s apart, both paths guarded so the voice and the net can never double-count. Speech events are not guaranteed — a backgrounded tab stops delivering them — and without this the count freezes part-way.

**Testing note worth keeping.** The first version of these specs waited on real audio and passed alone but failed under ten parallel workers: `speechSynthesis` is a single shared OS service, and it stalls under contention. Timing assertions now run with `speech: false` (the deterministic timer path); the voice path is contract-tested by instrumenting `speechSynthesis.speak`/`cancel` and asserting the queue is `['3!', '1', '2', '3']` with exactly **one** cancel — no waiting on audio at all. Verified over three consecutive full runs.

## Phase A3 — iOS was picking a novelty voice (done 2026-08-02)

Reported on an iPhone 16 Pro: the app spoke in a whispering, ghostly voice. It was
not the engine and not a Safari limitation — **Phase A's ranking chose it.**

Phase A was only ever validated against Edge-shaped lists, where quality lives in
the name (`(Natural)`). Apple's voices are bare first names with no marker at all,
so on iOS *every* candidate scored identically on locale and nothing else, and the
deterministic tiebreak — `a.name.localeCompare(b.name)` — decided the entire app.
That tiebreak has no idea the list it is sorting contains gag voices. iOS 16+
enumerates Apple's novelty set (Albert, Bells, Boing, Bubbles, Whisper, Zarvox…)
and the Eloquence set (Eddy, Flo, Grandma, Reed…) right alongside Samantha. Sorted
by name, **`Albert` — a breathy croak — wins.** The determinism fix worked exactly
as designed; it just made the app reliably pick the worst voice on the device.

- [x] **The voice *can* be set from the app.** `utterance.voice` is honoured on iOS
      Safari for anything `getVoices()` returns, so this needed no engine — only a
      ranking that knows what it is looking at. (Siri voices remain unreachable;
      those genuinely can't be selected.)
- [x] Score `voiceURI`, not just the name. Apple encodes the tier there and nowhere
      else: `com.apple.voice.premium.*` > `.enhanced.*` > `.compact.*`, with
      `com.apple.eloquence.*` and the novelty voices demoted hard.
- [x] Novelty/Eloquence/legacy-MacinTalk names are matched by name too, since the
      URI namespace `com.apple.speech.synthesis.voice.*` also holds **Alex**, one of
      the best voices Apple ships — the namespace alone can't be a reject rule.
- [x] The penalty is a **demotion (−1000), not a filter**: on a device exposing
      nothing else, a silly voice still beats returning null and beats whatever the
      platform would have substituted.
- [x] Resolve the chosen voice by `voiceURI` rather than name — Apple ships compact
      and enhanced variants under the *same* name, so name lookup could silently
      return the worse one.
- [x] `tests/speech.spec.js` now ranks a realistic iOS list (novelty + Eloquence +
      Samantha, all `default: true`) and asserts Samantha wins from any list order.

**The read-out that closes this loop.** `currentVoiceName()` had been exported since
Phase A and never used, so there was no way to tell a bad *voice* from a bad
*engine* on a device that can't be debugged locally. The parent panel now shows the
resolved voice under the speech toggle, and — behind the beta toggle — `listVoices()`
dumps the **full inventory**: every voice the device exposes, in ranked order, with
its lang, its score, and its `voiceURI`, with the chosen one marked. On iOS that is
the only way to see which voices are actually present, since it depends on what the
parent has downloaded. Check it first on any future "it sounds wrong" report.

## Phase A4 — WebKit installed, and what it turned out to be worth (2026-08-02)

`npx playwright install webkit` was run, and the `webkit` / `mobile-safari`
projects now execute the whole suite. What that is and isn't worth, measured
rather than assumed:

**It cannot test the voice, at all.** Probing the browser directly:
`window.speechSynthesis` is **absent entirely** — not an empty voice list, the
object does not exist, and `SpeechSynthesisUtterance` is `undefined`. Nor is
there an `AudioContext` under either spelling. And Apple's voices are iOS files
that do not exist on a Windows machine, so no locally installed browser can ever
enumerate them. The A3 bug was never findable locally and a future one won't be
either. The two speech-contract specs now `test.skip` on webkit explicitly.

**It immediately found a real bug, though — a boot crash.** `js/audio.js` built
its `AudioContext` at module scope, unguarded. With neither spelling available
that throws on import, and since every module imports audio, the app rendered a
blank page with no mode buttons: **274 of 278 WebKit tests failed on the same
root cause.** Now constructed defensively and every entry point guarded, so the
app runs silently instead of not at all. This matters beyond the test browser —
a real device can refuse a context under memory pressure, which is exactly the
condition Phase B's hardware gate is meant to provoke.

Two incidental fixes fell out: removing the implicit `any` from the old
constructor expression exposed two genuine `OscillatorType` violations the
typechecker had been blind to, and `mathlab-fit.spec.js` needed `test.slow()`
(it takes ~29s against a 30s default, and WebKit is slower still).

**`mobile-safari` now targets `iPhone 16 Pro` (402x681)**, the actual device,
instead of `iPhone 14` (390x664).

It also found a pre-existing Math Lab layout defect the moment `mobile-safari`
was pointed at a true phone viewport: with the numpad open, half the rungs put
the manipulative below the fold. Fixed by reshaping the numpad to two rows —
written up in `06-math-methods-beta.md`.

Standing after all of it: **550 passed, 6 skipped, 0 failed** across four
projects.

Not done, and deliberately: **a parent voice picker.** On Android the list contains voices that aren't installed, so the dropdown would offer choices that silently do nothing. Worth revisiting for desktop alone, or once the list can be validated by test-speaking a candidate.

## Phase B — bundled neural engine (spike)

### The size reality

| Option | Download | License |
| --- | --- | --- |
| Kokoro `af_heart` / `af_bella` (q8) | **~86–92 MB** (q4f16 is ~154 MB) | Apache-2.0, code and weights |
| Piper `en_US-amy` | **~63 MB** (low and medium are both ~63 MB — "low" does not mean small) | Engine GPL-3.0 (maintained fork) or MIT (`piper-plus`); **voice models carry their own licenses** |
| eSpeak NG | ~2 MB | GPL-3.0 — but *worse* than SAPI. Rules itself out |

There is no small good option. ~63 MB is the floor.

### On the CDN exception

Approved in principle, but it should be granted for the right reason: **a CDN does not make the download smaller.** The child's tablet still fetches 63–92 MB either way. What it actually buys:

- GitHub refuses files over 100 MB, so Kokoro's `q4f16` **cannot** live in the repo at all, and `q8` at ~92 MB clears it only barely.
- It keeps a ~63–92 MB binary out of git history, where it would bloat every clone forever and can never truly be deleted.

Those are real, and enough to justify it. But it introduces a regression worth stating plainly: **the app is currently fully offline-capable** — static files, no network after first load, works in a car or on a plane. A CDN-fetched model breaks that unless the model is cached (Cache API / IndexedDB) on first run, so caching is a requirement of this phase, not a nice-to-have.

- [ ] Vendor the *runtime* (small, ~1–3 MB) into the repo; fetch only the *weights* from a CDN.
- [ ] Cache weights on first successful load; never re-download.
- [ ] Fall back to `speechSynthesis` whenever the engine is unavailable, still downloading, or has failed. Phase A is that fallback, which is why it had to land first.
- [ ] Parent setting, default **off**. A 63 MB download must never be something a child triggers by tapping a mode.

### The hardware gate — run before writing any of the above

A toddler app that takes 30 seconds to say "count the apples" is broken regardless of how good it eventually sounds.

- [ ] On the **actual target tablet**, measure: cold download time on home wifi, model init time, and time-to-first-audio for a short utterance.
- [ ] Check iOS Safari WASM memory headroom with the model resident — Safari is aggressive about killing pages that allocate heavily.
- [ ] **Abort if time-to-first-audio after cache exceeds ~1 s**, or if Safari reloads the page under memory pressure.

### Alternative worth pricing first: pre-generated clips

Because npm is already allowed as *dev* tooling, Piper can run at build time and the site can ship plain audio files — no WASM, no runtime, no CDN, offline intact.

The vocabulary is small and templated: digits 0–99, letter names, phonics sounds, ~50 words, 16 item names, and the fixed phrases ("Great job!", "Carry the one!"). That is roughly 400–500 short clips — **on the order of 5–10 MB as Opus**, an order of magnitude smaller than any engine, and lazily loadable per mode.

- [ ] Price it properly. The catch is stitching: single fragments ("7", "Great job!") would sound excellent, but "38 take away 17" assembled from clips sounds choppy compared with one synthesized sentence.
- [ ] Check the per-voice model license permits redistributing synthesized audio — the engine's GPL does not reach the output, but each Piper voice has its own terms.
- [ ] Consider the hybrid: clips for the high-frequency fixed fragments, `speechSynthesis` for full sentences.

## Recommendation

Ship Phase A (done — it is needed on every path, since even a bundled engine needs a fallback), then **run the hardware gate and price the clips option before committing to a 63 MB dependency**. The engine is the expensive answer to a problem that is worst on Windows Chrome and mildest on the platforms most of the users are on.

**A3 sharpens that.** The iPhone report looked like the strongest argument yet for
Phase B, and it turned out to be six lines of ranking. Before spending 63 MB,
confirm on the actual device — via the new voice read-out — that the app is now on
Samantha (or an Enhanced voice, if one has been downloaded) and that it still
sounds wrong. The cheapest remaining win is not an engine at all: **downloading an
Enhanced or Premium en-US voice in iOS Settings → Accessibility → Spoken Content →
Voices costs the parent one tap, is free, stays offline, and the ranking now prefers
it automatically the moment it appears.** Price that before pricing WASM.
