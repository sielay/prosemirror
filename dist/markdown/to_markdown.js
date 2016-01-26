"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toMarkdown = toMarkdown;

var _model = require("../model");

var _format = require("../format");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// :: (Node) → string
// Serialize the content of the given node to [CommonMark](http://commonmark.org/).
//
// To define serialization behavior for your own [node
// types](#NodeType), give them a `serializeMarkDown` method. It will
// be called with a `MarkdownSerializer` and a `Node`, and should
// update the serializer's state to add the content of the node.
//
// [Mark types](#MarkType) can define `openMarkdown` and
// `closeMarkdown` properties, which provide the markup text that
// marked content should be wrapped in. They may hold either a string
// or a function from a `MarkdownSerializer` and a `Mark` to a string.
function toMarkdown(doc) {
  var state = new MarkdownSerializer();
  state.renderContent(doc);
  return state.out;
}

(0, _format.defineTarget)("markdown", toMarkdown);

// ;; This is an object used to track state and expose
// methods related to markdown serialization. Instances are passed to
// node and mark serialization methods (see `toMarkdown`).

var MarkdownSerializer = function () {
  function MarkdownSerializer() {
    _classCallCheck(this, MarkdownSerializer);

    this.delim = this.out = "";
    this.closed = false;
    this.inTightList = false;
  }

  _createClass(MarkdownSerializer, [{
    key: "flushClose",
    value: function flushClose(size) {
      if (this.closed) {
        if (!this.atBlank()) this.out += "\n";
        if (size == null) size = 2;
        if (size > 1) {
          var delimMin = this.delim;
          var trim = /\s+$/.exec(delimMin);
          if (trim) delimMin = delimMin.slice(0, delimMin.length - trim[0].length);
          for (var i = 1; i < size; i++) {
            this.out += delimMin + "\n";
          }
        }
        this.closed = false;
      }
    }

    // :: (string, ?string, Node, ())
    // Render a block, prefixing each line with `delim`, and the first
    // line in `firstDelim`. `node` should be the node that is closed at
    // the end of the block, and `f` is a function that renders the
    // content of the block.

  }, {
    key: "wrapBlock",
    value: function wrapBlock(delim, firstDelim, node, f) {
      var old = this.delim;
      this.write(firstDelim || delim);
      this.delim += delim;
      f();
      this.delim = old;
      this.closeBlock(node);
    }
  }, {
    key: "atBlank",
    value: function atBlank() {
      return (/(^|\n)$/.test(this.out)
      );
    }

    // :: ()
    // Ensure the current content ends with a newline.

  }, {
    key: "ensureNewLine",
    value: function ensureNewLine() {
      if (!this.atBlank()) this.out += "\n";
    }

    // :: (?string)
    // Prepare the state for writing output (closing closed paragraphs,
    // adding delimiters, and so on), and then optionally add content
    // (unescaped) to the output.

  }, {
    key: "write",
    value: function write(content) {
      this.flushClose();
      if (this.delim && this.atBlank()) this.out += this.delim;
      if (content) this.out += content;
    }

    // :: (Node)
    // Close the block for the given node.

  }, {
    key: "closeBlock",
    value: function closeBlock(node) {
      this.closed = node;
    }

    // :: (string, ?bool)
    // Add the given text to the document. When escape is not `false`,
    // it will be escaped.

  }, {
    key: "text",
    value: function text(_text, escape) {
      var lines = _text.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var startOfLine = this.atBlank() || this.closed;
        this.write();
        this.out += escape !== false ? this.esc(lines[i], startOfLine) : lines[i];
        if (i != lines.length - 1) this.out += "\n";
      }
    }

    // :: (Node)
    // Render the given node as a block.

  }, {
    key: "render",
    value: function render(node) {
      node.type.serializeMarkdown(this, node);
    }

    // :: (Node)
    // Render the contents of `parent` as block nodes.

  }, {
    key: "renderContent",
    value: function renderContent(parent) {
      var _this = this;

      parent.forEach(function (child) {
        return _this.render(child);
      });
    }

    // :: (Node)
    // Render the contents of `parent` as inline content.

  }, {
    key: "renderInline",
    value: function renderInline(parent) {
      var _this2 = this;

      var stack = [];
      var progress = function progress(node) {
        var marks = node ? node.marks.slice() : [];
        if (stack.length && stack[stack.length - 1].type == "code" && (!marks.length || marks[marks.length - 1].type != "code")) {
          _this2.text("`", false);
          stack.pop();
        }
        for (var j = 0; j < stack.length; j++) {
          var cur = stack[j],
              found = false;
          for (var k = 0; k < marks.length; k++) {
            if (marks[k].eq(stack[j])) {
              marks.splice(k, 1);
              found = true;
              break;
            }
          }
          if (!found) {
            _this2.text(_this2.markString(cur, false), false);
            stack.splice(j--, 1);
          }
        }
        for (var j = 0; j < marks.length; j++) {
          var cur = marks[j];
          stack.push(cur);
          _this2.text(_this2.markString(cur, true), false);
        }
        if (node) _this2.render(node);
      };
      parent.forEach(progress);
      progress(null);
    }
  }, {
    key: "renderList",
    value: function renderList(node, delim, firstDelim) {
      var _this3 = this;

      if (this.closed && this.closed.type == node.type) this.flushClose(3);else if (this.inTightList) this.flushClose(1);

      var prevTight = this.inTightList;
      this.inTightList = node.attrs.tight;

      var _loop = function _loop(i, n, item) {
        if (n && node.attrs.tight) _this3.flushClose(1);
        _this3.wrapBlock(delim, firstDelim(n), node, function () {
          return _this3.render(item);
        });
      };

      for (var i = node.iter(), n = 0, item; item = i.next().value; n++) {
        _loop(i, n, item);
      }
      this.inTightList = prevTight;
    }

    // :: (string, ?bool) → string
    // Escape the given string so that it can safely appear in Markdown
    // content. If `startOfLine` is true, also escape characters that
    // has special meaning only at the start of the line.

  }, {
    key: "esc",
    value: function esc(str, startOfLine) {
      str = str.replace(/[`*\\~+\[\]]/g, "\\$&");
      if (startOfLine) str = str.replace(/^[:#-]/, "\\$&");
      return str;
    }
  }, {
    key: "quote",
    value: function quote(str) {
      var wrap = str.indexOf('"') == -1 ? '""' : str.indexOf("'") == -1 ? "''" : "()";
      return wrap[0] + str + wrap[1];
    }

    // :: (string, number) → string
    // Repeat the given string `n` times.

  }, {
    key: "repeat",
    value: function repeat(str, n) {
      var out = "";
      for (var i = 0; i < n; i++) {
        out += str;
      }return out;
    }
  }, {
    key: "markString",
    value: function markString(mark, open) {
      var value = open ? mark.type.openMarkdown : mark.type.closeMarkdown;
      return typeof value == "string" ? value : value(this, mark);
    }
  }]);

  return MarkdownSerializer;
}();

function def(cls, method) {
  cls.prototype.serializeMarkdown = method;
}

def(_model.BlockQuote, function (state, node) {
  state.wrapBlock("> ", null, node, function () {
    return state.renderContent(node);
  });
});

def(_model.CodeBlock, function (state, node) {
  if (node.attrs.params == null) {
    state.wrapBlock("    ", null, node, function () {
      return state.text(node.textContent, false);
    });
  } else {
    state.write("```" + node.attrs.params + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  }
});

def(_model.Heading, function (state, node) {
  state.write(state.repeat("#", node.attrs.level) + " ");
  state.renderInline(node);
  state.closeBlock(node);
});

def(_model.HorizontalRule, function (state, node) {
  state.write(node.attrs.markup || "---");
  state.closeBlock(node);
});

def(_model.BulletList, function (state, node) {
  state.renderList(node, "  ", function () {
    return (node.attrs.bullet || "*") + " ";
  });
});

def(_model.OrderedList, function (state, node) {
  var start = Number(node.attrs.order || 1);
  var maxW = String(start + node.size - 1).length;
  var space = state.repeat(" ", maxW + 2);
  state.renderList(node, space, function (i) {
    var nStr = String(start + i);
    return state.repeat(" ", maxW - nStr.length) + nStr + ". ";
  });
});

def(_model.ListItem, function (state, node) {
  return state.renderContent(node);
});

def(_model.Paragraph, function (state, node) {
  state.renderInline(node);
  state.closeBlock(node);
});

// Inline nodes

def(_model.Image, function (state, node) {
  state.write("![" + state.esc(node.attrs.alt || "") + "](" + state.esc(node.attrs.src) + (node.attrs.title ? " " + state.quote(node.attrs.title) : "") + ")");
});

def(_model.HardBreak, function (state) {
  return state.write("\\\n");
});

def(_model.Text, function (state, node) {
  return state.text(node.text);
});

// Marks

function defMark(mark, open, close) {
  mark.prototype.openMarkdown = open;
  mark.prototype.closeMarkdown = close;
}

defMark(_model.EmMark, "*", "*");

defMark(_model.StrongMark, "**", "**");

defMark(_model.LinkMark, "[", function (state, mark) {
  return "](" + state.esc(mark.attrs.href) + (mark.attrs.title ? " " + state.quote(mark.attrs.title) : "") + ")";
});

defMark(_model.CodeMark, "`", "`");