# Split Text By Word

Explodes a single text layer into one text layer per word, then lays those layers
out in a row and centers the row in the comp. Useful when you want to animate
words independently but typed the line as one layer.

## Install

Run it with **File > Scripts > Run Script File...** and pick
`SplitTextByWord.jsx`.

## Using it

Select one text layer in the timeline and run the script. The original layer is
duplicated once per word, each duplicate has its Source Text set to that word and
is renamed to match, and the original is deleted.

Layout is a single horizontal row: words are placed left to right with 30px of
padding between them, measured from each layer's actual rendered width, then the
whole row is shifted so it sits centered in the comp. Vertically everything lands
on the comp's center line.

Because each duplicate inherits the original layer's effects, keyframes, and
transform properties other than position, any animation already on the source
carries over to every word.

## Tweaking

Two values near the top of the layout loop are the ones worth changing:

```js
var padding = 30;                    // gap between words, in pixels
var compCenterY = comp.height / 2;   // vertical baseline for the row
```

Splitting is on a literal space, so a line with double spaces produces empty
layers, and hyphenated or punctuated words stay together as one layer.

## Notes

The script sets the comp's current time to the work area start before measuring.
That is deliberate — `sourceRectAtTime` returns stale or zero values until After
Effects has actually rendered the layer at that time, so without the nudge the
words all pile up at the same position.

Measurement happens at the work area start, so if the text animates in (scale,
tracking, a type-on) the widths measured there may not reflect the layer's
resting size. Park the work area start on a frame where the text is at full size
before running.

Everything is wrapped in one undo group, so Cmd/Ctrl+Z restores the original
layer.
