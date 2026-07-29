// ColorSwap.jsx
// Replace every instance of a color with another color across the entire project.
// Covers: solid layer colors, shape layer fills/strokes, effect color params
// (Fill, Ramp, Gradient, Tint, etc), and text layer fill/stroke colors.
// Handles keyframed properties: each keyframe is checked/swapped individually.
//
// If nothing matches, it reports the closest colors it actually found so you
// can see why (usually a slight hex mismatch or color management shift).
//
// Usage: File > Scripts > Run Script File... in After Effects, select this file.
// Type the "from" hex and "to" hex in the dialog, hit Run.

(function () {

    var TOLERANCE = 0.03; // how close a color needs to be to count as a match (0-1 scale per channel)

    function hexToAE(hex) {
        hex = hex.replace(/^#/, '').trim();
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return [r / 255, g / 255, b / 255];
    }

    function aeToHex(c) {
        function byte(v) {
            var n = Math.max(0, Math.min(255, Math.round(v * 255)));
            var h = n.toString(16).toUpperCase();
            return h.length === 1 ? "0" + h : h;
        }
        return "#" + byte(c[0]) + byte(c[1]) + byte(c[2]);
    }

    function colorsMatch(c1, c2, tolerance) {
        for (var i = 0; i < 3; i++) {
            if (Math.abs(c1[i] - c2[i]) > tolerance) return false;
        }
        return true;
    }

    function colorDiff(c1, c2) {
        var maxDiff = 0;
        for (var i = 0; i < 3; i++) {
            var d = Math.abs(c1[i] - c2[i]);
            if (d > maxDiff) maxDiff = d;
        }
        return maxDiff;
    }

    function logSeen(stats, val, targetColor) {
        stats.seen.push({ hex: aeToHex(val), diff: colorDiff(val, targetColor) });
    }

    // --- Standard color properties (solids, shape fills/strokes, effect params) ---

    function swapColorInProperty(prop, targetColor, newColor, tolerance, stats) {
        if (prop.propertyValueType === PropertyValueType.COLOR) {
            try {
                if (prop.numKeys > 0) {
                    for (var k = 1; k <= prop.numKeys; k++) {
                        var val = prop.keyValue(k);
                        logSeen(stats, val, targetColor);
                        if (colorsMatch(val, targetColor, tolerance)) {
                            var newVal = val.length === 4 ? newColor.concat([val[3]]) : newColor;
                            prop.setValueAtKey(k, newVal);
                            stats.count++;
                        }
                    }
                } else if (!prop.isTimeVarying) {
                    var val2 = prop.value;
                    logSeen(stats, val2, targetColor);
                    if (colorsMatch(val2, targetColor, tolerance)) {
                        var newVal2 = val2.length === 4 ? newColor.concat([val2[3]]) : newColor;
                        prop.setValue(newVal2);
                        stats.count++;
                    }
                }
            } catch (e) { /* some color props are read-only, skip */ }
        }
    }

    function walkProperties(group, targetColor, newColor, tolerance, stats) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop;
            try { prop = group.property(i); } catch (e) { continue; }
            if (!prop) continue;
            if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
                walkProperties(prop, targetColor, newColor, tolerance, stats);
            } else {
                swapColorInProperty(prop, targetColor, newColor, tolerance, stats);
            }
        }
    }

    // --- Text layer fill/stroke colors (Source Text is a TextDocument, not a plain color prop) ---

    function swapTextLayerColor(layer, targetColor, newColor, tolerance, stats) {
        if (!(layer instanceof TextLayer)) return;
        var textProp = layer.property("Source Text");
        if (!textProp) return;

        function updateDoc(doc) {
            var changed = false;
            if (doc.applyFill) {
                logSeen(stats, doc.fillColor, targetColor);
                if (colorsMatch(doc.fillColor, targetColor, tolerance)) {
                    doc.fillColor = newColor;
                    changed = true;
                }
            }
            if (doc.applyStroke) {
                logSeen(stats, doc.strokeColor, targetColor);
                if (colorsMatch(doc.strokeColor, targetColor, tolerance)) {
                    doc.strokeColor = newColor;
                    changed = true;
                }
            }
            return changed;
        }

        try {
            if (textProp.numKeys > 0) {
                for (var k = 1; k <= textProp.numKeys; k++) {
                    var doc = textProp.keyValue(k);
                    if (updateDoc(doc)) {
                        textProp.setValueAtKey(k, doc);
                        stats.text++;
                    }
                }
            } else {
                var doc2 = textProp.value;
                if (updateDoc(doc2)) {
                    textProp.setValue(doc2);
                    stats.text++;
                }
            }
        } catch (e) { /* skip on error */ }
    }

    // --- Main ---

    function run(targetHex, newHex) {
        var targetColor = hexToAE(targetHex);
        var newColor = hexToAE(newHex);
        var stats = { count: 0, solids: 0, text: 0, seen: [] };

        var comps = [];
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) comps.push(item);
        }

        if (comps.length === 0) {
            alert("No compositions found in this project.");
            return;
        }

        app.beginUndoGroup("Swap Color " + targetHex + " -> " + newHex);

        for (var c = 0; c < comps.length; c++) {
            var comp = comps[c];
            for (var l = 1; l <= comp.numLayers; l++) {
                var layer = comp.layer(l);

                if (layer instanceof AVLayer && layer.source && (layer.source instanceof SolidSource)) {
                    var sc = layer.source.mainSource.color;
                    logSeen(stats, sc, targetColor);
                    if (colorsMatch(sc, targetColor, TOLERANCE)) {
                        layer.source.mainSource.color = newColor;
                        stats.solids++;
                    }
                }

                swapTextLayerColor(layer, targetColor, newColor, TOLERANCE, stats);
                walkProperties(layer, targetColor, newColor, TOLERANCE, stats);
            }
        }

        app.endUndoGroup();

        var totalChanged = stats.count + stats.solids + stats.text;

        if (totalChanged === 0) {
            // Diagnostic: show the closest colors actually found, so the user can see why nothing matched
            var byHex = {};
            for (var s = 0; s < stats.seen.length; s++) {
                var item2 = stats.seen[s];
                if (!(item2.hex in byHex) || item2.diff < byHex[item2.hex]) {
                    byHex[item2.hex] = item2.diff;
                }
            }
            var list = [];
            for (var h in byHex) {
                list.push({ hex: h, diff: byHex[h] });
            }
            list.sort(function (a, b) { return a.diff - b.diff; });

            var msg = "No colors matched " + targetHex + " (tolerance " + TOLERANCE + ").\n\n";
            if (list.length === 0) {
                msg += "No color properties were found at all in this project.";
            } else {
                msg += "Closest colors actually found in your project:\n";
                for (var m = 0; m < Math.min(5, list.length); m++) {
                    msg += list[m].hex + "  (diff " + list[m].diff.toFixed(3) + ")\n";
                }
                msg += "\nTry one of these hex values, or check color management under File > Project Settings.";
            }
            alert(msg);
        } else {
            alert("Done.\nProperty values changed: " + stats.count +
                  "\nSolid layers recolored: " + stats.solids +
                  "\nText layers recolored: " + stats.text);
        }
    }

    // --- UI ---
    var win = new Window("dialog", "Color Swap");
    win.orientation = "column";
    win.alignChildren = "fill";

    var g1 = win.add("group");
    g1.add("statictext", undefined, "Change from (hex):");
    var fromField = g1.add("edittext", undefined, "FF0000");
    fromField.characters = 10;

    var g2 = win.add("group");
    g2.add("statictext", undefined, "Change to (hex):");
    var toField = g2.add("edittext", undefined, "00FF00");
    toField.characters = 10;

    var note = win.add("statictext", undefined, "Applies across every comp in the project. Undo with Cmd/Ctrl+Z.", { multiline: true });
    try { note.graphics.font = ScriptUI.newFont(note.graphics.font.name, "ITALIC", 10); } catch (e) {}

    var btnGroup = win.add("group");
    var cancelBtn = btnGroup.add("button", undefined, "Cancel");
    var runBtn = btnGroup.add("button", undefined, "Run", { name: "ok" });

    cancelBtn.onClick = function () { win.close(); };
    runBtn.onClick = function () {
        run(fromField.text, toField.text);
        win.close();
    };

    win.center();
    win.show();

})();
