"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.paramTypes = exports.TooltipDisplay = exports.Menu = undefined;
exports.expandDropDown = expandDropDown;
exports.readParams = readParams;
exports.menuGroups = menuGroups;

var _tooltip = require("../ui/tooltip");

var _dom = require("../dom");

var _edit = require("../edit");

var _sortedinsert = require("../util/sortedinsert");

var _sortedinsert2 = _interopRequireDefault(_sortedinsert);

var _error = require("../util/error");

var _icons = require("./icons");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var prefix = "ProseMirror-menu";

// ;; #path=CommandSpec #kind=interface #noAnchor
// The `menu` module gives meaning to two additional properties of
// [command specs](#CommandSpec).

// :: string #path=CommandSpec.menuGroup
//
// Adds the command to the menugroup with the given name. The value
// may either be just a name (for example `"inline"` or `"block"`), or
// a name followed by a parenthesized rank (`"inline(40)"`) to control
// the order in which the commands appear in the group (from low to
// high, with 50 as default rank).

// :: Object #path=CommandSpec.display
//
// Determines how a command is shown in the menu. The object should
// have a `type` property, which picks a style of display. These types
// are supported:
//
// **`"icon"`**
//   : Show the command as an icon. The object may have `{path, width,
//     height}` properties, where `path` is an [SVG path
//     spec](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d),
//     and `width` and `height` provide the viewbox in which that path
//     exists. Alternatively, it may have a `text` property specifying
//     a string of text that makes up the icon, with an optional
//     `style` property giving additional CSS styling for the text.
//
// **`"param"`**
//   : Render command based on its first and only
//     [parameter](#CommandSpec.params), and immediately execute the
//     command when the parameter is changed. Currently only works for
//     `"select"` parameters.

var Menu = exports.Menu = function () {
  function Menu(pm, display, reset) {
    _classCallCheck(this, Menu);

    this.display = display;
    this.stack = [];
    this.pm = pm;
    this.resetHandler = reset;
    this.cssHint = "";
  }

  _createClass(Menu, [{
    key: "show",
    value: function show(content, displayInfo) {
      this.stack.length = 0;
      this.enter(content, displayInfo);
    }
  }, {
    key: "reset",
    value: function reset() {
      this.stack.length = 0;
      this.resetHandler();
    }
  }, {
    key: "enter",
    value: function enter(content, displayInfo) {
      var _this = this;

      var pieces = [],
          close = false,
          explore = function explore(value) {
        var added = false;
        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            added = explore(value[i]) || added;
          }if (added) close = true;
        } else if (!value.select || value.select(_this.pm)) {
          if (close) {
            pieces.push(separator);
            close = false;
          }
          pieces.push(value);
          added = true;
        }
        return added;
      };
      explore(content);

      if (!pieces.length) return this.display.clear();

      this.stack.push(pieces);
      this.draw(displayInfo);
    }
  }, {
    key: "draw",
    value: function draw(displayInfo) {
      var _this2 = this;

      var cur = this.stack[this.stack.length - 1];
      var rendered = (0, _dom.elt)("div", { class: prefix }, cur.map(function (item) {
        return renderItem(item, _this2);
      }));
      if (this.stack.length > 1) this.display.enter(rendered, function () {
        return _this2.leave();
      }, displayInfo);else this.display.show(rendered, displayInfo);
    }
  }, {
    key: "leave",
    value: function leave() {
      this.stack.pop();
      if (this.display.leave) this.display.leave();else this.draw();
    }
  }, {
    key: "active",
    get: function get() {
      return this.stack.length > 1;
    }
  }]);

  return Menu;
}();

var TooltipDisplay = exports.TooltipDisplay = function () {
  function TooltipDisplay(tooltip) {
    _classCallCheck(this, TooltipDisplay);

    this.tooltip = tooltip;
  }

  _createClass(TooltipDisplay, [{
    key: "clear",
    value: function clear() {
      this.tooltip.close();
    }
  }, {
    key: "show",
    value: function show(dom, info) {
      this.tooltip.open(dom, info);
    }
  }, {
    key: "enter",
    value: function enter(dom, back, info) {
      var button = (0, _dom.elt)("div", { class: "ProseMirror-tooltip-back", title: "Back" });
      button.addEventListener("mousedown", function (e) {
        e.preventDefault();e.stopPropagation();
        back();
      });
      this.show((0, _dom.elt)("div", { class: "ProseMirror-tooltip-back-wrapper" }, dom, button), info);
    }
  }]);

  return TooltipDisplay;
}();

function title(pm, command) {
  if (!command.label) return null;
  var key = command.name && pm.keyForCommand(command.name);
  return key ? command.label + " (" + key + ")" : command.label;
}

