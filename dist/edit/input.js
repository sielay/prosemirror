"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Input = undefined;
exports.dispatchKey = dispatchKey;

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

var _model = require("../model");

var _format = require("../format");

var _dom = require("../dom");

var _capturekeys = require("./capturekeys");

var _domchange = require("./domchange");

var _selection = require("./selection");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var stopSeq = null;

// A collection of DOM events that occur within the editor, and callback functions
// to invoke when the event fires.
var handlers = {};

var Input = exports.Input = function () {
  function Input(pm) {
    var _this = this;

    _classCallCheck(this, Input);

    this.pm = pm;
    this.baseKeymap = null;

    this.keySeq = null;

    // When the user is creating a composed character,
    // this is set to a Composing instance.
    this.composing = null;
    this.shiftKey = this.updatingComposition = false;
    this.skipInput = 0;

    this.draggingFrom = false;

    this.keymaps = [];
    this.defaultKeymap = null;

    this.storedMarks = null;

    this.dropTarget = pm.wrapper.appendChild((0, _dom.elt)("div", { class: "ProseMirror-drop-target" }));

    var _loop = function _loop(event) {
      var handler = handlers[event];
      pm.content.addEventListener(event, function (e) {
        return handler(pm, e);
      });
    };

    for (var event in handlers) {
      _loop(event);
    }

    pm.on("selectionChange", function () {
      return _this.storedMarks = null;
    });
  }

  _createClass(Input, [{
    key: "maybeAbortComposition",
    value: function maybeAbortComposition() {
      if (this.composing && !this.updatingComposition) {
        if (this.composing.finished) {
          finishComposing(this.pm);
        } else {
          // Toggle selection to force end of composition
          this.composing = null;
          this.skipInput++;
          var sel = getSelection();
          if (sel.rangeCount) {
            var range = sel.getRangeAt(0);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        return true;
      }
    }
  }]);

  return Input;
}();

// Dispatch a key press to the internal keymaps, which will override the default
// DOM behavior.

function dispatchKey(pm, name, e) {
  var seq = pm.input.keySeq;
  // If the previous key should be used in sequence with this one, modify the name accordingly.
  if (seq) {
    if (_browserkeymap2.default.isModifierKey(name)) return true;
    clearTimeout(stopSeq);
    stopSeq = setTimeout(function () {
      if (pm.input.keySeq == seq) pm.input.keySeq = null;
    }, 50);
    name = seq + " " + name;
  }

  var handle = function handle(bound) {
    if (bound === false) return "nothing";
    if (bound == "...") return "multi";
    if (bound == null) return false;

    var result = false;
    if (Array.isArray(bound)) {
      for (var i = 0; result === false && i < bound.length; i++) {
        result = handle(bound[i]);
      }
    } else if (typeof bound == "string") {
      result = pm.execCommand(bound);
    } else {
      result = bound(pm);
    }
    return result == false ? false : "handled";
  };

  var result = undefined;
  for (var i = 0; !result && i < pm.input.keymaps.length; i++) {
    result = handle(pm.input.keymaps[i].map.lookup(name, pm));
  }if (!result) result = handle(pm.input.baseKeymap.lookup(name, pm)) || handle(_capturekeys.captureKeys.lookup(name));

  // If the key should be used in sequence with the next key, store the keyname internally.
  if (result == "multi") pm.input.keySeq = name;

  if (result == "handled" || result == "multi") e.preventDefault();

  if (seq && !result && /\'$/.test(name)) {
    e.preventDefault();
    return true;
  }
  return !!result;
}

handlers.keydown = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = true;
  if (pm.input.composing) return;
  var name = _browserkeymap2.default.keyName(e);
  if (name && dispatchKey(pm, name, e)) return;
  pm.sel.pollForUpdate();
};

handlers.keyup = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = false;
};

// : (ProseMirror, TextSelection, string)
// Insert text into a document.
function inputText(pm, range, text) {
  if (range.empty && !text) return false;
  var marks = pm.input.storedMarks || pm.doc.marksAt(range.from);
  pm.tr.replaceWith(range.from, range.to, pm.schema.text(text, marks)).apply({ scrollIntoView: true });
  // :: () #path=ProseMirror#events#textInput
  // Fired when the user types text into the editor.
  pm.signal("textInput", text);
}

