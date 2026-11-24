/* Photoshop ExtendScript. Run with PSD_BUILDER_MANIFEST set to a trusted object,
 * or run as a local Photoshop script and choose a UTF-8 JSON manifest. */
(function () {
    var oldUnits = app.preferences.rulerUnits;
    var d;
    function fail(message) { throw new Error(message); }
    function requireNumber(value, name) {
        if (typeof value !== 'number' || !isFinite(value)) fail('Invalid number: ' + name);
        return value;
    }
    function positive(value, name) { if (requireNumber(value, name) <= 0) fail('Must be positive: ' + name); return value; }
    function color(hex) {
        if (typeof hex !== 'string' || !/^[0-9A-Fa-f]{6}$/.test(hex)) fail('Invalid RGB: ' + hex);
        var c = new SolidColor(); c.rgb.hexValue = hex; return c;
    }
    function rgb(hex) {
        color(hex);
        var c = new ActionDescriptor();
        c.putDouble(charIDToTypeID('Rd  '), parseInt(hex.substr(0,2),16));
        c.putDouble(charIDToTypeID('Grn '), parseInt(hex.substr(2,2),16));
        c.putDouble(charIDToTypeID('Bl  '), parseInt(hex.substr(4,2),16));
        return c;
    }
    function cid(s) { return charIDToTypeID(s); }
    function sid(s) { return stringIDToTypeID(s); }
    function readManifest() {
        if (typeof PSD_BUILDER_MANIFEST !== 'undefined') return PSD_BUILDER_MANIFEST;
        var file = File.openDialog('Select PSD builder JSON manifest', '*.json');
        if (!file) return null;
        if (typeof JSON === 'undefined' || typeof JSON.parse !== 'function') fail('JSON.parse unavailable; inject the manifest as PSD_BUILDER_MANIFEST through the Photoshop execution tool.');
        file.encoding='UTF8'; if (!file.open('r')) fail('Cannot open manifest');
        var content; try { content=file.read(); } finally { file.close(); }
        return JSON.parse(content);
    }
    function validate(m) {
        if (!m || !m.name || !m.groups || !m.groups.length) fail('Missing name or groups');
        positive(m.width,'width'); positive(m.height,'height');
        if (!m.output || !/\.psd$/i.test(m.output)) fail('output must be a PSD path');
        var out=new File(m.output); if(out.exists) fail('Output already exists; choose a new name');
        if(!out.parent.exists) fail('Output directory does not exist');
        for(var i=0;i<m.groups.length;i++){
            var g=m.groups[i]; if(!g.name || !g.layers) fail('Invalid group '+i);
            for(var j=0;j<g.layers.length;j++){
                var l=g.layers[j]; if(!l.name) fail('Missing layer name');
                requireNumber(l.x,l.name+'.x'); requireNumber(l.y,l.name+'.y');
                if(l.type==='image'){
                    if(!l.path || !new File(l.path).exists) fail('Missing asset: '+l.path);
                    positive(l.width,l.name+'.width'); positive(l.height,l.name+'.height');
                    if(l.fit && l.fit!=='contain' && l.fit!=='stretch') fail('Unsupported image fit');
                }else if(l.type==='shape'){
                    if(l.shape!=='rectangle' && l.shape!=='rounded-rectangle' && l.shape!=='ellipse') fail('Unsupported shape: '+l.shape);
                    positive(l.width,l.name+'.width'); positive(l.height,l.name+'.height'); color(l.color);
                }else if(l.type==='text'){
                    if(typeof l.text!=='string') fail('Missing text: '+l.name);
                    positive(l.size,l.name+'.size'); color(l.color);
                }else fail('Unsupported layer type: '+l.type);
                if(l.gradient){color(l.gradient.top);color(l.gradient.bottom);}
            }
        }
        return out;
    }
    function group(name) { var g=d.layerSets.add(); g.name=name; return g; }
    function imageLayer(g,l) {
        var file=new File(l.path),src=null,alreadyOpen=false;
        for(var k=0;k<app.documents.length;k++){
            try { if(app.documents[k].fullName.fsName===file.fsName){src=app.documents[k];alreadyOpen=true;break;} }catch(e){}
        }
        if(!src) src=app.open(file);
        var layer;
        try { layer=src.activeLayer.duplicate(d,ElementPlacement.PLACEATBEGINNING); }
        finally { if(!alreadyOpen) src.close(SaveOptions.DONOTSAVECHANGES); }
        app.activeDocument=d; d.activeLayer=layer; layer.name=l.name;
        executeAction(sid('newPlacedLayer'),undefined,DialogModes.NO);
        layer=d.activeLayer; layer.name=l.name;
        var b=layer.bounds, bw=b[2].as('px')-b[0].as('px'), bh=b[3].as('px')-b[1].as('px');
        if(bw<=0 || bh<=0) fail('Empty asset: '+l.path);
        var sx=l.width/bw,sy=l.height/bh;
        if(l.fit!=='stretch') sx=sy=Math.min(sx,sy);
        layer.resize(sx*100,sy*100,AnchorPosition.MIDDLECENTER);
        b=layer.bounds;
        var x=l.x+(l.fit==='stretch'?0:(l.width-(b[2].as('px')-b[0].as('px')))/2);
        var y=l.y+(l.fit==='stretch'?0:(l.height-(b[3].as('px')-b[1].as('px')))/2);
        layer.translate(UnitValue(x-b[0].as('px'),'px'),UnitValue(y-b[1].as('px'),'px'));
        layer.move(g,ElementPlacement.INSIDE);return layer;
    }
    function textLayer(g,l) {
        var layer=g.artLayers.add();layer.name=l.name;layer.kind=LayerKind.TEXT;
        var t=layer.textItem;t.contents=l.text;t.position=[UnitValue(l.x,'px'),UnitValue(l.y,'px')];
        t.size=UnitValue(l.size,'pt');t.color=color(l.color);
        if(l.font) t.font=l.font;
        if(l.horizontalScale) t.horizontalScale=l.horizontalScale;
        return layer;
    }
    function shapeLayer(g,l) {
        d.activeLayer=g;
        var cmd=new ActionDescriptor(),ref=new ActionReference();ref.putClass(sid('contentLayer'));cmd.putReference(cid('null'),ref);
        var use=new ActionDescriptor(),typ=new ActionDescriptor();typ.putObject(cid('Clr '),cid('RGBC'),rgb(l.color));
        use.putObject(cid('Type'),sid('solidColorLayer'),typ);
        var sh=new ActionDescriptor();sh.putUnitDouble(cid('Top '),cid('#Pxl'),l.y);sh.putUnitDouble(cid('Left'),cid('#Pxl'),l.x);
        sh.putUnitDouble(cid('Btom'),cid('#Pxl'),l.y+l.height);sh.putUnitDouble(cid('Rght'),cid('#Pxl'),l.x+l.width);
        if(l.shape==='rounded-rectangle') sh.putUnitDouble(cid('Rds '),cid('#Pxl'),Math.min(l.radius||0,l.width/2,l.height/2));
        use.putObject(cid('Shp '),cid(l.shape==='ellipse'?'Elps':'Rctn'),sh);
        cmd.putObject(cid('Usng'),sid('contentLayer'),use);executeAction(cid('Mk  '),cmd,DialogModes.NO);
        var layer=d.activeLayer;layer.name=l.name;if(layer.parent!==g)layer.move(g,ElementPlacement.INSIDE);return layer;
    }
    function gradient(layer,gr) {
        d.activeLayer=layer;
        var cmd=new ActionDescriptor(),ref=new ActionReference();ref.putProperty(cid('Prpr'),cid('Lefx'));ref.putEnumerated(cid('Lyr '),cid('Ordn'),cid('Trgt'));cmd.putReference(cid('null'),ref);
        var fx=new ActionDescriptor();fx.putUnitDouble(cid('Scl '),cid('#Prc'),100);
        var e=new ActionDescriptor();e.putBoolean(cid('enab'),true);e.putEnumerated(cid('Md  '),cid('BlnM'),cid('Nrml'));e.putUnitDouble(cid('Opct'),cid('#Prc'),100);e.putUnitDouble(cid('Angl'),cid('#Ang'),90);e.putEnumerated(cid('Type'),cid('GrdT'),cid('Lnr '));e.putUnitDouble(cid('Scl '),cid('#Prc'),100);e.putBoolean(cid('Rvrs'),false);e.putBoolean(cid('Algn'),true);
        var grad=new ActionDescriptor();grad.putString(cid('Nm  '),'Editable gradient');grad.putEnumerated(cid('GrdF'),cid('GrdF'),cid('CstS'));grad.putDouble(cid('Intr'),4096);
        var cs=new ActionList(),ts=new ActionList();
        for(var i=0;i<2;i++){
            var a=new ActionDescriptor();a.putObject(cid('Clr '),cid('RGBC'),rgb(i?gr.top:gr.bottom));a.putEnumerated(cid('Type'),cid('Clry'),cid('UsrS'));a.putInteger(cid('Lctn'),i*4096);a.putInteger(cid('Mdpn'),50);cs.putObject(cid('Clrt'),a);
            var t=new ActionDescriptor();t.putUnitDouble(cid('Opct'),cid('#Prc'),100);t.putInteger(cid('Lctn'),i*4096);t.putInteger(cid('Mdpn'),50);ts.putObject(cid('TrnS'),t);
        }
        grad.putList(cid('Clrs'),cs);grad.putList(cid('Trns'),ts);e.putObject(cid('Grad'),cid('Grdn'),grad);fx.putObject(cid('GrFl'),cid('GrFl'),e);cmd.putObject(cid('T   '),cid('Lefx'),fx);executeAction(cid('setd'),cmd,DialogModes.NO);
    }
    try {
        var m=readManifest();if(!m)return;
        var out=validate(m);app.preferences.rulerUnits=Units.PIXELS;
        d=app.documents.add(m.width,m.height,72,m.name,NewDocumentMode.RGB,DocumentFill.WHITE);
        for(var i=0;i<m.groups.length;i++){
            var g=group(m.groups[i].name),list=m.groups[i].layers;
            for(var j=0;j<list.length;j++){
                var item=list[j],layer;
                try {
                    if(item.type==='image') layer=imageLayer(g,item);
                    else if(item.type==='shape') layer=shapeLayer(g,item);
                    else layer=textLayer(g,item);
                    if(item.gradient && item.gradient.top && item.gradient.bottom) gradient(layer,item.gradient);
                } catch (e) { fail('Layer '+item.name+' ('+item.type+'): '+e.message); }
            }
        }
        var opt=new PhotoshopSaveOptions();opt.layers=true;
        d.saveAs(out,opt,false,Extension.LOWERCASE);
    } finally { app.preferences.rulerUnits=oldUnits; }
})();
