"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromDOM = fromDOM;
exports.fromHTML = fromHTML;

var _model = require("../model");

var _sortedinsert = require("../util/sortedinsert");

var _sortedinsert2 = _interopRequireDefault(_sortedinsert);

var _register = require("./register");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// :: (Schema, DOMNode, ?Object) → Node
// Parse document from the content of a DOM node. To pass an explicit
// parent document (for example, when not in a browser window
// environment, where we simply use the global document), pass it as
// the `document` property of `options`.
function fromDOM(schema, dom, options) {
  if (!options) options = {};
  var context = new DOMParseState(schema, options.topNode || schema.node("doc"), options);
  var start = options.from ? dom.childNodes[options.from] : dom.firstChild;
  var end = options.to != null && dom.childNodes[options.to] || null;
  context.addAll(start, end, true);
  var doc = undefined;
  while (context.stack.length) {
    doc = context.leave();
  }return doc;
}

// ;; #path=DOMParseSpec #kind=interface
// To define the way [node](#NodeType) and [mark](#MarkType) types are
// parsed, you can associate one or more DOM parsing specifications to
// them using the [`register`](#SchemaItem.register) method with the
// `"parseDOM"` namespace, using the HTML node name (lowercase) as
// value name. Each of them defines a parsing strategy for a certain
// type of DOM node. When `"_"` is used as name, the parser is
// activated for all nodes.

// :: ?number #path=DOMParseSpec.rank
// The precedence of this parsing strategy. Should be a number between
// 0 and 100, which determines when this parser gets a chance relative
// to others that apply to the node (low ranks go first). Defaults to
// 50.

// :: union<string, (dom: DOMNode, state: DOMParseState) → ?bool> #path=DOMParseSpec.parse
// The function that, given a DOM node, parses it, updating the parse
// state. It should return (the exact value) `false` when it wants to
// indicate that it was not able to parse this node. This function is
// called in such a way that `this` is bound to the type that the
// parse spec was associated with.
//
// When this is set to the string `"block"`, the content of the DOM
// node is parsed as the content in a node of the type that this spec
// was associated with.
//
// When set to the string `"mark"`, the content of the DOM node is
// parsed with an instance of the mark that this spec was associated
// with added to their marks.

(0, _register.defineSource)("dom", fromDOM);

// :: (Schema, string, ?Object) → Node
// Parses the HTML into a DOM, and then calls through to `fromDOM`.
function fromHTML(schema, html, options) {
  var wrap = (options && options.document || window.document).createElement("div");
  wrap.innerHTML = html;
  return fromDOM(schema, wrap, options);
}

(0, _register.defineSource)("html", fromHTML);

var blockElements = {
  address: true, article: true, aside: true, blockquote: true, canvas: true,
  dd: true, div: true, dl: true, fieldset: true, figcaption: true, figure: true,
  footer: true, form: true, h1: true, h2: true, h3: true, h4: true, h5: true,
  h6: true, header: true, hgroup: true, hr: true, li: true, noscript: true, ol: true,
  output: true, p: true, pre: true, section: true, table: true, tfoot: true, ul: true
};

var ignoreElements = {
  head: true, noscript: true, object: true, script: true, style: true, title: true
};

var noMarks = [];

// ;; A state object used to track context during a parse,
// and to expose methods to custom parsing functions.

