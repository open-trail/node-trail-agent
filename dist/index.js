'use strict';

var _basictracer = require('basictracer');

var _basictracer2 = _interopRequireDefault(_basictracer);

var _continuationLocalStorage = require('continuation-local-storage');

var _continuationLocalStorage2 = _interopRequireDefault(_continuationLocalStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let ns = _continuationLocalStorage2.default.createNamespace('trail');

module.exports = {
    FORMAT_BINARY: _basictracer2.default.FORMAT_BINARY,
    FORMAT_TEXT_MAP: _basictracer2.default.FORMAT_TEXT_MAP,

    configure: _basictracer2.default.configure.bind(_basictracer2.default),

    startSpan() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        let span = _basictracer2.default.startSpan.apply(_basictracer2.default, args);
        ns.set('currentSpan', span);
        return span;
    },
    getCurrentSpan() {
        return ns.get('currentSpan');
    },
    inject() {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
        }

        return _basictracer2.default.inject.apply(_basictracer2.default, args);
    },
    join() {
        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
        }

        return _basictracer2.default.join.apply(_basictracer2.default, args);
    }
};