function execInMenu(menu, command, params) {
  (0, _edit.withParamHandler)(function (_, command, callback) {
    menu.enter(readParams(command, callback));
  }, function () {
    command.exec(menu.pm, params);
  });
}

function renderIcon(command, menu) {
  var icon = (0, _icons.getIcon)(command.name, command.spec.display);
  if (command.active(menu.pm)) icon.className += " ProseMirror-icon-active";
  icon.addEventListener("mousedown", function (e) {
    e.preventDefault();e.stopPropagation();
    execInMenu(menu, command);
  });
  return icon;
}

function renderDropDown(item, menu) {
  var param = item.params[0];
  var deflt = paramDefault(param, menu.pm, item);
  if (deflt != null) {
    var options = param.options.call ? param.options(menu.pm) : param.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === deflt) {
        deflt = options[i];
        break;
      }
    }
  }

  var dom = (0, _dom.elt)("div", { class: "ProseMirror-dropdown ProseMirror-dropdown-command-" + item.name, title: item.label }, !deflt ? param.defaultLabel || "Select..." : deflt.display ? deflt.display(deflt) : deflt.label);
  var open = null;
  dom.addEventListener("mousedown", function (e) {
    e.preventDefault();e.stopPropagation();
    if (open && open()) open = null;else open = expandDropDown(menu, item, dom);
  });
  return dom;
}

function expandDropDown(menu, item, dom) {
  var param = item.params[0],
      pm = menu.pm;
  var options = param.options.call ? param.options(pm) : param.options;
  var menuDOM = (0, _dom.elt)("div", { class: "ProseMirror-dropdown-menu " + menu.cssHint }, options.map(function (o) {
    var dom = (0, _dom.elt)("div", null, o.display ? o.display(o) : o.label);
    dom.addEventListener("mousedown", function (e) {
      e.preventDefault();
      execInMenu(menu, item, [o.value]);
      finish();
    });
    return dom;
  }));
  var pos = dom.getBoundingClientRect(),
      box = pm.wrapper.getBoundingClientRect();
  menuDOM.style.left = pos.left - box.left + "px";
  menuDOM.style.top = pos.bottom - box.top + "px";

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    document.body.removeEventListener("mousedown", finish);
    document.body.removeEventListener("keydown", finish);
    pm.wrapper.removeChild(menuDOM);
    return true;
  }
  document.body.addEventListener("mousedown", finish);
  document.body.addEventListener("keydown", finish);
  pm.wrapper.appendChild(menuDOM);
  return finish;
}

function renderItem(item, menu) {
  var dom = undefined;
  if (item instanceof _edit.Command) {
    var display = item.spec.display;
    if (display.type == "icon") dom = renderIcon(item, menu);else if (display.type == "param") dom = renderDropDown(item, menu);else _error.AssertionError.raise("Command " + item.name + " can not be shown in a menu");
  } else {
    dom = item.display(menu);
  }
  return (0, _dom.elt)("span", { class: prefix + "item", title: title(menu.pm, item) }, dom);
}

function paramDefault(param, pm, command) {
  if (param.prefill) {
    var prefill = param.prefill.call(command.self, pm);
    if (prefill != null) return prefill;
  }
  return param.default;
}

// :: Object<{render: (param: CommandParam, value: any) → DOMNode, read: (node: DOMNode) → any}>
// A collection of default renderers and readers for [parameter
// types](#CommandParam.type), which [parameter
// handlers](#commandParamHandler) can optionally use to prompt for
// parameters. `render` should create a form field for the parameter,
// and `read` should, given that field, return its value.
var paramTypes = exports.paramTypes = Object.create(null);

paramTypes.text = {
  render: function render(param, value) {
    return (0, _dom.elt)("input", { type: "text",
      placeholder: param.label,
      value: value,
      autocomplete: "off" });
  },
  read: function read(dom) {
    return dom.value;
  }
};

paramTypes.select = {
  render: function render(param, value) {
    var options = param.options.call ? param.options(this) : param.options;
    return (0, _dom.elt)("select", null, options.map(function (o) {
      return (0, _dom.elt)("option", { value: o.value, selected: o.value == value ? "true" : null }, o.label);
    }));
  },
  read: function read(dom) {
    return dom.value;
  }
};

function buildParamForm(pm, command) {
  var fields = command.params.map(function (param, i) {
    if (!(param.type in paramTypes)) _error.AssertionError.raise("Unsupported parameter type: " + param.type);
    var field = paramTypes[param.type].render.call(pm, param, paramDefault(param, pm, command));
    field.setAttribute("data-field", i);
    return (0, _dom.elt)("div", null, field);
  });
  return (0, _dom.elt)("form", null, fields);
}

