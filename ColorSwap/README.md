# Color Swap

Find-and-replace for a single color across an entire project. Give it a "from"
hex and a "to" hex and it walks every comp, every layer, and every property,
swapping matches as it goes.

## Install

Run it with **File > Scripts > Run Script File...** and pick `ColorSwap.jsx`.

## What it covers

Solid layer colors are changed at the source, so the swap follows every instance
of that solid in the project. Shape layer fills and strokes are handled, along
with color parameters on effects — Fill, Ramp, Gradient, Tint, and anything else
exposing a color property, since the walk is generic rather than an effect
whitelist. Text layer fill and stroke colors are handled separately, because
Source Text is a `TextDocument` rather than a plain color property.

Keyframed properties are handled keyframe by keyframe, so an animated color that
passes through the target value gets swapped at each key that matches rather than
being flattened.

Read-only color properties are skipped silently instead of aborting the run.

## Matching and tolerance

Matching is per-channel with a tolerance of `0.03` on a 0–1 scale, roughly 8/255
per channel. That slack exists because color management and 8-bit rounding mean
a swatch that reads `#FF0000` in the UI is often not exactly `1.0, 0.0, 0.0`
internally. Change the `TOLERANCE` constant near the top of the file to tighten
or loosen it.

Alpha is preserved: only the RGB channels are compared and replaced, so a
semi-transparent fill stays semi-transparent.

## When nothing matches

Rather than just reporting zero, the script collects every color it actually saw
during the walk and shows you the five closest to your target, each with its
distance. Usually the answer is right there — a hex that's a few values off, or
a color-management shift that moved everything. Copy one of the reported hex
values into the "from" field and run again, or check **File > Project Settings**
for the working color space.

## Notes

The whole run is a single undo group, so Cmd/Ctrl+Z reverts everything at once.

There is no scoping — it is the entire project, every comp, always. On a large
project the property walk is recursive over every nested property group, so give
it a moment before assuming it hung. Save first.
