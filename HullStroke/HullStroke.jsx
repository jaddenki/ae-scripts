// ============================================================
//  HULL STROKE  v5  —  ScriptUI Panel for After Effects
//  Install: Scripts/ScriptUI Panels/HullStroke.jsx
//  Window menu → HullStroke
//
//  USAGE:
//   Create  — select 2+ layers (shapes, precomps, PNGs) → "Wrap Stroke"
//   Add     — select a HULL STROKE layer + any layers   → "Wrap Stroke"
//   Remove  — select a HULL STROKE layer + any layers   → "Remove Layers"
//   Toggle  — no selection needed → "Toggle Round"
//
//  All layer types supported: shape layers, pre-comps, PNGs,
//  footage, solids, text. Add ~r to any name for round corners.
// ============================================================

(function (thisObj) {

    // --------------------------------------------------------
    //  UI
    // --------------------------------------------------------
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Hull Stroke", undefined, { resizeable: true });

        win.orientation   = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing       = 10;
        win.margins       = 14;

        var ttl = win.add("statictext", undefined, "HULL STROKE");
        ttl.justify = "center";
        ttl.graphics.font = ScriptUI.newFont("dialog", "BOLD", 13);

        win.add("panel", undefined, "").preferredSize.height = 1;

        var noteGrp = win.add("group");
        noteGrp.orientation   = "column";
        noteGrp.alignChildren = ["fill", "top"];
        noteGrp.spacing       = 3;
        noteGrp.add("statictext", undefined, "Works on: shapes, pre-comps, PNGs, footage");
        noteGrp.add("statictext", undefined, "Round corners: end layer name with  ~r");
        noteGrp.add("statictext", undefined, 'e.g.  "Circle~r"   "Logo precomp~r"');

        win.add("panel", undefined, "").preferredSize.height = 1;

        var swGrp = win.add("group");
        swGrp.orientation   = "row";
        swGrp.alignChildren = ["center", "center"];
        swGrp.add("statictext", undefined, "Stroke width:");
        var swSlider = swGrp.add("slider", undefined, 2, 1, 30);
        swSlider.preferredSize.width = 100;
        var swVal = swGrp.add("edittext", undefined, "2");
        swVal.preferredSize.width = 32;
        swSlider.onChanging = function () { swVal.text = Math.round(swSlider.value).toString(); };
        swVal.onChange = function () {
            var v = parseFloat(swVal.text);
            if (!isNaN(v)) swSlider.value = Math.min(30, Math.max(1, v));
        };

        win.add("panel", undefined, "").preferredSize.height = 1;

        var btnGrp = win.add("group");
        btnGrp.orientation   = "row";
        btnGrp.alignChildren = ["fill", "center"];
        btnGrp.spacing       = 6;

        var wrapBtn   = btnGrp.add("button", undefined, "Wrap Stroke");
        var removeBtn = btnGrp.add("button", undefined, "Remove Layers");
        wrapBtn.preferredSize.height   = 36;
        removeBtn.preferredSize.height = 36;
        wrapBtn.preferredSize.width    = 110;
        removeBtn.preferredSize.width  = 110;

        win.add("panel", undefined, "").preferredSize.height = 1;

        var toggleBtn = win.add("button", undefined, "Toggle Round (ON / OFF)");
        toggleBtn.preferredSize.height = 30;

        var status = win.add("statictext", undefined, "Select layers to begin");
        status.justify            = "center";
        status.preferredSize.width = 220;

        var watermark = win.add("statictext", undefined, "@mkamil.designer");
        watermark.justify = "center";
        watermark.graphics.font = ScriptUI.newFont("dialog", "REGULAR", 9);

        wrapBtn.onClick   = function () { status.text = runWrap(Math.round(swSlider.value)); };
        removeBtn.onClick = function () { status.text = runRemove(); };
        toggleBtn.onClick = function () { status.text = toggleRoundness(); };

        if (win instanceof Window) { win.center(); win.show(); }
        else win.layout.layout(true);
        return win;
    }

    // --------------------------------------------------------
    //  HELPERS
    // --------------------------------------------------------
    function isRigLayer(lyr) {
        return (lyr instanceof ShapeLayer) &&
               (lyr.name === "HULL STROKE" || lyr.name.indexOf("HULL STROKE ") === 0);
    }

    function nextRigName(comp) {
        var used = {};
        for (var i = 1; i <= comp.numLayers; i++) used[comp.layer(i).name] = true;
        var n = 1;
        while (used["HULL STROKE " + n]) n++;
        return "HULL STROKE " + n;
    }

    // Accept ANY layer type except rig layers, guide layers, adjustment layers
    function splitSelection(comp) {
        var rig    = null;
        var shapes = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var lyr = comp.selectedLayers[i];
            if (isRigLayer(lyr)) {
                rig = lyr;
            } else {
                try {
                    if (!lyr.guideLayer && !lyr.adjustmentLayer) shapes.push(lyr);
                } catch(e) {
                    shapes.push(lyr);
                }
            }
        }
        return { rig: rig, shapes: shapes };
    }

    function getPathProp(rigLayer) {
        return rigLayer.property("Contents")
                       .property("Hull")
                       .property("Contents")
                       .property("Hull Path")
                       .property("Path");
    }

    function getRigLayerList(rigLayer) {
        try {
            var expr  = getPathProp(rigLayer).expression;
            var match = expr.match(/\/\*LAYERS:([\s\S]*?)\*\//);
            if (match) return JSON.parse(match[1]);
        } catch (e) {}
        return [];
    }

    function findAnyRig(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (isRigLayer(comp.layer(i))) return comp.layer(i);
        }
        return null;
    }

    // --------------------------------------------------------
    //  CREATE RIG
    // --------------------------------------------------------
    function createRig(comp, layerList, strokeWidth) {
        var rigLayer = comp.layers.addShape();
        rigLayer.name  = nextRigName(comp);
        rigLayer.label = 2;
        rigLayer.moveToBeginning();

        rigLayer.property("Transform").property("Anchor Point").setValue([0, 0]);
        rigLayer.property("Transform").property("Position").setValue([0, 0]);

        var grp  = rigLayer.property("Contents").addProperty("ADBE Vector Group");
        grp.name = "Hull";
        var grpC = grp.property("Contents");

        var pathGroup  = grpC.addProperty("ADBE Vector Shape - Group");
        pathGroup.name = "Hull Path";

        var stroke = grpC.addProperty("ADBE Vector Graphic - Stroke");
        stroke.property("Color").setValue([1, 1, 1, 1]);
        stroke.property("Stroke Width").setValue(strokeWidth);

        var fx = rigLayer.property("Effects");

        var padCtrl = fx.addProperty("ADBE Slider Control");
        padCtrl.name = "Padding";
        padCtrl.property("Slider").setValue(30);

        var rndCtrl = fx.addProperty("ADBE Slider Control");
        rndCtrl.name = "Roundness";
        rndCtrl.property("Slider").setValue(100);

        var resCtrl = fx.addProperty("ADBE Slider Control");
        resCtrl.name = "Resolution";
        resCtrl.property("Slider").setValue(32);

        getPathProp(rigLayer).expression = buildExpression(layerList);
        return rigLayer;
    }

    // --------------------------------------------------------
    //  WRAP
    // --------------------------------------------------------
    function runWrap(strokeWidth) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "No active composition.";

        var sel = splitSelection(comp);

        if (!sel.rig) {
            // Create new rig
            if (sel.shapes.length < 1) return "Select at least 1 layer to create a rig.";
            var layerList = [];
            for (var i = 0; i < sel.shapes.length; i++) {
                layerList.push({
                    name:  sel.shapes[i].name,
                    round: sel.shapes[i].name.slice(-2) === "~r"
                });
            }
            app.beginUndoGroup("Hull Stroke: Create");
            try {
                var rig = createRig(comp, layerList, strokeWidth);
                app.endUndoGroup();
                return "Created \"" + rig.name + "\" with " + layerList.length + " layers.";
            } catch (e) { app.endUndoGroup(); return "Error: " + e.toString(); }

        } else {
            // Add to existing rig
            if (sel.shapes.length === 0) return "Select layers to add to the rig.";
            var currentList = getRigLayerList(sel.rig);
            var existing    = {};
            for (var i = 0; i < currentList.length; i++) existing[currentList[i].name] = true;
            var added = 0;
            for (var i = 0; i < sel.shapes.length; i++) {
                if (!existing[sel.shapes[i].name]) {
                    currentList.push({
                        name:  sel.shapes[i].name,
                        round: sel.shapes[i].name.slice(-2) === "~r"
                    });
                    added++;
                }
            }
            if (added === 0) return "Those layers are already in the rig.";
            app.beginUndoGroup("Hull Stroke: Add");
            try {
                getPathProp(sel.rig).expression = buildExpression(currentList);
                app.endUndoGroup();
                return "Added " + added + " layer(s) \u2192 " + currentList.length + " total.";
            } catch (e) { app.endUndoGroup(); return "Error: " + e.toString(); }
        }
    }

    // --------------------------------------------------------
    //  REMOVE
    // --------------------------------------------------------
    function runRemove() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "No active composition.";

        var sel = splitSelection(comp);
        if (!sel.rig)                return "Select a HULL STROKE rig layer.";
        if (sel.shapes.length === 0) return "Select layers to remove from the rig.";

        var currentList = getRigLayerList(sel.rig);
        var removeNames = {};
        for (var i = 0; i < sel.shapes.length; i++) removeNames[sel.shapes[i].name] = true;

        var newList = [];
        for (var i = 0; i < currentList.length; i++) {
            if (!removeNames[currentList[i].name]) newList.push(currentList[i]);
        }

        var removed = currentList.length - newList.length;
        if (removed === 0)       return "None of those layers are in the rig.";
        if (newList.length < 1)  return "Can't remove — rig would be empty.";

        app.beginUndoGroup("Hull Stroke: Remove");
        try {
            getPathProp(sel.rig).expression = buildExpression(newList);
            app.endUndoGroup();
            return "Removed " + removed + " layer(s) \u2192 " + newList.length + " remain.";
        } catch (e) { app.endUndoGroup(); return "Error: " + e.toString(); }
    }

    // --------------------------------------------------------
    //  TOGGLE ROUNDNESS
    // --------------------------------------------------------
    function toggleRoundness() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "No active composition.";

        var sel = splitSelection(comp);
        var rig = sel.rig || findAnyRig(comp);
        if (!rig) return "No HULL STROKE rig found.";

        try {
            var slider = rig.property("Effects").property("Roundness").property("Slider");
            var next   = (slider.value > 0) ? 0 : 100;
            app.beginUndoGroup("Hull Stroke: Toggle Round");
            slider.setValue(next);
            app.endUndoGroup();
            return "\"" + rig.name + "\"  Roundness \u2192 " + next + (next === 0 ? "  (sharp)" : "  (round)");
        } catch (e) { return "Error: " + e.toString(); }
    }

    // --------------------------------------------------------
    //  EXPRESSION
    // --------------------------------------------------------
    function buildExpression(layerList) {
        var serialized = JSON.stringify(layerList);

        var layerArray = "[\n";
        for (var i = 0; i < layerList.length; i++) {
            var comma    = (i < layerList.length - 1) ? "," : "";
            var safeName = layerList[i].name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            layerArray  += '    {name:"' + safeName + '",round:' + layerList[i].round + '}' + comma + "\n";
        }
        layerArray += "]";

        var lines = [
'/*LAYERS:' + serialized + '*/',
'',
'var padding    = effect("Padding")("Slider");',
'var roundness  = Math.min(1, Math.max(0, effect("Roundness")("Slider") / 100));',
'var resolution = Math.round(Math.min(128, Math.max(3, effect("Resolution")("Slider"))));',
'',
'var layers = ' + layerArray + ';',
'',
'// sourceRectAtTime returns coords in layer space for all layer types.',
'// For shape layers the origin is the anchor point.',
'// For AVLayers (precomps, PNGs, footage) the origin is the layer center.',
'// toComp() handles all transforms (position, rotation, scale) correctly',
'// regardless of layer type — so we just need the local rect coords.',
'// When a layer is 3D, toComp() returns [x,y,z]. We always strip Z',
'// because createPath() only accepts 2D points.',
'function to2D(v) {',
'    return [v[0], v[1]];',
'}',
'',
'function getLayerRect(lyr, pad) {',
'    var r = lyr.sourceRectAtTime(time, false);',
'    return {',
'        cx:    r.left + r.width  / 2,',
'        cy:    r.top  + r.height / 2,',
'        halfW: r.width  / 2 + pad,',
'        halfH: r.height / 2 + pad',
'    };',
'}',
'',
'// Sharp: 4 corners of bounding box in comp space (Z stripped)',
'function getSharpPoints(lyr, pad) {',
'    var rc = getLayerRect(lyr, pad);',
'    return [',
'        {pt: to2D(lyr.toComp([rc.cx - rc.halfW, rc.cy - rc.halfH])), round:false},',
'        {pt: to2D(lyr.toComp([rc.cx + rc.halfW, rc.cy - rc.halfH])), round:false},',
'        {pt: to2D(lyr.toComp([rc.cx + rc.halfW, rc.cy + rc.halfH])), round:false},',
'        {pt: to2D(lyr.toComp([rc.cx - rc.halfW, rc.cy + rc.halfH])), round:false}',
'    ];',
'}',
'',
'// Round: ellipse ring sampled around bounding box in comp space (Z stripped)',
'function getRoundPoints(lyr, pad) {',
'    var rc  = getLayerRect(lyr, pad);',
'    var pts = [];',
'    for (var i = 0; i < resolution; i++) {',
'        var a = (i / resolution) * Math.PI * 2;',
'        pts.push({',
'            pt: to2D(lyr.toComp([rc.cx + Math.cos(a)*rc.halfW, rc.cy + Math.sin(a)*rc.halfH])),',
'            round: true',
'        });',
'    }',
'    return pts;',
'}',
'',
'function cross2(O,A,B) {',
'    return (A[0]-O[0])*(B[1]-O[1])-(A[1]-O[1])*(B[0]-O[0]);',
'}',
'',
'function hullTagged(tagged) {',
'    tagged = tagged.slice(0).sort(function(a,b){',
'        return a.pt[0]!==b.pt[0] ? a.pt[0]-b.pt[0] : a.pt[1]-b.pt[1];',
'    });',
'    var n=tagged.length, lo=[], hi=[];',
'    for (var i=0;i<n;i++){',
'        while(lo.length>=2 && cross2(lo[lo.length-2].pt,lo[lo.length-1].pt,tagged[i].pt)<=0) lo.pop();',
'        lo.push(tagged[i]);',
'    }',
'    for (var j=n-1;j>=0;j--){',
'        while(hi.length>=2 && cross2(hi[hi.length-2].pt,hi[hi.length-1].pt,tagged[j].pt)<=0) hi.pop();',
'        hi.push(tagged[j]);',
'    }',
'    hi.pop(); lo.pop();',
'    return lo.concat(hi);',
'}',
'',
'var all=[];',
'for (var k=0;k<layers.length;k++){',
'    try{',
'        var lyr=thisComp.layer(layers[k].name);',
'        var useRound = layers[k].round && roundness > 0;',
'        var pts = useRound ? getRoundPoints(lyr,padding) : getSharpPoints(lyr,padding);',
'        for(var p=0;p<pts.length;p++) all.push(pts[p]);',
'    }catch(e){}',
'}',
'',
'if(all.length<3){',
'    createPath([[0,0],[1,0],[0,1]],[],[],true);',
'}else{',
'    var hull=hullTagged(all);',
'    var hn=hull.length;',
'    var vPts=[],inT=[],outT=[];',
'    var valid=true;',
'    for(var i=0;i<hn;i++){',
'        var curr=hull[i].pt;',
'        var prev=hull[(i-1+hn)%hn].pt;',
'        var next=hull[(i+1)%hn].pt;',
'        // Safety: if any coord is NaN (can happen with 3D layers off-screen)',
'        // fall back to a zero tangent so createPath never receives bad data',
'        if(isNaN(curr[0])||isNaN(curr[1])){valid=false;break;}',
'        vPts.push([curr[0],curr[1]]);',
'        var toPrev=[prev[0]-curr[0],prev[1]-curr[1]];',
'        var toNext=[next[0]-curr[0],next[1]-curr[1]];',
'        var lp=Math.sqrt(toPrev[0]*toPrev[0]+toPrev[1]*toPrev[1]);',
'        var ln=Math.sqrt(toNext[0]*toNext[0]+toNext[1]*toNext[1]);',
'        var nPrev=lp>0?[toPrev[0]/lp,toPrev[1]/lp]:[0,0];',
'        var nNext=ln>0?[toNext[0]/ln,toNext[1]/ln]:[0,0];',
'        var h=0;',
'        if(hull[i].round && roundness>0){',
'            h=Math.min(lp,ln)*0.5*roundness;',
'        }',
'        inT.push( [nPrev[0]*h,nPrev[1]*h]);',
'        outT.push([nNext[0]*h,nNext[1]*h]);',
'    }',
'    if(valid && vPts.length>=3){',
'        createPath(vPts,inT,outT,true);',
'    }else{',
'        createPath([[0,0],[1,0],[0,1]],[],[],true);',
'    }',
'}'
        ];

        return lines.join("\n");
    }

    // --------------------------------------------------------
    //  INIT
    // --------------------------------------------------------
    buildUI(thisObj);

})(this);
