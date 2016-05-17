'use strict';

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var _basictracer = require('basictracer');

var _basictracer2 = _interopRequireDefault(_basictracer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = new _client2.default(_basictracer2.default);