var DOMParseState = function () {
  function DOMParseState(schema, topNode, options) {
    _classCallCheck(this, DOMParseState);

    // :: Object The options passed to this parse.
    this.options = options || {};
    // :: Schema The schema that we are parsing into.
    this.schema = schema;
    this.stack = [];
    this.marks = noMarks;
    this.closing = false;
    this.enter(topNode.type, topNode.attrs);
    var info = schemaInfo(schema);
    this.tagInfo = info.tags;
    this.styleInfo = info.styles;
  }

  _createClass(DOMParseState, [{
    key: "addDOM",
    value: function addDOM(dom) {
      if (dom.nodeType == 3) {
        var value = dom.nodeValue;
        var top = this.top,
            last = undefined;
        if (/\S/.test(value) || top.type.isTextblock) {
          value = value.replace(/\s+/g, " ");
          // If this starts with whitespace, and there is either no node
          // before it or a node that ends with whitespace, strip the
          // leading space.
          if (/^\s/.test(value) && (!(last = top.content[top.content.length - 1]) || last.type.name == "text" && /\s$/.test(last.text))) value = value.slice(1);
          if (value) this.insertNode(this.schema.text(value, this.marks));
        }
      } else if (dom.nodeType != 1 || dom.hasAttribute("pm-ignore")) {
        // Ignore non-text non-element nodes
      } else {
          var style = dom.getAttribute("style");
          if (style) this.addElementWithStyles(parseStyles(style), dom);else this.addElement(dom);
        }
    }
  }, {
    key: "addElement",
    value: function addElement(dom) {
      var name = dom.nodeName.toLowerCase();
      if (!this.parseNodeType(name, dom) && !ignoreElements.hasOwnProperty(name)) {
        this.addAll(dom.firstChild, null);
        if (blockElements.hasOwnProperty(name) && this.top.type == this.schema.defaultTextblockType()) this.closing = true;
      }
    }
  }, {
    key: "addElementWithStyles",
    value: function addElementWithStyles(styles, dom) {
      var _this = this;

      var wrappers = [];
      for (var i = 0; i < styles.length; i += 2) {
        var parsers = this.styleInfo[styles[i]],
            value = styles[i + 1];
        if (parsers) for (var j = 0; j < parsers.length; j++) {
          wrappers.push(parsers[j], value);
        }
      }
      var next = function next(i) {
        if (i == wrappers.length) {
          _this.addElement(dom);
        } else {
          var parser = wrappers[i];
          parser.parse.call(parser.type, wrappers[i + 1], _this, next.bind(null, i + 2));
        }
      };
      next(0);
    }
  }, {
    key: "tryParsers",
    value: function tryParsers(parsers, dom) {
      if (parsers) for (var i = 0; i < parsers.length; i++) {
        var parser = parsers[i];
        if (parser.parse.call(parser.type, dom, this) !== false) return true;
      }
    }
  }, {
    key: "parseNodeType",
    value: function parseNodeType(name, dom) {
      return this.tryParsers(this.tagInfo[name], dom) || this.tryParsers(this.tagInfo._, dom);
    }
  }, {
    key: "addAll",
    value: function addAll(from, to, sync) {
      var stack = sync && this.stack.slice();
      for (var dom = from; dom != to; dom = dom.nextSibling) {
        this.addDOM(dom);
        if (sync && blockElements.hasOwnProperty(dom.nodeName.toLowerCase())) this.sync(stack);
      }
    }
  }, {
    key: "doClose",
    value: function doClose() {
      if (!this.closing || this.stack.length < 2) return;
      var left = this.leave();
      this.enter(left.type, left.attrs);
      this.closing = false;
    }
  }, {
    key: "insertNode",
    value: function insertNode(node) {
      if (this.top.type.canContain(node)) {
        this.doClose();
      } else {
        for (var i = this.stack.length - 1; i >= 0; i--) {
          var route = this.stack[i].type.findConnection(node.type);
          if (!route) continue;
          if (i == this.stack.length - 1) {
            this.doClose();
          } else {
            while (this.stack.length > i + 1) {
              this.leave();
            }
          }
          for (var j = 0; j < route.length; j++) {
            this.enter(route[j]);
          }if (this.marks.length) this.marks = noMarks;
          break;
        }
      }
      this.top.content.push(node);
      return node;
    }

    // :: (DOMNode, NodeType, ?Object, [Node]) → Node
    // Insert a node of the given type, with the given content, based on
    // `dom`, at the current position in the document.

  }, {
    key: "insert",
    value: function insert(type, attrs, content) {
      return this.insertNode(type.createAutoFill(attrs, content, this.marks));
    }
  }, {
    key: "enter",
    value: function enter(type, attrs) {
      this.stack.push({ type: type, attrs: attrs, content: [] });
    }
  }, {
    key: "leave",
    value: function leave() {
      if (this.marks.length) this.marks = noMarks;
      var top = this.stack.pop();
      var last = top.content[top.content.length - 1];
      if (last && last.isText && /\s$/.test(last.text)) top.content[top.content.length - 1] = last.copy(last.text.slice(0, last.text.length - 1));
      var node = top.type.createAutoFill(top.attrs, top.content);
      if (this.stack.length) this.insertNode(node);
      return node;
    }
  }, {
    key: "sync",
    value: function sync(stack) {
      while (this.stack.length > stack.length) {
        this.leave();
      }for (;;) {
        var n = this.stack.length - 1,
            one = this.stack[n],
            two = stack[n];
        if (one.type == two.type && _model.Node.sameAttrs(one.attrs, two.attrs)) break;
        this.leave();
      }
      while (stack.length > this.stack.length) {
        var add = stack[this.stack.length];
        this.enter(add.type, add.attrs);
      }
      if (this.marks.length) this.marks = noMarks;
      this.closing = false;
    }

    // :: (DOMNode, NodeType, ?Object)
    // Parse the contents of `dom` as children of a node of the given
    // type.

  }, {
    key: "wrapIn",
    value: function wrapIn(dom, type, attrs) {
      this.enter(type, attrs);
      this.addAll(dom.firstChild, null, true);
      this.leave();
    }

    // :: (DOMNode, Mark)
    // Parse the contents of `dom`, with `mark` added to the set of
    // current marks.

  }, {
    key: "wrapMark",
    value: function wrapMark(inner, mark) {
      var old = this.marks;
      this.marks = (mark.instance || mark).addToSet(old);
      if (inner.call) inner();else this.addAll(inner.firstChild, null);
      this.marks = old;
    }
  }, {
    key: "top",
    get: function get() {
      return this.stack[this.stack.length - 1];
    }
  }]);

  return DOMParseState;
}();