function gatherParams(pm, command, form) {
  var bad = false;
  var params = command.params.map(function (param, i) {
    var dom = form.querySelector("[data-field=\"" + i + "\"]");
    var val = paramTypes[param.type].read.call(pm, dom);
    if (val) return val;
    if (param.default == null) bad = true;else return paramDefault(param, pm, command);
  });
  return bad ? null : params;
}

function paramForm(pm, command, callback) {
  var form = buildParamForm(pm, command),
      done = false;

  var finish = function finish(result) {
    if (!done) {
      done = true;
      callback(result);
    }
  };

  var submit = function submit() {
    // FIXME error messages
    finish(gatherParams(pm, command, form));
  };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });
  form.addEventListener("keydown", function (e) {
    if (e.keyCode == 27) {
      finish(null);
    } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.preventDefault();
      submit();
    }
  });
  // FIXME too hacky?
  setTimeout(function () {
    var input = form.querySelector("input, textarea");
    if (input) input.focus();
  }, 20);

  return form;
}

function readParams(command, callback) {
  return {
    display: function display(menu) {
      return paramForm(menu.pm, command, function (params) {
        menu.pm.focus();
        if (params) {
          callback(params);
          menu.reset();
        } else {
          menu.leave();
        }
      });
    }
  };
}

var separator = {
  display: function display() {
    return (0, _dom.elt)("span", { class: prefix + "separator" });
  }
};

function menuRank(cmd) {
  var match = /^[^(]+\((\d+)\)$/.exec(cmd.spec.menuGroup);
  return match ? +match[1] : 50;
}

function computeMenuGroups(pm) {
  var groups = Object.create(null);
  for (var name in pm.commands) {
    var cmd = pm.commands[name],
        spec = cmd.spec.menuGroup;
    if (!spec) continue;

    var _$exec = /^[^(]+/.exec(spec);

    var _$exec2 = _slicedToArray(_$exec, 1);

    var group = _$exec2[0];

    (0, _sortedinsert2.default)(groups[group] || (groups[group] = []), cmd, function (a, b) {
      return menuRank(a) - menuRank(b);
    });
  }
  pm.mod.menuGroups = groups;
  var clear = function clear() {
    pm.mod.menuGroups = null;
    pm.off("commandsChanging", clear);
  };
  pm.on("commandsChanging", clear);
  return groups;
}

var empty = [];

function menuGroups(pm, names) {
  var groups = pm.mod.menuGroups || computeMenuGroups(pm);
  return names.map(function (group) {
    return groups[group] || empty;
  });
}

function tooltipParamHandler(pm, command, callback) {
  var tooltip = new _tooltip.Tooltip(pm.wrapper, "center");
  tooltip.open(paramForm(pm, command, function (params) {
    pm.focus();
    tooltip.close();
    callback(params);
  }));
}

(0, _edit.defineDefaultParamHandler)(tooltipParamHandler, false);

// FIXME check for obsolete styles
(0, _dom.insertCSS)("\n\n." + prefix + " {\n  margin: 0 -4px;\n  line-height: 1;\n}\n.ProseMirror-tooltip ." + prefix + " {\n  width: -webkit-fit-content;\n  width: fit-content;\n  white-space: pre;\n}\n\n.ProseMirror-tooltip-back-wrapper {\n  padding-left: 12px;\n}\n.ProseMirror-tooltip-back {\n  position: absolute;\n  top: 5px; left: 5px;\n  cursor: pointer;\n}\n.ProseMirror-tooltip-back:after {\n  content: \"«\";\n}\n\n." + prefix + "item {\n  margin-right: 3px;\n  display: inline-block;\n}\n\n." + prefix + "separator {\n  border-right: 1px solid #666;\n}\n\n.ProseMirror-dropdown, .ProseMirror-dropdown-menu {\n  font-size: 90%;\n}\n\n.ProseMirror-dropdown {\n  padding: 1px 14px 1px 4px;\n  display: inline-block;\n  vertical-align: 1px;\n  position: relative;\n  cursor: pointer;\n}\n\n.ProseMirror-dropdown:after {\n  content: \"⏷\";\n  font-size: 90%;\n  opacity: .6;\n  position: absolute;\n  right: 2px;\n}\n\n.ProseMirror-dropdown-command-textblockType {\n  min-width: 3em;\n}\n\n.ProseMirror-dropdown-menu {\n  position: absolute;\n  background: #444;\n  color: white;\n  padding: 2px;\n  z-index: 15;\n  min-width: 6em;\n}\n.ProseMirror-dropdown-menu div {\n  cursor: pointer;\n  padding: 2px 8px 2px 4px;\n}\n.ProseMirror-dropdown-menu div:hover {\n  background: #777;\n}\n\n");