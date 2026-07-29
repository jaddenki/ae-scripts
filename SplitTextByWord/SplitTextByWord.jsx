{
  var comp = app.project.activeItem;
  var layer = comp.selectedLayers[0];
  var sourceText = layer.text.sourceText.value.toString();
  var words = sourceText.split(" ");

  app.beginUndoGroup("Split Text by Word");

  var newLayers = [];

  for (var i = 0; i < words.length; i++) {
    var newLayer = layer.duplicate();
    newLayer.text.sourceText.setValue(words[i]);
    newLayer.name = words[i];
    newLayers.push(newLayer);
  }

  layer.remove();

  // force ae to update so sourceRectAtTime returns real values
  app.project.activeItem.time = comp.workAreaStart;

  var cursor = 0;
  var padding = 30;
  var compCenterY = comp.height / 2;

  for (var j = 0; j < newLayers.length; j++) {
    var rect = newLayers[j].sourceRectAtTime(comp.workAreaStart, false);
    var w = rect.width;
    newLayers[j].transform.position.setValue([cursor + w / 2, compCenterY]);
    cursor += w + padding;
  }

  // center group horizontally
  var totalWidth = cursor - padding;
  var offsetX = comp.width / 2 - totalWidth / 2;
  for (var k = 0; k < newLayers.length; k++) {
    var p = newLayers[k].transform.position.value;
    newLayers[k].transform.position.setValue([p[0] + offsetX, p[1]]);
  }

  app.endUndoGroup();
}