function parseStyles(style) {
  var re = /\s*([\w-]+)\s*:\s*([^;]+)/g,
      m = undefined,
      result = [];
  while (m = re.exec(style)) {
    result.push(m[1], m[2].trim());
  }return result;
}

function schemaInfo(schema) {
  return schema.cached.parseDOMInfo || (schema.cached.parseDOMInfo = summarizeSchemaInfo(schema));
}

function summarizeSchemaInfo(schema) {
  var tags = Object.create(null),
      styles = Object.create(null);
  tags._ = [];
  schema.registry("parseDOM", function (tag, info, type) {
    var parse = info.parse;
    if (parse == "block") parse = function parse(dom, state) {
      state.wrapIn(dom, this);
    };else if (parse == "mark") parse = function parse(dom, state) {
      state.wrapMark(dom, this);
    };
    (0, _sortedinsert2.default)(tags[tag] || (tags[tag] = []), {
      type: type, parse: parse,
      rank: info.rank == null ? 50 : info.rank
    }, function (a, b) {
      return a.rank - b.rank;
    });
  });
  schema.registry("parseDOMStyle", function (style, info, type) {
    (0, _sortedinsert2.default)(styles[style] || (styles[style] = []), {
      type: type,
      parse: info.parse,
      rank: info.rank == null ? 50 : info.rank
    }, function (a, b) {
      return a.rank - b.rank;
    });
  });
  return { tags: tags, styles: styles };
}

_model.Paragraph.register("parseDOM", "p", { parse: "block" });

_model.BlockQuote.register("parseDOM", "blockquote", { parse: "block" });

var _loop = function _loop(i) {
  _model.Heading.registerComputed("parseDOM", "h" + i, function (type) {
    if (i <= type.maxLevel) return {
      parse: function parse(dom, state) {
        state.wrapIn(dom, this, { level: i });
      }
    };
  });
};

for (var i = 1; i <= 6; i++) {
  _loop(i);
}_model.HorizontalRule.register("parseDOM", "hr", { parse: "block" });

_model.CodeBlock.register("parseDOM", "pre", { parse: function parse(dom, state) {
    var params = dom.firstChild && /^code$/i.test(dom.firstChild.nodeName) && dom.firstChild.getAttribute("class");
    if (params && /fence/.test(params)) {
      var found = [],
          re = /(?:^|\s)lang-(\S+)/g,
          m = undefined;
      while (m = re.test(params)) {
        found.push(m[1]);
      }params = found.join(" ");
    } else {
      params = null;
    }
    var text = dom.textContent;
    state.insert(this, { params: params }, text ? [state.schema.text(text)] : []);
  } });

_model.BulletList.register("parseDOM", "ul", { parse: "block" });

_model.OrderedList.register("parseDOM", "ol", { parse: function parse(dom, state) {
    var attrs = { order: dom.getAttribute("start") || 1 };
    state.wrapIn(dom, this, attrs);
  } });

_model.ListItem.register("parseDOM", "li", { parse: "block" });

_model.HardBreak.register("parseDOM", "br", { parse: function parse(_, state) {
    state.insert(this);
  } });

_model.Image.register("parseDOM", "img", { parse: function parse(dom, state) {
    state.insert(this, {
      src: dom.getAttribute("src"),
      title: dom.getAttribute("title") || null,
      alt: dom.getAttribute("alt") || null
    });
  } });

// Inline style tokens

_model.LinkMark.register("parseDOM", "a", { parse: function parse(dom, state) {
    var href = dom.getAttribute("href");
    if (!href) return false;
    state.wrapMark(dom, this.create({ href: href, title: dom.getAttribute("title") }));
  } });

_model.EmMark.register("parseDOM", "i", { parse: "mark" });
_model.EmMark.register("parseDOM", "em", { parse: "mark" });
_model.StrongMark.register("parseDOMStyle", "font-style", { parse: function parse(value, state, inner) {
    if (value == "italic") state.wrapMark(inner, this);else inner();
  } });

_model.StrongMark.register("parseDOM", "b", { parse: "mark" });
_model.StrongMark.register("parseDOM", "strong", { parse: "mark" });
_model.StrongMark.register("parseDOMStyle", "font-weight", { parse: function parse(value, state, inner) {
    if (value == "bold" || value == "bolder" || !/\D/.test(value) && +value >= 500) state.wrapMark(inner, this);else inner();
  } });

_model.CodeMark.register("parseDOM", "code", { parse: "mark" });