handlers.keypress = function (pm, e) {
  if (pm.input.composing || !e.charCode || e.ctrlKey && !e.altKey || _dom.browser.mac && e.metaKey) return;
  if (dispatchKey(pm, _browserkeymap2.default.keyName(e))) return;
  var sel = pm.selection;
  if (sel.node && sel.node.contains == null) {
    pm.tr.delete(sel.from, sel.to).apply();
    sel = pm.selection;
  }
  inputText(pm, sel, String.fromCharCode(e.charCode));
  e.preventDefault();
};

function selectClickedNode(pm, e) {
  var pos = (0, _selection.selectableNodeAbove)(pm, e.target, { left: e.clientX, top: e.clientY }, true);
  if (!pos) return pm.sel.pollForUpdate();

  var _pm$selection = pm.selection;
  var node = _pm$selection.node;
  var from = _pm$selection.from;

  if (node && pos.depth >= from.depth && pos.shorten(from.depth).cmp(from) == 0) {
    if (from.depth == 0) return pm.sel.pollForUpdate();
    pos = from.shorten();
  }

  pm.setNodeSelection(pos);
  pm.focus();
  e.preventDefault();
}

var lastClick = 0,
    oneButLastClick = 0;

handlers.mousedown = function (pm, e) {
  pm.sel.pollForUpdate();

  var now = Date.now(),
      doubleClick = now - lastClick < 500,
      tripleClick = now - oneButLastClick < 600;
  oneButLastClick = lastClick;
  lastClick = now;
  if (tripleClick) {
    e.preventDefault();
    var pos = (0, _selection.selectableNodeAbove)(pm, e.target, { left: e.clientX, top: e.clientY }, true);
    if (pos) {
      var node = pm.doc.nodeAfter(pos);
      if (node.isBlock && !node.isTextblock) {
        pm.setNodeSelection(pos);
      } else {
        var path = node.isInline ? pos.path : pos.toPath();
        if (node.isInline) node = pm.doc.path(path);
        pm.setTextSelection(new _model.Pos(path, 0), new _model.Pos(path, node.size));
      }
      pm.focus();
    }
    return;
  }
  var leaveToBrowser = pm.input.shiftKey || doubleClick;

  var x = e.clientX,
      y = e.clientY;
  var up = function up() {
    removeEventListener("mouseup", up);
    removeEventListener("mousemove", move);

    if (leaveToBrowser) {
      pm.sel.pollForUpdate();
    } else if (e.ctrlKey) {
      selectClickedNode(pm, e);
    } else if (!(0, _selection.handleNodeClick)(pm, "handleClick", e, true)) {
      var pos = (0, _selection.selectableNodeAbove)(pm, e.target, { left: e.clientX, top: e.clientY });
      if (pos) {
        pm.setNodeSelection(pos);
        pm.focus();
      } else {
        pm.sel.pollForUpdate();
      }
    }
  };
  var move = function move(e) {
    if (!leaveToBrowser && (Math.abs(x - e.clientX) > 4 || Math.abs(y - e.clientY) > 4)) leaveToBrowser = true;
    pm.sel.pollForUpdate();
  };
  addEventListener("mouseup", up);
  addEventListener("mousemove", move);
};

handlers.touchdown = function (pm) {
  pm.sel.pollForUpdate();
};

handlers.contextmenu = function (pm, e) {
  (0, _selection.handleNodeClick)(pm, "handleContextMenu", e, false);
};

// A class to track state while creating a composed character.

var Composing = function Composing(pm, data) {
  _classCallCheck(this, Composing);

  this.finished = false;
  this.context = (0, _domchange.textContext)(data);
  this.data = data;
  this.endData = null;
  var range = pm.selection;
  if (data) {
    var path = range.head.path,
        line = pm.doc.path(path).textContent;
    var found = line.indexOf(data, range.head.offset - data.length);
    if (found > -1 && found <= range.head.offset + data.length) range = new _selection.TextSelection(new _model.Pos(path, found), new _model.Pos(path, found + data.length));
  }
  this.range = range;
};

