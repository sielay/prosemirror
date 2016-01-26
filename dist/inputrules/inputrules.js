"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InputRule = undefined;
exports.addInputRule = addInputRule;
exports.removeInputRule = removeInputRule;

var _model = require("../model");

var _edit = require("../edit");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// :: (ProseMirror, InputRule)
// Add the given [input rule](#InputRule) to an editor. From now on,
// whenever the rule's pattern is typed, its handler is activated.
//
// Note that the effect of an input rule can be canceled by pressing
// Backspace right after it happens.
function addInputRule(pm, rule) {
  if (!pm.mod.interpretInput) pm.mod.interpretInput = new InputRules(pm);
  pm.mod.interpretInput.addRule(rule);
}

// :: (ProseMirror, InputRule)
// Remove the given rule (added earlier with `addInputRule`) from the
// editor.
function removeInputRule(pm, rule) {
  var ii = pm.mod.interpretInput;
  if (!ii) return;
  ii.removeRule(rule);
  if (ii.rules.length == 0) {
    ii.unregister();
    pm.mod.interpretInput = null;
  }
}

// ;; Input rules are regular expressions describing a piece of text
// that, when typed, causes something to happen. This might be
// changing two dashes into an emdash, wrapping a paragraph starting
// with `"> "` into a blockquote, or something entirely different.

var InputRule =
// :: (RegExp, ?string, union<string, (ProseMirror, [string], Pos)>)
// Create an input rule. The rule applies when the user typed
// something and the text directly in front of the cursor matches
// `match`, which should probably end with `$`. You can optionally
// provide a filter, which should be a single character that always
// appears at the end of the match, and will be used to only apply
// the rule when there's an actual chance of it succeeding.
//
// The `handler` can be a string, in which case the matched text
// will simply be replaced by that string, or a function, which will
// be called with the match array produced by
// [`RegExp.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec),
// and should produce the effect of the rule.
exports.InputRule = function InputRule(match, filter, handler) {
  _classCallCheck(this, InputRule);

  this.filter = filter;
  this.match = match;
  this.handler = handler;
};

var InputRules = function () {
  function InputRules(pm) {
    var _this = this;

    _classCallCheck(this, InputRules);

    this.pm = pm;
    this.rules = [];
    this.cancelVersion = null;

    pm.on("selectionChange", this.onSelChange = function () {
      return _this.cancelVersion = null;
    });
    pm.on("textInput", this.onTextInput = this.onTextInput.bind(this));
    pm.addKeymap(new _edit.Keymap({ Backspace: function Backspace(pm) {
        return _this.backspace(pm);
      } }, { name: "inputRules" }), 20);
  }

  _createClass(InputRules, [{
    key: "unregister",
    value: function unregister() {
      this.pm.off("selectionChange", this.onSelChange);
      this.pm.off("textInput", this.onTextInput);
      this.pm.removeKeymap("inputRules");
    }
  }, {
    key: "addRule",
    value: function addRule(rule) {
      this.rules.push(rule);
    }
  }, {
    key: "removeRule",
    value: function removeRule(rule) {
      var found = this.rules.indexOf(rule);
      if (found > -1) {
        this.rules.splice(found, 1);
        return true;
      }
    }
  }, {
    key: "onTextInput",
    value: function onTextInput(text) {
      var pos = this.pm.selection.head;
      if (!pos) return;

      var textBefore = undefined,
          isCode = undefined;
      var lastCh = text[text.length - 1];

      for (var i = 0; i < this.rules.length; i++) {
        var rule = this.rules[i],
            match = undefined;
        if (rule.filter && rule.filter != lastCh) continue;
        if (textBefore == null) {
          ;
          var _getContext = getContext(this.pm.doc, pos);

          textBefore = _getContext.textBefore;
          isCode = _getContext.isCode;

          if (isCode) return;
        }
        if (match = rule.match.exec(textBefore)) {
          var startVersion = this.pm.history.getVersion();
          if (typeof rule.handler == "string") {
            var offset = pos.offset - (match[1] || match[0]).length;
            var start = new _model.Pos(pos.path, offset);
            var marks = this.pm.doc.marksAt(pos);
            this.pm.tr.delete(start, pos).insert(start, this.pm.schema.text(rule.handler, marks)).apply();
          } else {
            rule.handler(this.pm, match, pos);
          }
          this.cancelVersion = startVersion;
          return;
        }
      }
    }
  }, {
    key: "backspace",
    value: function backspace() {
      if (this.cancelVersion) {
        this.pm.history.backToVersion(this.cancelVersion);
        this.cancelVersion = null;
      } else {
        return false;
      }
    }
  }]);

  return InputRules;
}();

function getContext(doc, pos) {
  var parent = doc.path(pos.path);
  var isCode = parent.type.isCode;
  var textBefore = "";
  for (var i = parent.iter(0, pos.offset), child; child = i.next().value;) {
    if (child.isText) textBefore += child.text;else textBefore = "";
    if (i.atEnd() && child.marks.some(function (st) {
      return st.type.isCode;
    })) isCode = true;
  }
  return { textBefore: textBefore, isCode: isCode };
}