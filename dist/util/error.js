"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// ;; Superclass for ProseMirror-related errors. Does some magic to
// make it safely subclassable even on ES5 runtimes.

var ProseMirrorError = exports.ProseMirrorError = function (_Error) {
  _inherits(ProseMirrorError, _Error);

  // :: (string)
  // Create an instance of this error type, capturing the current
  // stack.

  function ProseMirrorError(message) {
    _classCallCheck(this, ProseMirrorError);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ProseMirrorError).call(this, message));

    if (_this.message != message) {
      _this.message = message;
      if (Error.captureStackTrace) Error.captureStackTrace(_this, _this.name);else _this.stack = new Error(message).stack;
    }
    return _this;
  }

  _createClass(ProseMirrorError, [{
    key: "name",
    get: function get() {
      return this.constructor.name || functionName(this.constructor) || "ProseMirrorError";
    }

    // :: (string)
    // Raise an exception of this type, with the given message.
    // (Somewhat shorter than `throw new ...`, and can appear in
    // expression position.)

  }], [{
    key: "raise",
    value: function raise(message) {
      throw new this(message);
    }
  }]);

  return ProseMirrorError;
}(Error);

// ;; Error type used to signal miscellaneous invariant violations.

var AssertionError = exports.AssertionError = function (_ProseMirrorError) {
  _inherits(AssertionError, _ProseMirrorError);

  function AssertionError() {
    _classCallCheck(this, AssertionError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(AssertionError).apply(this, arguments));
  }

  return AssertionError;
}(ProseMirrorError);

// ;; Error type used to report name clashes or other violations in
// namespacing.

var NamespaceError = exports.NamespaceError = function (_ProseMirrorError2) {
  _inherits(NamespaceError, _ProseMirrorError2);

  function NamespaceError() {
    _classCallCheck(this, NamespaceError);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(NamespaceError).apply(this, arguments));
  }

  return NamespaceError;
}(ProseMirrorError);

function functionName(f) {
  var match = /^function (\w+)/.exec(f.toString());
  return match && match[1];
}