handlers.compositionstart = function (pm, e) {
  if (pm.input.maybeAbortComposition()) return;

  pm.flush();
  pm.input.composing = new Composing(pm, e.data);
  var above = pm.selection.head.shorten();
  pm.markRangeDirty({ from: above, to: above.move(1) });
};

handlers.compositionupdate = function (pm, e) {
  var info = pm.input.composing;
  if (info && info.data != e.data) {
    info.data = e.data;
    pm.input.updatingComposition = true;
    inputText(pm, info.range, info.data);
    pm.input.updatingComposition = false;
    info.range = new _selection.TextSelection(info.range.from, info.range.from.move(info.data.length));
  }
};

handlers.compositionend = function (pm, e) {
  var info = pm.input.composing;
  if (info) {
    pm.input.composing.finished = true;
    pm.input.composing.endData = e.data;
    setTimeout(function () {
      if (pm.input.composing == info) finishComposing(pm);
    }, 20);
  }
};

function finishComposing(pm) {
  var info = pm.input.composing;
  var text = (0, _domchange.textInContext)(info.context, info.endData);
  var range = (0, _selection.rangeFromDOMLoose)(pm);
  pm.ensureOperation();
  pm.input.composing = null;
  if (text != info.data) inputText(pm, info.range, text);
  if (range && !range.eq(pm.sel.range)) pm.setSelectionDirect(range);
}

handlers.input = function (pm) {
  if (pm.input.skipInput) return --pm.input.skipInput;

  if (pm.input.composing) {
    if (pm.input.composing.finished) finishComposing(pm);
    return;
  }

  pm.sel.stopPollingForUpdate();
  (0, _domchange.applyDOMChange)(pm);
  pm.scrollIntoView();
};

var lastCopied = null;

function setCopied(doc, from, to, dataTransfer) {
  var fragment = doc.sliceBetween(from, to);
  lastCopied = { doc: doc, from: from, to: to,
    schema: doc.type.schema,
    html: (0, _format.toHTML)(fragment),
    text: (0, _format.toText)(fragment) };
  if (dataTransfer) {
    dataTransfer.clearData();
    dataTransfer.setData("text/html", lastCopied.html);
    dataTransfer.setData("text/plain", lastCopied.text);
  }
}

function getCopied(pm, dataTransfer, plainText) {
  var txt = dataTransfer.getData("text/plain");
  var html = dataTransfer.getData("text/html");
  if (!html && !txt) return null;
  var doc = undefined;
  if (plainText && txt) {
    doc = (0, _format.fromText)(pm.schema, pm.signalPipelined("transformPastedText", txt));
  } else if (lastCopied && lastCopied.html == html && lastCopied.schema == pm.schema) {
    return lastCopied;
  } else if (html) {
    doc = (0, _format.fromHTML)(pm.schema, pm.signalPipelined("transformPastedHTML", html));
  } else {
    doc = (0, _format.parseFrom)(pm.schema, pm.signalPipelined("transformPastedText", txt), (0, _format.knownSource)("markdown") ? "markdown" : "text");
  }
  return { doc: doc, from: (0, _selection.findSelectionAtStart)(doc).from, to: (0, _selection.findSelectionAtEnd)(doc).to };
}

handlers.copy = handlers.cut = function (pm, e) {
  var _pm$selection2 = pm.selection;
  var from = _pm$selection2.from;
  var to = _pm$selection2.to;
  var empty = _pm$selection2.empty;

  if (empty) return;
  setCopied(pm.doc, from, to, e.clipboardData);
  if (e.clipboardData) {
    e.preventDefault();
    if (e.type == "cut" && !empty) pm.tr.delete(from, to).apply();
  }
};

// :: (text: string) → string #path=ProseMirror#events#transformPastedText
// Fired when plain text is pasted. Handlers must return the given
// string or a [transformed](#EventMixin.signalPipelined) version of
// it.

