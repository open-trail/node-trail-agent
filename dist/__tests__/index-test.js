'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _continuationLocalStorage = require('continuation-local-storage');

var _continuationLocalStorage2 = _interopRequireDefault(_continuationLocalStorage);

var _ = require('..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OPERATION_NAME = 'basictracer-test';
const ANOTHER_OPERATION_NAME = 'another-basictracer-test';

let debug = require('debug')('trail:tests');
_2.default.configure();
let ns = _continuationLocalStorage2.default.getNamespace('trail');

describe('Client', () => {
    beforeEach(done => {
        ns.run(() => done());
    });

    it('should create root span', () => {
        let rootSpan = _2.default.startSpan({ operationName: OPERATION_NAME });
        let imp = rootSpan.imp();
        should(imp.traceId).be.ok();
        should(imp.spanId).be.ok();
        should(imp.parentId.equals(imp.spanId)).be.ok();
        should(imp.sampled).be.type('boolean');
        should(imp.baggage).be.type('object');
    });

    it('should return current span in concurrent request', () => {
        function request(param) {
            return new Promise(resolve => {
                debug('request start', param, ns);
                resolve(param);
            });
        }
        function preHandler(param) {
            return new Promise(resolve => {
                ns.run(() => {
                    debug('preHandler start', param, ns);
                    let span = _2.default.startSpan({ operationName: OPERATION_NAME });
                    span.log({
                        event: 'param',
                        payload: param
                    });
                    debug('preHandler end', param, ns);
                    resolve(param);
                });
            });
        }
        function postHandler(param) {
            return new Promise(resolve => {
                debug('postHandler start', param, ns);
                let span = _2.default.getCurrentSpan();
                let imp = span.imp();
                span.finish();
                debug('postHandler end', param, ns);
                resolve([imp.logs[0].payload, param]);
            });
        }
        function procedure(param, timeouts) {
            return request(param).then(delay(timeouts[0])).then(preHandler).then(delay(timeouts[1])).then(postHandler).then(_ref => {
                var _ref2 = _slicedToArray(_ref, 2);

                let actual = _ref2[0];
                let expected = _ref2[1];

                debug('request end', expected, ns);
                should(actual).eql(expected);
            });
        }
        function delay(timeout) {
            return param => {
                return new Promise(resolve => {
                    debug('delay start', param, ns);
                    setTimeout(() => {
                        debug('delay end', param, ns);
                        resolve(param);
                    }, timeout);
                });
            };
        }

        // 1. First request create span at 10ms
        // 2. Second request create span at 15ms
        // 3. First request get current span at 20ms
        // 4. Second request get current span at 25ms
        // If thread local storage doesn't works, step 3 will get another
        // request's span.
        return Promise.all([procedure('AAA', [10, 10]), procedure('BBB', [15, 10])]);
    });

    it('should inject context into carrier', () => {
        let parentSpan = _2.default.startSpan({ operationName: OPERATION_NAME });
        let carrier = {};
        _2.default.inject(parentSpan, _2.default.FORMAT_TEXT_MAP, carrier);
        should(Object.keys(carrier).length).eql(3);
    });

    it('should join receving span', () => {
        // inject
        let parentSpan = _2.default.startSpan({ operationName: OPERATION_NAME });
        let carrier = { key: 'value' };
        _2.default.inject(parentSpan, _2.default.FORMAT_TEXT_MAP, carrier);

        // join
        let span = _2.default.join(ANOTHER_OPERATION_NAME, _2.default.FORMAT_TEXT_MAP, carrier);

        let parentImp = parentSpan.imp();
        let imp = span.imp();
        should(imp.traceId.equals(parentImp.traceId)).be.ok();
        should(imp.spanId.equals(parentImp.spanId)).be.not.ok();
        should(imp.parentId.equals(parentImp.spanId)).be.ok();
        should(imp.sampled).eql(parentImp.sampled);
        should(imp.baggage).eql(parentImp.baggage);
    });

    it('should able to in process span creation', () => {
        let parentSpan = _2.default.startSpan({ operationName: OPERATION_NAME });
        let span = _2.default.startSpan({
            operationName: ANOTHER_OPERATION_NAME,
            parent: parentSpan
        });
        let parentImp = parentSpan.imp();
        let imp = span.imp();
        should(imp.traceId.equals(parentImp.traceId)).be.ok();
        should(imp.spanId.equals(parentImp.spanId)).not.be.ok();
        should(imp.parentId.equals(parentImp.spanId)).be.ok();
        should(imp.sampled).eql(parentImp.sampled);
        should(imp.baggage).be.type('object');
    });
});