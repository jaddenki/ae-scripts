# Grid Replicate With Offset

Takes one animated layer and stamps it out into an NxM grid, giving each copy a
time offset based on how far it sits from a chosen origin cell. The result is a
ripple or wave that travels across the grid instead of every copy animating in
unison.

## Install

Run it with **File > Scripts > Run Script File...** and pick
`GridReplicateWithOffset.jsx`. Nothing to install — drop it in
`Scripts/` if you want it in the **File > Scripts** submenu permanently.

## Using it

Select exactly one layer in the timeline (the script bails if zero or more than
one is selected) and run the script. Fill in the dialog and click OK.

The source layer stays where it is and becomes the origin cell — it gets renamed
to `<name> [origin c,r]`. Every other cell is a duplicate named `<name> [c,r]`.

## Dialog options

**Columns / Rows** set the grid size, defaulting to 5x5. **X spacing / Y spacing**
are the pixel gaps between cell centers, both defaulting to 150.

**Frames offset per unit distance** is the delay multiplier. At 1, a cell two
units from the origin starts two frames later. Fractional values work fine.

**Distance mode** decides the shape of the wave. Manhattan (`col + row`) gives a
diamond front radiating from the origin. Chebyshev (`max(col, row)`) gives square
rings. Euclidean (`sqrt`) gives circular rings, and produces sub-frame offsets
since the distances aren't whole numbers.

**Origin (col, row)** is 0-indexed and defaults to the top-left cell. Put it in
the middle of the grid for a wave that radiates outward in all directions.

## Direction of the wave

By default cells farther from the origin lag behind — the ripple travels outward.
To flip it so the edges lead and the origin fires last, change this line near the
bottom of the loop:

```js
dup.startTime = srcLayer.startTime + offsetSeconds;
```

to use `- offsetSeconds` instead.

## Notes

Offsetting is done by shifting each duplicate's `startTime`, so the source layer
needs its animation to live inside its own layer time — keyframes on the layer's
transform, or a pre-comp with animation inside it. If the source has Time
Remapping keys, those are shifted by the same amount so remapped animation stays
in sync.

Everything runs inside one undo group, so a single Cmd/Ctrl+Z reverts the whole
grid. For a 10x10 grid that is 99 duplicated layers, which will make the timeline
unwieldy — pre-compose the result.
