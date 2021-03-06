define(function () { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    var RESPONSE_TYPE_JSON = 'json';
    var RESPONSE_TYPE_TEXT = 'text';

    var defaults = {
        // url prefix
        baseURL: '/',
        // request headers
        headers: {
            'Content-Type': 'application/json'
        },
        // request server url
        url: '/',
        // mode: default: null, 'debounce', 'throttle'
        mode: null,
        // count of auto retry bad request
        retryLimit: 0,
        // buffer of retry with bad request
        retryBuffer: 3000,
        // action when mode is 'debounce'
        debounceTime: 300,
        // action when mode is 'throttle'
        throttleTime: 3000,
        // auto force send cookie auth to server
        // default false
        withCredentials: false,
        // request time out cancel: callback to catch function
        timeout: 0,
        // responseType
        responseType: RESPONSE_TYPE_JSON
    };

    var matchType = function (variable, type) {
        return typeof variable === type;
    };
    var matchInstance = function (variable, instance) {
        return variable instanceof instance;
    };
    /**
     * @desc only check base type of javascript if exist in array
     * @param variable: target for checking
     * @param collection: source for checking
     * */
    var containedInArr = function (variable, collection) {
        if (!collection || !Array.isArray(collection))
            return false;
        return collection.indexOf(variable) !== -1;
    };

    var TYPE_OBJECT = 'object';
    var TYPE_ARRAY = 'array';

    var mergeConfig = function (defaults, opts) {
        if (!matchType(opts, TYPE_OBJECT))
            return defaults;
        return __assign({}, defaults, opts, { 
            //deep merge
            headers: __assign({}, defaults.headers, opts.headers) });
    };

    var GET_FLAG = 'get';
    var HEAD_FLAG = 'head';
    var OPTIONS_FLAG = 'options';
    var PUT_FLAG = 'put';
    var PATCH_FLAG = 'patch';
    var DELETE_FLAG = 'delete';
    var POST_FLAG = 'post';

    var transferResponseData = function (xhr) {
        switch (xhr.responseType) {
            case RESPONSE_TYPE_TEXT:
                return xhr.response;
            default:
                return matchType(xhr.response, TYPE_OBJECT)
                    ? xhr.response
                    : JSON.parse(xhr.response);
        }
    };

    var HResponse = /** @class */ (function () {
        function HResponse(completedXhr, requestInstance, responseHeader) {
            if (responseHeader === void 0) { responseHeader = {}; }
            this.status = completedXhr.status;
            this.statusText = completedXhr.statusText;
            this.headers = __assign({}, responseHeader);
            this.config = __assign({}, requestInstance.config);
            this.data = transferResponseData(completedXhr);
            this.request = requestInstance;
        }
        /**
         * @desc start of success callback
         * */
        HResponse.prototype.completeWithFulfilled = function () {
            this.request.success(this);
        };
        /**
         * @desc start of failed callback
         * */
        HResponse.prototype.completeWithFailed = function () {
            this.request.failed(this);
        };
        return HResponse;
    }());

    var STATE_DONE = 4;

    var throwIf = function (condition, msg) {
        if (condition)
            throw new Error("[Error]: " + msg + " !");
    };
    var warnIf = function (condition, msg) {
        if (condition)
            window.console.warn("[Warning]: " + msg + " .");
    };

    var EMPTY = '';
    var EQUAL_MARK = '=';
    var QUESTION_MARK = '?';
    var AND_MARK = '&';
    var SINGE_SLASH = '/';
    var ALL = '*';
    var END_SLASH = /\/+$/;
    var HEAD_SLASH = /^\/+/;
    var ABSOLUTE_PATH = /^([a-z]+:\/\/|\/\/)/;
    var RESP_SUCCESS_CODE_PREFIX = /^[23]/;
    var CACHE_FOREVER = -1;

    /**
     * @desc check url if has matched strategy rule, only the first rule is valid
     * @param rules
     * @param url
     * */
    var findMatchStrategy = function (rules, url) {
        var matchedRule = null;
        if (Array.isArray(rules)) {
            // return the first matched rule
            rules.some(function (rule) {
                var validStrategy = matchType(rule, TYPE_OBJECT);
                // just warn without block request flow
                warnIf(!validStrategy, "invalid param storeStrategy, expect [" + TYPE_OBJECT + "] | [" + TYPE_ARRAY + "] but got " + typeof rule);
                if (validStrategy && matchRule(rule, url)) {
                    matchedRule = rule;
                    return true;
                }
            });
        }
        else {
            var validStrategy = matchType(rules, TYPE_OBJECT);
            // just warn without block request flow
            warnIf(!validStrategy, "invalid param storeStrategy, expect [" + TYPE_OBJECT + "] | [" + TYPE_ARRAY + "] but got " + typeof rules);
            if (validStrategy && matchRule(rules, url))
                matchedRule = rules;
        }
        return matchedRule;
    };
    var matchRule = function (rule, url) {
        return (rule.urlExp === url || // rule.urlExp match url
            rule.urlExp === ALL || // rule.urlExp is "*" (all contains)
            ( // rule.urlExp is instance of RegExp, test url with it
            matchInstance(rule.urlExp, RegExp) &&
                rule.urlExp.test(url)));
    };

    var urlFormat = function (baseURL, relativeUrl, params) {
        if (baseURL === void 0) { baseURL = SINGE_SLASH; }
        var url;
        if (isAbsolute(relativeUrl)) {
            url = relativeUrl;
        }
        else {
            url = relativeUrl
                ? baseURL.replace(END_SLASH, EMPTY) + SINGE_SLASH + relativeUrl.replace(HEAD_SLASH, EMPTY)
                : baseURL.replace(END_SLASH, SINGE_SLASH);
        }
        return buildUrl(url, params);
    };
    var buildUrl = function (url, params) {
        if (params) {
            url.replace(END_SLASH, EMPTY);
            url += QUESTION_MARK;
            var paramsTarget = [];
            for (var k in params) {
                paramsTarget.push("" + k + EQUAL_MARK + params[k]);
            }
            url += paramsTarget.join(AND_MARK);
        }
        return url.replace(END_SLASH, EMPTY);
    };
    var isAbsolute = function (url) {
        return ABSOLUTE_PATH.test(url);
    };

    var HRequest = /** @class */ (function () {
        function HRequest(config) {
            // `_uuid`
            // "Universally Unique Identifier" for marking per request:
            this._uuid = ~~(Math.random() * 10e8);
            this.url = config.url;
            this.method = config.method;
            this.baseURL = config.baseURL;
            this.headers = config.headers;
            this.params = config.params;
            this.mode = config.mode;
            this.retryLimit = config.retryLimit;
            this.retryBuffer = config.retryBuffer;
            this.debounceTime = config.debounceTime;
            this.throttleTime = config.throttleTime;
            this.data = config.data;
            this.timeout = config.timeout;
            this.withCredentials = config.withCredentials;
            this.responseType = config.responseType;
            this.config = config;
            this.withRushStore = false;
        }
        /**
         * @desc emit success handler running
         * @param responseInstance
         * */
        HRequest.prototype.success = function (responseInstance) {
            this._onFulfilled && this._onFulfilled(responseInstance);
        };
        /**
         * @desc emit failed handler running
         * @param responseInstance
         * */
        HRequest.prototype.failed = function (responseInstance) {
            this._onFailed && this._onFailed(responseInstance);
        };
        /**
         * @desc collect fulfilled handler
         * @param onFulfilled
         * */
        HRequest.prototype.then = function (onFulfilled) {
            // will support multiple fulfilled handlers
            this._onFulfilled = onFulfilled;
            return this;
        };
        /**
         * @desc collect failed handler
         * @param onFailed
         * */
        HRequest.prototype.catch = function (onFailed) {
            this._onFailed = onFailed;
            return this;
        };
        /**
         * @desc abort the request to be sent and being sent
         *
         * what kind of request would be aborted is not in concurrentBuffer
         * and isn`t an cache request-leader, which is the request will emit
         * callbacks in concurrentBuffer after response
         * */
        HRequest.prototype.abort = function () {
            this.aborted = true;
            if (this.xhr) {
                var store = this.hajaxInstance.store[this.url];
                // abort directly if request is single action
                if (!store ||
                    (store && store.concurrentBuffer.length === 0))
                    this.xhr.abort();
            }
            // add abort callback ?
        };
        /**
         * @desc got uuid of request instance
         * @return _uuid
         * */
        HRequest.prototype.getUUID = function () {
            return this._uuid;
        };
        /**
         * @desc accept hajax instance for visiting
         * @param hajaxInstance
         * */
        HRequest.prototype.accept = function (hajaxInstance) {
            this.hajaxInstance = hajaxInstance;
        };
        /**
         * @desc prepare to send an ajax request with blow:
         * 1. check if has store strategy           | do request if not
         * 2. check if match store strategy         | do request if not
         * 3. check if has cache and not expire     | do request if not
         * 4. catch data from cache and response
         * */
        HRequest.prototype.send = function () {
            // abort before send
            if (this.aborted)
                return;
            this.fullURL = urlFormat(this.config.baseURL, this.config.url, this.config.params);
            // only request with get method could be cached
            // it might be put or others later
            if (this.method.toLowerCase() === GET_FLAG && this.hajaxInstance.storeStrategy) {
                var urlKey = this.fullURL;
                var rule = findMatchStrategy(this.hajaxInstance.storeStrategy, urlKey);
                if (rule) {
                    this.withRushStore = this.hajaxInstance.checkStoreExpired(urlKey);
                    this.hajaxInstance.storeWithRule(rule, this);
                }
                else {
                    this.sendAjax();
                }
            }
            else {
                this.sendAjax();
            }
        };
        /**
         * @desc XMLHttpRequest initial: use fetch?
         * @attention If you add other ajax drivers(fetch or ActiveXObject) later, you need to provide a facade here.
         * */
        HRequest.prototype.initXHR = function () {
            var _this = this;
            /*
            * // facade like blow:
            * const xhr = new XMLHttpRequest(); ======> const driver = initAjaxDriver(config) // do init with config
            * this.xhr = xhr ======> this.driver = driver
            * */
            var xhr = new XMLHttpRequest();
            xhr.open(this.config.method.toUpperCase(), this.fullURL);
            //headers
            for (var header in this.config.headers) {
                xhr.setRequestHeader(header, this.config.headers[header]);
            }
            //timeout
            xhr.timeout = this.config.timeout;
            //responseType
            xhr.responseType = this.config.responseType;
            //withCredentials
            xhr.withCredentials = this.config.withCredentials;
            //handle request complete async
            xhr.onreadystatechange = function () {
                if (xhr.readyState == STATE_DONE) {
                    // bad request do retry
                    if (!RESP_SUCCESS_CODE_PREFIX.test(xhr.status.toString()) &&
                        _this.retryLimit > 0) {
                        setTimeout(function () {
                            _this.sendAjax();
                            _this.retryLimit--;
                            // if xhr has already in 'hajax' store, just cover it with new xhr
                            if (_this.hajaxInstance.store[_this.fullURL] &&
                                _this.hajaxInstance.store[_this.fullURL].xhr === xhr)
                                _this.hajaxInstance.store[_this.fullURL].xhr = _this.xhr;
                        }, _this.retryBuffer);
                    }
                    else {
                        // Get the raw header string
                        var headers = xhr.getAllResponseHeaders();
                        // Convert the header string into an array
                        // of individual headers
                        var arr = headers.trim().split(/[\r\n]+/);
                        // Create a map of header names to values
                        var headerMap_1 = {};
                        arr.forEach(function (line) {
                            var parts = line.split(': ');
                            var header = parts.shift();
                            headerMap_1[header] = parts.join(': ');
                        });
                        _this.hajaxInstance._runResp(new HResponse(xhr, _this, headerMap_1));
                    }
                }
            };
            this.xhr = xhr;
            return xhr;
        };
        /**
         * @desc ajax real action
         * @attention If you add other ajax drivers(fetch or ActiveXObject) later, you need to provide a facade here.
         * */
        HRequest.prototype.sendAjax = function () {
            this.initXHR();
            this.xhr.send(JSON.stringify(this.data));
        };
        return HRequest;
    }());

    var Queue = /** @class */ (function () {
        function Queue() {
            this._queue = [];
        }
        Queue.prototype.enqueue = function (m) {
            this._queue.push(m);
        };
        Queue.prototype.unqueue = function () {
            return this._queue.shift();
        };
        Queue.prototype.hasItem = function () {
            return this._queue.length > 0;
        };
        return Queue;
    }());

    var DEBOUNCE = 'debounce';
    var THROTTLE = 'throttle';

    var Strategy = /** @class */ (function () {
        function Strategy(urlExp, bufferTime, autoRetry) {
            warnIf(!urlExp, 'url in store strategy is invalid');
            this.urlExp = urlExp;
            this.bufferTime = ~~bufferTime || CACHE_FOREVER;
            this.autoRetry = !!autoRetry;
        }
        return Strategy;
    }());

    var HAjax = /** @class */ (function () {
        function HAjax(opts) {
            if (opts === void 0) { opts = {}; }
            this.config = mergeConfig(defaults, opts);
            this.store = {};
            this.requestQueue = new Queue();
            this.responseQueue = new Queue();
            this.requestPool = {};
            this.debounceStore = {};
            this.throttleStore = {};
            this.storeStrategy = null;
            this._requestDealTarget = null;
        }
        /**
         * @desc entry of request, request enqueue
         * @param requestInstance
         * */
        HAjax.prototype._runReq = function (requestInstance) {
            var _this = this;
            var requestAction = function () {
                // inject hajax driver into request instance and start real request flow
                requestInstance.accept(_this);
                _this.requestQueue.enqueue(requestInstance);
                _this._emitRequestFlow();
            };
            var mode = requestInstance.mode, url = requestInstance.url, debounceTime = requestInstance.debounceTime, throttleTime = requestInstance.throttleTime;
            // request with three type of ways: normal, debounce, throttle
            switch (mode) {
                case DEBOUNCE:
                    if (!this.debounceStore[url])
                        this.debounceStore[url] = {
                            timer: null
                        };
                    var debounce_1 = this.debounceStore[url];
                    if (debounce_1.timer)
                        clearTimeout(debounce_1.timer);
                    debounce_1.timer = setTimeout(function () {
                        requestAction();
                        clearTimeout(debounce_1.timer);
                    }, debounceTime);
                    break;
                case THROTTLE:
                    if (!this.throttleStore[url])
                        this.throttleStore[url] = {
                            ban: false
                        };
                    var throttle_1 = this.throttleStore[url];
                    if (!throttle_1.ban) {
                        throttle_1.ban = true;
                        setTimeout(function () {
                            throttle_1.ban = false;
                        }, throttleTime);
                        requestAction();
                    }
                    break;
                default:
                    requestAction();
            }
        };
        /**
         * @desc check and unqueue request into request pool
         * */
        HAjax.prototype._emitRequestFlow = function () {
            if (!this._requestDealTarget && this.requestQueue.hasItem()) {
                this._requestDealTarget = this.requestQueue.unqueue();
                if (this.requestInterceptor)
                    this.requestInterceptor(this._requestDealTarget.config);
                this._pushToRequestPool(this._requestDealTarget);
            }
        };
        /**
         * @desc entry of response, response enqueue
         * @param responseInstance
         * */
        HAjax.prototype._runResp = function (responseInstance) {
            if (!responseInstance.request.aborted) {
                this.responseQueue.enqueue(responseInstance);
                this._emitResponseFlow();
            }
            var urlKey = responseInstance.request.fullURL;
            if (responseInstance.request.withRushStore &&
                responseInstance.request.xhr === this.store[urlKey].xhr) {
                var cache = this.store[urlKey];
                cache.hasCache = true;
                cache.responseHeaders = responseInstance.headers;
                while (cache.concurrentBuffer.length > 0) {
                    var req = cache.concurrentBuffer.shift();
                    !req.aborted && this._runResp(new HResponse(cache.xhr, req, responseInstance.headers));
                }
            }
        };
        /**
         * @desc check and unqueue response into request pool
         * */
        HAjax.prototype._emitResponseFlow = function () {
            if (!this._responseDealTarget && this.responseQueue.hasItem()) {
                this._responseDealTarget = this.responseQueue.unqueue();
                if (this.responseInterceptor)
                    this.responseInterceptor(this._responseDealTarget);
                this._handleComplete(this._responseDealTarget);
            }
        };
        /**
         * @desc deal with complete response instance and emit callback
         * @param responseInstance
         * */
        HAjax.prototype._handleComplete = function (responseInstance) {
            this._responseDealTarget = null;
            delete this.requestPool[responseInstance.request.getUUID()];
            this._emitResponseFlow();
            if (RESP_SUCCESS_CODE_PREFIX.test(responseInstance.status.toString())) {
                responseInstance.completeWithFulfilled();
            }
            else {
                responseInstance.completeWithFailed();
            }
        };
        /**
         * Reserved field
         * @desc just a collection of request which on sending
         * @param requestInstance
         * */
        HAjax.prototype._pushToRequestPool = function (requestInstance) {
            this.requestPool[requestInstance.getUUID()] = requestInstance;
            this._requestDealTarget = null;
            requestInstance.send();
            this._emitRequestFlow();
        };
        /**
         * @desc Determine if the cache policy is matched and determine the form of the request (Ajax or Cache)
         * @param rule
         * @param requestInstance
         * */
        HAjax.prototype.storeWithRule = function (rule, requestInstance) {
            var _this = this;
            var cache = this.store[requestInstance.fullURL];
            var runRespWithStore = function () {
                _this._runResp(new HResponse(cache.xhr, requestInstance, cache.responseHeaders));
            };
            // Turn on an actual request if there is no cache or the request needs to flush the cache
            // If the first request is being requested and the cache time exceeds expires at this time
            // the next request will overwrite the data being cached at this time and the new data
            // will be used to trigger the callback handler of the request instance in concurrentBuffer
            // which may be Producing bugs what is the callback in concurrentBuffer action delay or not work
            // strategies for this extreme situation remain to be considered
            // When you encounter this situation, you can set the bufferTime longer
            // or disable store strategy for the trouble url
            if (!cache || requestInstance.withRushStore)
                return this.rushRequest(rule, requestInstance);
            cache.concurrentBuffer.push(requestInstance);
            // xhr retry patch
            cache.autoRetry && (cache.requestInstance.retryLimit += 1);
            if (cache.hasCache) {
                if (cache.bufferTime && cache.bufferTime !== CACHE_FOREVER) {
                    if (new Date().getTime() <= cache.expires)
                        runRespWithStore();
                }
                else {
                    runRespWithStore();
                }
            }
        };
        HAjax.prototype.rushRequest = function (rule, requestInstance) {
            requestInstance.sendAjax();
            this.rushStore(requestInstance, requestInstance.fullURL, requestInstance.xhr, rule.bufferTime, rule.autoRetry);
        };
        /**
         * @desc check store if match rush strategy
         * @param url
         * */
        HAjax.prototype.checkStoreExpired = function (url) {
            if (!this.store[url])
                return true;
            if (!this.store[url].bufferTime)
                return true;
            if (this.store[url].bufferTime) {
                return (new Date().getTime() > this.store[url].expires &&
                    this.store[url].bufferTime !== CACHE_FOREVER);
            }
        };
        /**
         * @desc init or rush old store
         * @param requestInstance
         * @param key: request fullpath
         * @param xhr
         * @param bufferTime
         * @param autoRetry
         * */
        HAjax.prototype.rushStore = function (requestInstance, key, xhr, bufferTime, autoRetry) {
            if (!this.store[key]) {
                this.store[key] = {
                    hasCache: false,
                    concurrentBuffer: [],
                    expires: new Date().getTime() + bufferTime,
                    responseHeaders: {},
                    xhr: xhr,
                    bufferTime: bufferTime,
                    requestInstance: requestInstance,
                    autoRetry: autoRetry
                };
            }
            else {
                this.store[key] = __assign({}, this.store[key], { expires: new Date().getTime() + bufferTime, xhr: xhr,
                    autoRetry: autoRetry
                    // bufferTime: bufferTime,          // if need rush bufferTime for user update ?
                 });
            }
        };
        // ---------------------- global api recommended to users ----------------------
        /**
         * @desc interceptor before request send
         * @param interceptor
         * */
        HAjax.prototype.setRequestInterceptor = function (interceptor) {
            this.requestInterceptor = interceptor;
        };
        /**
         * @desc interceptor after response and before callback emitted
         * @param interceptor
         * */
        HAjax.prototype.setResponseInterceptor = function (interceptor) {
            this.responseInterceptor = interceptor;
        };
        /**
         * @desc global request api
         * @param opts
         * */
        HAjax.prototype.request = function (opts) {
            var _this = this;
            // check if match debounce or throttle strategies
            throwIf(!matchType(opts, TYPE_OBJECT), "request options type except to be [" + TYPE_OBJECT + "] but got [" + typeof opts + "]");
            var options = mergeConfig(this.config, opts);
            // validate request mode and fix
            var mode = options.mode;
            if (mode) {
                var modeIsValid = containedInArr(mode, [DEBOUNCE, THROTTLE]);
                warnIf(!modeIsValid, "mode [" + mode + "\"] is invalid, it support to be \"" + DEBOUNCE + "\" or \"" + THROTTLE + "\"");
                if (!modeIsValid)
                    delete options.mode;
            }
            var request = new HRequest(options);
            setTimeout(function () {
                _this._runReq(request);
            });
            return request;
        };
        /**
         * @desc request alias: "get", "head", "options", "post", "put", "patch", "delete"
         * */
        HAjax.prototype.get = function (url, opts) {
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url, method: GET_FLAG }));
        };
        HAjax.prototype.head = function (url, opts) {
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url, method: HEAD_FLAG }));
        };
        HAjax.prototype.options = function (url, opts) {
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url, method: OPTIONS_FLAG }));
        };
        HAjax.prototype.post = function (url, data, opts) {
            if (data === void 0) { data = {}; }
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url,
                data: data, method: POST_FLAG }));
        };
        HAjax.prototype.put = function (url, data, opts) {
            if (data === void 0) { data = {}; }
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url,
                data: data, method: PUT_FLAG }));
        };
        HAjax.prototype.patch = function (url, data, opts) {
            if (data === void 0) { data = {}; }
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url,
                data: data, method: PATCH_FLAG }));
        };
        HAjax.prototype.delete = function (url, data, opts) {
            if (data === void 0) { data = {}; }
            if (opts === void 0) { opts = {}; }
            return this.request(__assign({}, opts, { url: url,
                data: data, method: DELETE_FLAG }));
        };
        HAjax.prototype.create = function (opts) {
            return new HAjax(opts);
        };
        /**
         * @desc facade for promise.all
         * @param promises: Array<Promise>
         * */
        HAjax.prototype.all = function (promises) {
            return Promise.all(promises);
        };
        /**
         * @desc facade for promise.race
         * @param promises: Array<Promise>
         * */
        HAjax.prototype.race = function (promises) {
            return Promise.race(promises);
        };
        /**
         * @desc validate strategy param if valid
         * @param urlExp
         * @param bufferTime: the cache would be force used if bufferTime is -1 (default)
         * @param autoRetry
         * */
        HAjax.prototype.createStrategy = function (urlExp, bufferTime, autoRetry) {
            if (autoRetry === void 0) { autoRetry = true; }
            return new Strategy(urlExp, bufferTime, autoRetry);
        };
        /**
         * @desc set new store strategy for driver, which could cover the old strategy
         * @param strategy
         * */
        HAjax.prototype.setStrategy = function (strategy) {
            this.storeStrategy = strategy;
        };
        /**
         * @desc clear data in store by hand
         * @param exp: valid value is "string", "Regexp", "*"
         * */
        HAjax.prototype.clearStore = function (exp) {
            if (!exp) {
                // callbacks would not work if clear with follow
                // strategies for concurrentBuffer when clear action is remain to be considered
                this.storeStrategy = null;
            }
            else {
                if (Array.isArray(this.storeStrategy)) {
                    this.storeStrategy = this.storeStrategy.filter(function (strategy) {
                        return strategy.urlExp !== exp;
                    });
                }
                else if (this.storeStrategy.urlExp === exp) {
                    this.storeStrategy = null;
                }
            }
        };
        return HAjax;
    }());

    var index = new HAjax();

    return index;

});
