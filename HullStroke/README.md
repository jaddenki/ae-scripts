# Hull Stroke

A ScriptUI panel that draws a single stroked outline wrapping around a group of
layers. The outline is a convex hull computed live by an expression, so it keeps
hugging the layers as they move, rotate, or scale — no rebaking needed.

It works with any layer type: shape layers, pre-comps, PNGs, footage, solids, and
text. Guide layers and adjustment layers in the selection are ignored.

## Install

Copy `HullStroke.jsx` into your After Effects `Scripts/ScriptUI Panels/` folder,
restart AE, and open it from the **Window** menu. It also runs as a floating
palette via **File > Scripts > Run Script File...** if you would rather not
install it.

## Using it

To create a rig, select two or more layers and hit **Wrap Stroke**. That adds a
shape layer named `HULL STROKE n` at the top of the comp with the hull expression
already wired up.

To add layers to an existing rig, select the `HULL STROKE` layer *plus* the layers
you want to include, then hit **Wrap Stroke** again. To take layers back out,
select the rig layer plus the layers to drop and hit **Remove Layers**. The rig
refuses to go empty, so the last layer can't be removed.

**Toggle Round** flips the roundness slider between 0 and 100 without needing any
selection — it finds the first rig in the comp if nothing is selected.

## Round corners

Append `~r` to a layer's name and that layer contributes a sampled ellipse ring to
the hull instead of four bounding-box corners, which rounds the outline where it
wraps that layer. So `Circle~r` and `Logo precomp~r` get round treatment while
`Badge` stays sharp. Mixing both in one rig is fine.

## Controls on the rig layer

The stroke width is set from the panel slider at creation time; after that, edit
the stroke directly on the shape layer. Three slider effects on the rig layer
drive the expression:

| Effect | Default | What it does |
| --- | --- | --- |
| Padding | 30 | How far outside each layer's bounding box the hull sits, in pixels |
| Roundness | 100 | Corner rounding strength, 0–100, only affects `~r` layers |
| Resolution | 32 | Points sampled around each `~r` layer's ellipse, clamped 3–128 |

## How it works

The layer list is serialized into a `/*LAYERS:...*/` comment at the top of the
path expression, which is how the panel reads back the current membership when you
add or remove layers. Each frame the expression collects candidate points from
every member layer — four bounding-box corners for sharp layers, a sampled ellipse
for `~r` layers — converts them to comp space with `toComp()`, and runs a monotone
chain convex hull over the result. Bezier tangents are then generated per vertex,
with a non-zero handle length only on vertices that came from a rounded layer.

Because `toComp()` returns `[x, y, z]` for 3D layers, every point is passed through
a `to2D()` strip before it reaches `createPath()`, and there is a NaN guard that
falls back to a degenerate triangle rather than throwing if a 3D layer produces
bad coordinates.

## Gotchas

The expression looks layers up by name via `thisComp.layer(name)`, so renaming a
member layer silently drops it from the hull. Re-add it after renaming. Layers
must also live in the same comp as the rig.

Adding `~r` to a name after the rig is built won't take effect on its own — the
round flag is baked into the expression at add time, so remove and re-add the
layer, or rename it first and then build.

## Credit

The panel carries an `@mkamil.designer` watermark in its UI, so the original
version came from there; this copy has been extended (3D-safe point handling,
add/remove membership editing, roundness toggle).
