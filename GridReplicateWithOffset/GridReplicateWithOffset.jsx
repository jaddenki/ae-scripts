// GridReplicateWithOffset.jsx
// Replicates a selected shape layer in an NxM grid.
// Each copy's animation is time-offset by (Manhattan distance from origin) * framesPerStep.
//
// HOW TO USE:
//   1. Select your animated shape layer in the timeline.
//   2. Run this script via File > Scripts > Run Script File...
//   3. Adjust the dialog settings and click OK.

(function gridReplicateWithOffset() {

    // ── Dialog ──────────────────────────────────────────────────────────────
    var dlg = new Window("dialog", "Grid Replicate With Offset");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var g1 = dlg.add("group"); g1.orientation = "row";
    g1.add("statictext", undefined, "Columns:");
    var colsField = g1.add("edittext", undefined, "5"); colsField.characters = 4;
    g1.add("statictext", undefined, "Rows:");
    var rowsField = g1.add("edittext", undefined, "5"); rowsField.characters = 4;

    var g2 = dlg.add("group"); g2.orientation = "row";
    g2.add("statictext", undefined, "X spacing (px):");
    var xSpaceField = g2.add("edittext", undefined, "150"); xSpaceField.characters = 6;
    g2.add("statictext", undefined, "Y spacing (px):");
    var ySpaceField = g2.add("edittext", undefined, "150"); ySpaceField.characters = 6;

    var g3 = dlg.add("group"); g3.orientation = "row";
    g3.add("statictext", undefined, "Frames offset per unit distance:");
    var framesField = g3.add("edittext", undefined, "1"); framesField.characters = 4;

    // Distance mode
    var g4 = dlg.add("group"); g4.orientation = "row";
    g4.add("statictext", undefined, "Distance mode:");
    var distMode = g4.add("dropdownlist", undefined, ["Manhattan (col+row)", "Chebyshev (max)", "Euclidean (diagonal)"]);
    distMode.selection = 0;

    // Origin
    var g5 = dlg.add("group"); g5.orientation = "row";
    g5.add("statictext", undefined, "Origin (col, row) 0-indexed:");
    var originColField = g5.add("edittext", undefined, "0"); originColField.characters = 4;
    var originRowField = g5.add("edittext", undefined, "0"); originRowField.characters = 4;

    var g6 = dlg.add("group"); g6.orientation = "row";
    var okBtn     = g6.add("button", undefined, "OK",     {name: "ok"});
    var cancelBtn = g6.add("button", undefined, "Cancel", {name: "cancel"});
    cancelBtn.onClick = function() { dlg.close(); };

    if (dlg.show() !== 1) return;

    var cols         = parseInt(colsField.text,   10) || 5;
    var rows         = parseInt(rowsField.text,   10) || 5;
    var xSpace       = parseFloat(xSpaceField.text)    || 150;
    var ySpace       = parseFloat(ySpaceField.text)    || 150;
    var framesPerUnit = parseFloat(framesField.text)   || 1;
    var originCol    = parseInt(originColField.text, 10) || 0;
    var originRow    = parseInt(originRowField.text, 10) || 0;
    var mode         = distMode.selection.index; // 0=Manhattan, 1=Chebyshev, 2=Euclidean

    // ── Validation ───────────────────────────────────────────────────────────
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Please open a composition first."); return;
    }
    if (comp.selectedLayers.length !== 1) {
        alert("Please select exactly one layer."); return;
    }

    var srcLayer = comp.selectedLayers[0];
    var fps      = comp.frameRate;

    // ── Build grid ───────────────────────────────────────────────────────────
    app.beginUndoGroup("Grid Replicate With Offset");

    // Original position is the [0,0] anchor of the grid in comp space.
    var srcPos = srcLayer.transform.position.value; // [x, y]

    // Track all created layers so we can parent them or group them.
    var createdLayers = [];

    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {

            // Skip the origin cell — that's the source layer itself.
            if (col === originCol && row === originRow) continue;

            // ── Distance calculation ────────────────────────────────────────
            var dc = Math.abs(col - originCol);
            var dr = Math.abs(row - originRow);
            var dist;
            if      (mode === 0) { dist = dc + dr; }                     // Manhattan
            else if (mode === 1) { dist = Math.max(dc, dr); }            // Chebyshev
            else                 { dist = Math.sqrt(dc*dc + dr*dr); }    // Euclidean

            // ── Duplicate ───────────────────────────────────────────────────
            var dup = srcLayer.duplicate();

            // ── Position ────────────────────────────────────────────────────
            var newX = srcPos[0] + (col - originCol) * xSpace;
            var newY = srcPos[1] + (row - originRow) * ySpace;
            dup.transform.position.setValue([newX, newY]);

            // ── Time offset ─────────────────────────────────────────────────
            // Shift the layer's in/out points AND time-remap or time-offset.
            //
            // Strategy: shift the layer's startTime backward by the offset
            // so the animation appears to be ahead by that many frames
            // (i.e., copies farther away start their animation earlier in
            // absolute time, creating a ripple FROM the origin outward).
            //
            // If you want the wave to travel FROM origin TO edges:
            //   use  +offset  (edges lag behind origin).
            // If you want edges to lead:
            //   use  -offset  (edges start earlier).
            //
            // Default: ripple radiates outward (edges lag).
            var offsetSeconds = (dist * framesPerUnit) / fps;

            // Shift the layer's in-point in the timeline
            dup.startTime = srcLayer.startTime + offsetSeconds;

            // If the source has Time Remapping, shift those keyframes too.
            var trProp = dup.property("ADBE Time Remapping");
            if (trProp && trProp.numKeys > 0) {
                for (var k = trProp.numKeys; k >= 1; k--) {
                    trProp.setValueAtTime(
                        trProp.keyTime(k) + offsetSeconds,
                        trProp.keyValue(k)
                    );
                    trProp.removeKey(k);
                }
            }

            // Name the layer clearly
            dup.name = srcLayer.name + " [" + col + "," + row + "]";

            createdLayers.push(dup);
        }
    }

    // Rename source layer to mark it as the origin
    srcLayer.name = srcLayer.name + " [origin " + originCol + "," + originRow + "]";

    app.endUndoGroup();

    alert("Done! Created " + createdLayers.length + " copies.\n\n" +
          "Tip: Select all grid layers and Pre-compose them to keep the timeline tidy.");

})();
