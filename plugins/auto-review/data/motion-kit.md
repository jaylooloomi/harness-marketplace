# Motion Kit (T1) — Lenis + GSAP scaffold for "Awwwards-feel" pages

The generator follows this when `context.json.motion` is true (web/visual tasks).
Goal: the **premium motion feel** of jerrythewebdev / Awwwards-tier sites —
smooth scroll + scroll-driven reveals + purposeful easing — in a **single HTML
file** (libs from CDN). NOT a build system, NOT heavy WebGL.

> **Why most of the "feel" is reachable here:** ~80% of that premium feel is
> *smooth scroll + scroll-triggered reveals + good type + good easing*, none of
> which need WebGL. WebGL is one optional "wow", not the ticket.

---

## The five non-negotiable rules

**R1 — Progressive enhancement (this is what makes it screenshot-able).**
The full content and final layout MUST be visible with plain HTML/CSS, with no
JS. Concretely:
- Animate with `gsap.from(...)` (the **resting state is the visible one**; GSAP
  animates *from* hidden *to* the natural CSS state). **Never** pre-hide an
  element with CSS `opacity:0` / `visibility:hidden` that only JS undoes — if JS
  or the CDN fails, that content is gone.
- Any preloader/overlay must be **injected by JS** and removed on load — never
  put a covering overlay in the static HTML (it'd hide everything with no JS).

**R2 — Honor `prefers-reduced-motion`.** If the user (or the screenshotter)
prefers reduced motion, skip all motion and show final states immediately.

**R3 — Expose `window.lenis`.** The screenshot tool drives `window.lenis.scrollTo`
to reach scroll-triggered end-states. Always assign it.

**R4 — Single file + graceful degrade.** Inline all your own CSS/JS. Only GSAP,
ScrollTrigger and Lenis come from CDN. Guard everything on `libsReady` so a
blocked CDN degrades to the (still complete) static page.

**R5 — Purposeful motion.** Custom easing (`power3.out`, `expo.out`, or a custom
cubic-bezier) — never the browser default. Motion serves hierarchy and rhythm,
not decoration. At most **one** WebGL moment, and only if it earns its weight.

**Perf:** only animate `transform` / `opacity` (never `top/left/width/height`);
`will-change` sparingly.

---

## CDN tags (put before your inline script)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
```

## Canonical init (copy this shape exactly)

```html
<script>
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var libsReady = window.gsap && window.ScrollTrigger && window.Lenis;
  if (!libsReady || reduce) return;            // R1/R2/R4: static page already complete

  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll, driven off GSAP's ticker, synced to ScrollTrigger.
  var lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  window.lenis = lenis;                        // R3: screenshotter drives this
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  // Reveals — note gsap.from: resting state stays VISIBLE if JS never runs.
  gsap.utils.toArray('[data-reveal]').forEach(function (el, i) {
    gsap.from(el, {
      y: 48, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
})();
</script>
```

---

## Pattern snippets (use what the design calls for)

**Stagger reveal** (siblings cascade): give a container `[data-reveal-group]`,
animate its children with `stagger: 0.08`.

**Parallax / scrub** (depth on scroll):
```js
gsap.to('[data-parallax]', {
  yPercent: -20, ease: 'none',
  scrollTrigger: { trigger: '[data-parallax]', scrub: true }
});
```

**Pin a section** while content advances:
```js
ScrollTrigger.create({ trigger: '.pin', start: 'top top', end: '+=100%', pin: true });
```

**Magnetic button** (pointer attraction):
```js
document.querySelectorAll('[data-magnetic]').forEach(function (b) {
  b.addEventListener('pointermove', function (e) {
    var r = b.getBoundingClientRect();
    gsap.to(b, { x: (e.clientX - r.left - r.width/2) * 0.3,
                 y: (e.clientY - r.top - r.height/2) * 0.3, duration: 0.4 });
  });
  b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.4 }); });
});
```

**Custom cursor**: a JS-injected `<div>` that lerps toward the pointer; hide on
touch devices. (Injected by JS, so no-JS sees the normal cursor — R1.)

**Preloader**: JS injects a full-screen cover, then `gsap.to(cover, {opacity:0,
onComplete: remove})` on `window.load`. Never in static HTML (R1).

**Kinetic hero type**: split the headline into spans and stagger them in with
`gsap.from(..., {yPercent:100, stagger:0.06})`; the spans sit at their natural
position by default (R1).

---

## Optional: one WebGL moment (T2, only if it earns it)

If (and only if) the concept truly wants it, add **one** of: a hero shader
background, or image-distortion-on-hover (e.g. `curtains.js` / `OGL`). Keep it
behind `libsReady`-style guards and `prefers-reduced-motion`. Default to NOT
doing this — a tight Lenis+GSAP page beats a janky WebGL one.

---

## What the evaluator will check (so build for it)

Stills can't show motion, so the evaluator reads the **motion layer in code**:
does it use smooth scroll (Lenis), scroll-triggered reveals (ScrollTrigger),
**custom** easing, and is the motion *purposeful*? And it confirms R1 — that the
page is fully legible with motion stripped. A page that imports GSAP but barely
animates, or that breaks without JS, scores worse than an honest static page.
