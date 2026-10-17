# translation
webapp version of the translation project

## URL parameters
- `?skipintro` skips the opening titles and goes straight to the passages surfacing.
- `?lang=de|fr|en|dp|fp|ep` sets the language in which the passages first surface (default `de`).
- Combine with `&`, e.g. `?skipintro&lang=fr`.

## Responsive display

The piece is composed on a fixed **1220×720 logical stage** (`WIDTH`, `HEIGHT` in [translation.js](translation.js)). All positions are in stage coordinates, so the images stay aligned with the text. The stage is scaled as a whole and letterboxed in black (the same method as `overboard`):

- **Scaling** ([style.css](style.css)): the canvas's internal size is unchanged. Its displayed size is set only in CSS, as `min(100vw, 100vh × 1220/720)` by `min(100vh, 100vw × 720/1220)` (using `dvh` where supported). It is `!important` so it beats p5's inline sizes, and `position: fixed` with `margin: auto` centres it on a fixed black `body`.
- **Crispness** (`stageDensity()`): `pixelDensity` is `devicePixelRatio ×` the displayed scale (measured from the canvas's bounding box, rounded up to 0.5, clamped to 1–3). `windowResized()` re-evaluates it after resizing settles (200 ms debounce).
- **Touch**: the canvas has `touch-action: none` so browser pan/zoom doesn't steal Hammer swipes and presses.
- **HTML** ([index.html](index.html)): the viewport meta tag is inside `<head>` as `width=device-width, initial-scale=1, viewport-fit=cover`, and the scripts are inside `<body>`.
- **State captions**: they show while Shift or a press is held, then linger `CAPTION_HOLD_MS` (1.5 s) and fade over `CAPTION_FADE_MS` (0.7 s). `releasePress()` also runs on raw `touchend`/`touchcancel`/`pointerup`/`pointercancel`, because Hammer emits no `pressup` if the finger drifts or the touch is cancelled.

This is "scale to fit", not a reflow, so on small portrait screens the piece is small.