// :: (html: string) → string #path=ProseMirror#events#transformPastedHTML
// Fired when html content is pasted. Handlers must return the given
// string or a [transformed](#EventMixin.signalPipelined) version of
// it.

handlers.paste = function (pm, e) {
  if (!e.clipboardData) return;
  var sel = pm.selection;
  var fragment = getCopied(pm, e.clipboardData, pm.input.shiftKey);
  if (fragment) {
    e.preventDefault();
    pm.tr.replace(sel.from, sel.to, fragment.doc, fragment.from, fragment.to).apply();
    pm.scrollIntoView();
  }
};

handlers.dragstart = function (pm, e) {
  if (!e.dataTransfer) return;

  var _pm$selection3 = pm.selection;
  var from = _pm$selection3.from;
  var to = _pm$selection3.to;
  var empty = _pm$selection3.empty;var fragment = undefined;
  var pos = !empty && pm.posAtCoords({ left: e.clientX, top: e.clientY });
  if (pos && pos.cmp(from) >= 0 && pos.cmp(to) <= 0) {
    fragment = { from: from, to: to };
  } else {
    var _pos = (0, _selection.posFromDOM)(pm, e.target);
    var node = pm.doc.nodeAfter(_pos);
    if (node && node.type.draggable) fragment = { from: _pos, to: _pos.move(1) };
  }

  if (fragment) {
    pm.input.draggingFrom = fragment;
    setCopied(pm.doc, fragment.from, fragment.to, e.dataTransfer);
  }
};

handlers.dragend = function (pm) {
  return window.setTimeout(function () {
    return pm.input.draggingFrom = false;
  }, 50);
};

handlers.dragover = handlers.dragenter = function (pm, e) {
  e.preventDefault();
  var cursorPos = pm.posAtCoords({ left: e.clientX, top: e.clientY });
  if (!cursorPos) return;
  var coords = (0, _selection.coordsAtPos)(pm, cursorPos);
  var rect = pm.wrapper.getBoundingClientRect();
  coords.top -= rect.top;
  coords.right -= rect.left;
  coords.bottom -= rect.top;
  coords.left -= rect.left;
  var target = pm.input.dropTarget;
  target.style.display = "block";
  target.style.left = coords.left - 1 + "px";
  target.style.top = coords.top + "px";
  target.style.height = coords.bottom - coords.top + "px";
};

handlers.dragleave = function (pm) {
  return pm.input.dropTarget.style.display = "";
};

handlers.drop = function (pm, e) {
  pm.input.dropTarget.style.display = "";

  if (!e.dataTransfer) return;

  var fragment = getCopied(pm, e.dataTransfer);
  if (fragment) {
    e.preventDefault();
    var insertPos = pm.posAtCoords({ left: e.clientX, top: e.clientY }),
        origPos = insertPos;
    if (!insertPos) return;
    var tr = pm.tr;
    if (pm.input.draggingFrom && !e.ctrlKey) {
      tr.delete(pm.input.draggingFrom.from, pm.input.draggingFrom.to);
      insertPos = tr.map(insertPos).pos;
    }
    tr.replace(insertPos, insertPos, fragment.doc, fragment.from, fragment.to).apply();
    var posAfter = tr.map(origPos).pos;
    if (_model.Pos.samePath(insertPos.path, posAfter.path) && posAfter.offset == insertPos.offset + 1 && pm.doc.nodeAfter(insertPos).type.selectable) pm.setNodeSelection(insertPos);else pm.setTextSelection(insertPos, posAfter);
    pm.focus();
  }
};

handlers.focus = function (pm) {
  (0, _dom.addClass)(pm.wrapper, "ProseMirror-focused");
  // :: () #path=ProseMirror#events#focus
  // Fired when the editor gains focus.
  pm.signal("focus");
};

handlers.blur = function (pm) {
  (0, _dom.rmClass)(pm.wrapper, "ProseMirror-focused");
  // :: () #path=ProseMirror#events#blur
  // Fired when the editor loses focus.
  pm.signal("blur");
};