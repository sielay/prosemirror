"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toText = toText;

var _model = require("../model");

var _register = require("./register");

_model.Block.prototype.serializeText = function (node) {
  var accum = "";
  node.forEach(function (child) {
    return accum += child.type.serializeText(child);
  });
  return accum;
};

_model.Textblock.prototype.serializeText = function (node) {
  var text = _model.Block.prototype.serializeText(node);
  return text && text + "\n\n";
};

_model.Inline.prototype.serializeText = function () {
  return "";
};

_model.HardBreak.prototype.serializeText = function () {
  return "\n";
};

_model.Text.prototype.serializeText = function (node) {
  return node.text;
};

// :: (Node) → string
// Serialize a node as a plain text string.
function toText(doc) {
  return doc.type.serializeText(doc).trim();
}

(0, _register.defineTarget)("text", toText);