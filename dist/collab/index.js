"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rebaseSteps = undefined;

var _edit = require("../edit");

var _event = require("../util/event");

var _error = require("../util/error");

var _rebase = require("./rebase");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports.rebaseSteps = _rebase.rebaseSteps;

// !! This module implements an API into which a communication channel
// for collaborative editing can be hooked. See [this
// guide](guide/collab.html) for more details and an example.

// :: ?Object #path=collab #kind=option
//
// When given, enables the collaborative editing framework for the
// editor. Will register itself of the `Collab` class as
// `.mod.collab`.
//
// If the object given has a `version` property, that will determine
// the starting version number of the collaborative editing.

(0, _edit.defineOption)("collab", false, function (pm, value) {
  if (pm.mod.collab) {
    pm.mod.collab.detach();
    pm.mod.collab = null;
  }

  if (value) {
    pm.mod.collab = new Collab(pm, value);
  }
});

// ;; This class accumulates changes that have to be sent to the
// central authority in the collaborating group, signals an event when
// it has something to send, and makes it possible to integrate
// changes made by peers into our local document. It is created and
// attached to the editor (under `.mod.collab`) by setting the
// `collab` option.
//
// Includes the [event mixin](#EventMixin).

var Collab = function () {
  function Collab(pm, options) {
    var _this = this;

    _classCallCheck(this, Collab);

    this.pm = pm;
    this.options = options;

    // :: number
    // The version number of the last update received from the central
    // authority. Starts at 0 or the value of the `version` property
    // in the option object, for the editor's value when the option
    // was enabled.
    this.version = options.version || 0;
    this.versionDoc = pm.doc;

    this.unconfirmedSteps = [];
    this.unconfirmedMaps = [];

    pm.on("transform", this.onTransform = function (transform) {
      for (var i = 0; i < transform.steps.length; i++) {
        _this.unconfirmedSteps.push(transform.steps[i]);
        _this.unconfirmedMaps.push(transform.maps[i]);
      }
      // :: () #path=Collab#events#mustSend
      // Fired when there are new steps to send to the central
      // authority. Consumers should respond by calling
      // `sendableSteps` and pushing those to the authority.
      _this.signal("mustSend");
    });
    pm.on("beforeSetDoc", this.onSetDoc = function () {
      _error.AssertionError.raise("setDoc is not supported on a collaborative editor");
    });
    pm.history.allowCollapsing = false;
  }

  _createClass(Collab, [{
    key: "detach",
    value: function detach() {
      this.pm.off("transform", this.onTransform);
      this.pm.off("beforeSetDoc", this.onSetDoc);
      this.pm.history.allowCollapsing = true;
    }

    // :: () -> bool
    // Reports whether the editor has any unsent steps.

  }, {
    key: "hasSendableSteps",
    value: function hasSendableSteps() {
      return this.unconfirmedSteps.length > 0;
    }

    // :: () → {version: number, doc: Node, steps: [Step]}
    // Provides the data describing the editor's unconfirmed steps. The
    // version and array of steps are the things you'd send to the
    // central authority. The whole return value must be passed to
    // [`confirmSteps`](#Collab.confirmSteps) when the steps go through.

  }, {
    key: "sendableSteps",
    value: function sendableSteps() {
      return {
        version: this.version,
        doc: this.pm.doc,
        steps: this.unconfirmedSteps.slice()
      };
    }

    // :: ({version: number, doc: Node, steps: [Step]})
    // Tells the module that a set of unconfirmed steps have been
    // accepted by the central authority, and can now be considered
    // confirmed.

  }, {
    key: "confirmSteps",
    value: function confirmSteps(sendable) {
      this.unconfirmedSteps.splice(0, sendable.steps.length);
      this.unconfirmedMaps.splice(0, sendable.steps.length);
      this.version += sendable.steps.length;
      this.versionDoc = sendable.doc;
    }

    // :: ([Step]) → [PosMap]
    // Pushes a set of steps (made by peers and received from the
    // central authority) into the editor. This will rebase any
    // unconfirmed steps over these steps.
    //
    // Returns the [position maps](#PosMap) produced by applying the
    // steps.

  }, {
    key: "receive",
    value: function receive(steps) {
      var doc = this.versionDoc;
      var maps = steps.map(function (step) {
        var result = step.apply(doc);
        doc = result.doc;
        return result.map;
      });
      this.version += steps.length;
      this.versionDoc = doc;

      var rebased = (0, _rebase.rebaseSteps)(doc, maps, this.unconfirmedSteps, this.unconfirmedMaps);
      this.unconfirmedSteps = rebased.transform.steps.slice();
      this.unconfirmedMaps = rebased.transform.maps.slice();

      this.pm.updateDoc(rebased.doc, rebased.mapping);
      this.pm.history.rebased(maps, rebased.transform, rebased.positions);
      return maps;
    }
  }]);

  return Collab;
}();

(0, _event.eventMixin)(Collab);