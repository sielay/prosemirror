"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _edit = require("../edit");

var _dom = require("../dom");

var _update = require("../ui/update");

var _menu = require("./menu");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var prefix = "ProseMirror-menubar";

// :: union<bool, Object> #path=menuBar #kind=option
//
// When given a truthy value, enables the menu bar module for this
// editor. The menu bar takes up space above the editor, showing
// currently available commands (that have been
// [added](#CommandSpec.menuGroup) to the menu). To configure the
// module, you can pass a configuration object, on which the following
// properties are supported:
//
// **`float`**`: bool = false`
//   : When enabled, causes the menu bar to stay visible when the
//     editor is partially scrolled out of view, by making it float at
//     the top of the viewport.
//
// **`groups`**`: [string] = ["inline", "insert", "block", "history"]`
//   : Determines the menu groups that are shown in the menu bar.
//
// **`items`**`: [union<string, [string]>]`
//   : Can be used to, rather than getting the commands to display
//     from menu groups, explicitly provide the full list of commands.
//     If nested arrays are used, separators will be shown between
//     items from different arrays.

(0, _edit.defineOption)("menuBar", false, function (pm, value) {
  if (pm.mod.menuBar) pm.mod.menuBar.detach();
  pm.mod.menuBar = value ? new MenuBar(pm, value) : null;
});

function getItems(pm, items) {
  return Array.isArray(items) ? items.map(getItems.bind(null, pm)).filter(function (i) {
    return i;
  }) : pm.commands[items];
}

var BarDisplay = function () {
  function BarDisplay(container) {
    _classCallCheck(this, BarDisplay);

    this.container = container;
  }

  _createClass(BarDisplay, [{
    key: "clear",
    value: function clear() {
      this.container.textContent = "";
    }
  }, {
    key: "show",
    value: function show(dom) {
      this.clear();
      this.container.appendChild(dom);
    }
  }, {
    key: "enter",
    value: function enter(dom, back) {
      this.container.firstChild.style.opacity = "0.5";

      var backButton = (0, _dom.elt)("div", { class: prefix + "-back" });
      backButton.addEventListener("mousedown", function (e) {
        e.preventDefault();e.stopPropagation();
        back();
      });
      var added = (0, _dom.elt)("div", { class: prefix + "-sliding-wrap" }, (0, _dom.elt)("div", { class: prefix + "-sliding" }, backButton, dom));
      this.container.appendChild(added);
      added.lastChild.getBoundingClientRect(); // Force layout for transition
      added.lastChild.style.left = "0";
    }
  }, {
    key: "leave",
    value: function leave() {
      var _this = this;

      var last = this.container.lastChild;
      last.firstChild.style.pointerEvents = "none";
      last.lastChild.style.left = "";
      last.previousSibling.style.opacity = "";
      last.lastChild.addEventListener("transitionend", function () {
        _this.container.removeChild(last);
      });
    }
  }]);

  return BarDisplay;
}();

