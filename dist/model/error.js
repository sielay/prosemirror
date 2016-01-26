"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ModelError = undefined;

var _error = require("../util/error");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Class used to signal model-related errors.

var ModelError = exports.ModelError = function (_ProseMirrorError) {
  _inherits(ModelError, _ProseMirrorError);

  function ModelError() {
    _classCallCheck(this, ModelError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ModelError).apply(this, arguments));
  }

  return ModelError;
}(_error.ProseMirrorError);