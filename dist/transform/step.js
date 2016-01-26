"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StepResult = exports.Step = undefined;

var _model = require("../model");

var _error = require("../util/error");

var _map = require("./map");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ;; A step object wraps an atomic operation. It generally applies
// only to the document it was created for, since the positions
// associated with it will only make sense for that document.

var Step = exports.Step = function () {
  // :: (string, ?Pos, ?Pos, ?Pos, ?any)
  // Build a step. The type should name a [defined](Step.define) step
  // type, and the shape of the positions and parameter should be
  // appropriate for that type.

  function Step(type, from, to, pos) {
    var param = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

    _classCallCheck(this, Step);

    if (!(type in steps)) _error.NamespaceError.raise("Unknown step type: " + type);
    // :: string
    // The type of the step.
    this.type = type;
    // :: ?Pos
    // The start of the step's range, if any. Which of the three
    // optional positions associated with a step a given step type
    // uses differs. The way each of these positions is mapped when
    // the step is mapped over a [position mapping](#PosMap) depends
    // on its role.
    this.from = from;
    // :: ?Pos
    // The end of the step's range.
    this.to = to;
    // :: ?Pos
    // The base position for this step.
    this.pos = pos;
    // :: ?any
    // Extra step-type-specific information associated with the step.
    this.param = param;
  }

  // :: (Node) → ?StepResult
  // Applies this step to the given document, returning a result
  // containing the transformed document (the input document is not
  // changed) and a `PosMap`. If the step could not meaningfully be
  // applied to the given document, this returns `null`.

  _createClass(Step, [{
    key: "apply",
    value: function apply(doc) {
      return steps[this.type].apply(doc, this);
    }

    // :: (Node, PosMap) → Step
    // Create an inverted version of this step. Needs the document as it
    // was before the step, as well as `PosMap` created by applying the
    // step to that document, as input.

  }, {
    key: "invert",
    value: function invert(oldDoc, map) {
      return steps[this.type].invert(this, oldDoc, map);
    }

    // :: (Mappable) → ?Step
    // Map this step through a mappable thing, returning either a
    // version of that step with its positions adjusted, or `null` if
    // the step was entirely deleted by the mapping.

  }, {
    key: "map",
    value: function map(remapping) {
      var allDeleted = true;
      var from = null,
          to = null,
          pos = null;

      if (this.from) {
        var result = remapping.map(this.from, 1);
        from = result.pos;
        if (!result.deleted) allDeleted = false;
      }
      if (this.to) {
        if (this.to.cmp(this.from) == 0) {
          to = from;
        } else {
          var result = remapping.map(this.to, -1);
          to = result.pos.max(from);
          if (!result.deleted) allDeleted = false;
        }
      }
      if (this.pos) {
        if (from && this.pos.cmp(this.from) == 0) {
          pos = from;
        } else if (to && this.pos.cmp(this.to) == 0) {
          pos = to;
        } else {
          var result = remapping.map(this.pos, 1);
          pos = result.pos;
          if (!result.deleted) allDeleted = false;
        }
      }
      return allDeleted ? null : new Step(this.type, from, to, pos, this.param);
    }

    // :: () → Object
    // Create a JSON-serializeable representation of this step.

  }, {
    key: "toJSON",
    value: function toJSON() {
      var impl = steps[this.type];
      return {
        type: this.type,
        from: this.from,
        to: this.to,
        pos: this.pos,
        param: impl.paramToJSON ? impl.paramToJSON(this.param) : this.param
      };
    }

    // :: (Schema, Object) → Step
    // Deserialize a step from its JSON representation.

  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      var impl = steps[json.type];
      return new Step(json.type, json.from && _model.Pos.fromJSON(json.from), json.to && _model.Pos.fromJSON(json.to), json.pos && _model.Pos.fromJSON(json.pos), impl.paramFromJSON ? impl.paramFromJSON(schema, json.param) : json.param);
    }

    // :: (string, Object)
    // Define a new type of step. Implementation should have the
    // following properties:
    //
    // **`apply`**`(doc: Node, step: Step) → ?StepResult
    //   : Applies the step to a document.
    // **`invert`**`(step: Step, oldDoc: Node, map: PosMap) → Step
    //   : Create an inverted version of the step.
    // **`paramToJSON`**`(param: ?any) → ?Object
    //   : Serialize this step type's parameter to JSON.
    // **`paramFromJSON`**`(schema: Schema, json: ?Object) → ?any
    //   : Deserialize this step type's parameter from JSON.

  }, {
    key: "define",
    value: function define(type, implementation) {
      steps[type] = implementation;
    }
  }]);

  return Step;
}();

// ;; Objects of this type are returned as the result of
// applying a transform step to a document.

var StepResult = exports.StepResult = function StepResult(doc) {
  var map = arguments.length <= 1 || arguments[1] === undefined ? _map.nullMap : arguments[1];

  _classCallCheck(this, StepResult);

  // :: Node The transformed document.
  this.doc = doc;
  // :: PosMap
  // The position map that describes the correspondence between the
  // old and the new document.
  this.map = map;
};

var steps = Object.create(null);