var MenuBar = function () {
  function MenuBar(pm, config) {
    var _this2 = this;

    _classCallCheck(this, MenuBar);

    this.pm = pm;
    this.config = config || {};

    this.wrapper = pm.wrapper.insertBefore((0, _dom.elt)("div", { class: prefix }), pm.wrapper.firstChild);
    this.spacer = null;
    this.maxHeight = 0;
    this.widthForMaxHeight = 0;

    this.updater = new _update.UpdateScheduler(pm, "selectionChange change activeMarkChange commandsChanged", function () {
      return _this2.update();
    });
    this.menu = new _menu.Menu(pm, new BarDisplay(this.wrapper), function () {
      return _this2.resetMenu();
    });
    this.menu.cssHint = prefix + "-hint";

    this.updater.force();

    this.floating = false;
    if (this.config.float) {
      this.updateFloat();
      this.scrollFunc = function () {
        if (!document.body.contains(_this2.pm.wrapper)) window.removeEventListener("scroll", _this2.scrollFunc);else _this2.updateFloat();
      };
      window.addEventListener("scroll", this.scrollFunc);
    }
  }

  _createClass(MenuBar, [{
    key: "detach",
    value: function detach() {
      this.updater.detach();
      this.wrapper.parentNode.removeChild(this.wrapper);

      if (this.scrollFunc) window.removeEventListener("scroll", this.scrollFunc);
    }
  }, {
    key: "update",
    value: function update() {
      var _this3 = this;

      if (!this.menu.active) this.resetMenu();
      return this.float ? this.updateScrollCursor() : function () {
        if (_this3.wrapper.offsetWidth != _this3.widthForMaxHeight) {
          _this3.widthForMaxHeight = _this3.wrapper.offsetWidth;
          _this3.maxHeight = 0;
        }
        if (_this3.wrapper.offsetHeight > _this3.maxHeight) {
          _this3.maxHeight = _this3.wrapper.offsetHeight;
          return function () {
            _this3.wrapper.style.minHeight = _this3.maxHeight + "px";
          };
        }
      };
    }
  }, {
    key: "resetMenu",
    value: function resetMenu() {
      this.menu.show(this.config.items ? getItems(this.pm, this.config.items) : (0, _menu.menuGroups)(this.pm, this.config.groups || ["inline", "insert", "block", "history"]));
    }
  }, {
    key: "updateFloat",
    value: function updateFloat() {
      var editorRect = this.pm.wrapper.getBoundingClientRect();
      if (this.floating) {
        if (editorRect.top >= 0 || editorRect.bottom < this.wrapper.offsetHeight + 10) {
          this.floating = false;
          this.wrapper.style.position = this.wrapper.style.left = this.wrapper.style.width = "";
          this.wrapper.style.display = "";
          this.spacer.parentNode.removeChild(this.spacer);
          this.spacer = null;
        } else {
          var border = (this.pm.wrapper.offsetWidth - this.pm.wrapper.clientWidth) / 2;
          this.wrapper.style.left = editorRect.left + border + "px";
          this.wrapper.style.display = editorRect.top > window.innerHeight ? "none" : "";
        }
      } else {
        if (editorRect.top < 0 && editorRect.bottom >= this.wrapper.offsetHeight + 10) {
          this.floating = true;
          var menuRect = this.wrapper.getBoundingClientRect();
          this.wrapper.style.left = menuRect.left + "px";
          this.wrapper.style.width = menuRect.width + "px";
          this.wrapper.style.position = "fixed";
          this.spacer = (0, _dom.elt)("div", { class: prefix + "-spacer", style: "height: " + menuRect.height + "px" });
          this.pm.wrapper.insertBefore(this.spacer, this.wrapper);
        }
      }
    }
  }, {
    key: "updateScrollCursor",
    value: function updateScrollCursor() {
      var _this4 = this;

      if (!this.floating) return null;
      var head = this.pm.selection.head;
      if (!head) return null;
      return function () {
        var cursorPos = _this4.pm.coordsAtPos(head);
        var menuRect = _this4.wrapper.getBoundingClientRect();
        if (cursorPos.top < menuRect.bottom && cursorPos.bottom > menuRect.top) {
          var _ret = function () {
            var scrollable = findWrappingScrollable(_this4.pm.wrapper);
            if (scrollable) return {
                v: function v() {
                  scrollable.scrollTop -= menuRect.bottom - cursorPos.top;
                }
              };
          }();

          if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
        }
      };
    }
  }]);

  return MenuBar;
}();

function findWrappingScrollable(node) {
  for (var cur = node.parentNode; cur; cur = cur.parentNode) {
    if (cur.scrollHeight > cur.clientHeight) return cur;
  }
}

(0, _dom.insertCSS)("\n." + prefix + " {\n  border-top-left-radius: inherit;\n  border-top-right-radius: inherit;\n  position: relative;\n  min-height: 1em;\n  color: #666;\n  padding: 1px 6px;\n  top: 0; left: 0; right: 0;\n  border-bottom: 1px solid silver;\n  background: white;\n  z-index: 10;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n  overflow: visible;\n}\n\n." + prefix + " .ProseMirror-icon-active {\n  background: #eee;\n}\n\n.ProseMirror-menuseparator {\n  border-right: 1px solid #ddd;\n}\n\n." + prefix + "-hint.ProseMirror-dropdown-menu {\n  background: white;\n  color: #666;\n  border: 1px solid #ddd;\n}\n\n." + prefix + "-hint.ProseMirror-dropdown-menu div:hover {\n  background: #f2f2f2;\n}\n\n." + prefix + " input[type=\"text\"],\n." + prefix + " textarea {\n  background: #eee;\n  color: black;\n  border: none;\n  outline: none;\n  width: 100%;\n  box-sizing: -moz-border-box;\n  box-sizing: border-box;\n}\n\n." + prefix + " input[type=\"text\"] {\n  padding: 0 4px;\n}\n\n." + prefix + " form {\n  position: relative;\n  padding: 2px 4px;\n}\n\n." + prefix + " .ProseMirror-blocktype {\n  border: 1px solid #ccc;\n  min-width: 4em;\n}\n\n." + prefix + "-sliding-wrap {\n  position: absolute;\n  left: 0; right: 0; top: 0;\n  height: -webkit-fit-content;\n  height: fit-content;\n  overflow: hidden;\n}\n\n." + prefix + "-sliding {\n  -webkit-transition: left 0.2s ease-out;\n  -moz-transition: left 0.2s ease-out;\n  transition: left 0.2s ease-out;\n  position: relative;\n  left: 100%;\n  width: 100%;\n  box-sizing: -moz-border-box;\n  box-sizing: border-box;\n  padding-left: 16px;\n  padding-right: 4px;\n  background: white;\n  border-bottom: 1px solid #ccc;\n}\n\n." + prefix + "-back {\n  position: absolute;\n  height: 100%;\n  margin-top: -1px;\n  padding-bottom: 2px;\n  width: 10px;\n  left: 0;\n  border-right: 1px solid silver;\n  cursor: pointer;\n  z-index: 1;\n}\n." + prefix + "-back:after {\n  content: \"»\";\n}\n\n");