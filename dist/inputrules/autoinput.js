"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.autoInputRules = undefined;

var _model = require("../model");

var _edit = require("../edit");

var _inputrules = require("./inputrules");

// :: Object<InputRule>
// Base set of input rules, enabled by default when `autoInput` is set
// to `true`.
var autoInputRules = exports.autoInputRules = Object.create(null);

// :: union<bool, [union<string, Object<?InputRule>>]> #path=autoInput #kind=option
// Controls the [input rules](#InputRule) initially active in the
// editor. Pass an array of sources, which can be either the string
// `"schema"`, to add rules [registered](#SchemaItem.register) on the
// schema items (under the namespace `"autoInput"`), or an object
// containing input rules. To remove previously included rules, you
// can add an object that maps their name to `null`.
//
// The value `false` (the default) is a shorthand for no input rules,
// and the value `true` for `["schema", autoInputRules]`.
(0, _edit.defineOption)("autoInput", false, function (pm, val) {
  if (pm.mod.autoInput) {
    pm.mod.autoInput.forEach(function (rule) {
      return (0, _inputrules.removeInputRule)(pm, rule);
    });
    pm.mod.autoInput = null;
  }
  if (val) {
    (function () {
      if (val === true) val = ["schema", autoInputRules];
      var rules = Object.create(null),
          list = pm.mod.autoInput = [];
      val.forEach(function (spec) {
        if (spec === "schema") {
          pm.schema.registry("autoInput", function (name, rule, type, typeName) {
            var rname = typeName + ":" + name,
                handler = rule.handler;
            if (handler.bind) handler = handler.bind(type);
            rules[rname] = new _inputrules.InputRule(rule.match, rule.filter, handler);
          });
        } else {
          for (var name in spec) {
            var _val = spec[name];
            if (_val == null) delete rules[name];else rules[name] = _val;
          }
        }
      });
      for (var name in rules) {
        (0, _inputrules.addInputRule)(pm, rules[name]);
        list.push(rules[name]);
      }
    })();
  }
});

autoInputRules.emDash = new _inputrules.InputRule(/--$/, "-", "—");

autoInputRules.openDoubleQuote = new _inputrules.InputRule(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, '"', "“");

autoInputRules.closeDoubleQuote = new _inputrules.InputRule(/"$/, '"', "”");

autoInputRules.openSingleQuote = new _inputrules.InputRule(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "'", "‘");

autoInputRules.closeSingleQuote = new _inputrules.InputRule(/'$/, "'", "’");

_model.BlockQuote.register("autoInput", "startBlockQuote", new _inputrules.InputRule(/^\s*> $/, " ", function (pm, _, pos) {
  wrapAndJoin(pm, pos, this);
}));

_model.OrderedList.register("autoInput", "startOrderedList", new _inputrules.InputRule(/^(\d+)\. $/, " ", function (pm, match, pos) {
  var order = +match[1];
  wrapAndJoin(pm, pos, this, { order: order || null }, function (node) {
    return node.size + (node.attrs.order || 1) == order;
  });
}));

_model.BulletList.register("autoInput", "startBulletList", new _inputrules.InputRule(/^\s*([-+*]) $/, " ", function (pm, match, pos) {
  var bullet = match[1];
  wrapAndJoin(pm, pos, this, null, function (node) {
    return node.attrs.bullet == bullet;
  });
}));

_model.CodeBlock.register("autoInput", "startCodeBlock", new _inputrules.InputRule(/^```$/, "`", function (pm, _, pos) {
  setAs(pm, pos, this, { params: "" });
}));

_model.Heading.registerComputed("autoInput", "startHeading", function (type) {
  var re = new RegExp("^(#{1," + type.maxLevel + "}) $");
  return new _inputrules.InputRule(re, " ", function (pm, match, pos) {
    setAs(pm, pos, this, { level: match[1].length });
  });
});

function wrapAndJoin(pm, pos, type) {
  var attrs = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];
  var predicate = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

  var before = pos.shorten();
  var sibling = before.offset > 0 && pm.doc.path(before.path).child(before.offset - 1);
  var join = sibling && sibling.type.name == type && (!predicate || predicate(sibling));
  var tr = pm.tr.wrap(pos, pos, type, attrs);
  var delPos = tr.map(pos).pos;
  tr.delete(new _model.Pos(delPos.path, 0), delPos);
  if (join) tr.join(before);
  tr.apply();
}

function setAs(pm, pos, type, attrs) {
  pm.tr.setBlockType(pos, pos, type, attrs).delete(new _model.Pos(pos.path, 0), pos).apply();
}