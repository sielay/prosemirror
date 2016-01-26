"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Keymap = exports.baseCommands = exports.Command = exports.withParamHandler = exports.defineDefaultParamHandler = exports.CommandSet = exports.MarkedRange = exports.SelectionError = exports.Range = exports.defineOption = exports.ProseMirror = undefined;

var _main = require("./main");

Object.defineProperty(exports, "ProseMirror", {
  enumerable: true,
  get: function get() {
    return _main.ProseMirror;
  }
});

var _options = require("./options");

Object.defineProperty(exports, "defineOption", {
  enumerable: true,
  get: function get() {
    return _options.defineOption;
  }
});

var _selection = require("./selection");

Object.defineProperty(exports, "Range", {
  enumerable: true,
  get: function get() {
    return _selection.Range;
  }
});
Object.defineProperty(exports, "SelectionError", {
  enumerable: true,
  get: function get() {
    return _selection.SelectionError;
  }
});

var _range = require("./range");

Object.defineProperty(exports, "MarkedRange", {
  enumerable: true,
  get: function get() {
    return _range.MarkedRange;
  }
});

var _command = require("./command");

Object.defineProperty(exports, "CommandSet", {
  enumerable: true,
  get: function get() {
    return _command.CommandSet;
  }
});
Object.defineProperty(exports, "defineDefaultParamHandler", {
  enumerable: true,
  get: function get() {
    return _command.defineDefaultParamHandler;
  }
});
Object.defineProperty(exports, "withParamHandler", {
  enumerable: true,
  get: function get() {
    return _command.withParamHandler;
  }
});
Object.defineProperty(exports, "Command", {
  enumerable: true,
  get: function get() {
    return _command.Command;
  }
});

var _base_commands = require("./base_commands");

Object.defineProperty(exports, "baseCommands", {
  enumerable: true,
  get: function get() {
    return _base_commands.baseCommands;
  }
});

require("./schema_commands");

var _browserkeymap = require("browserkeymap");

var _browserkeymap2 = _interopRequireDefault(_browserkeymap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Keymap = _browserkeymap2.default;