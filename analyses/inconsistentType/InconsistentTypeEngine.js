/*
 * Copyright 2013-2014 Samsung Information Systems America, Inc.
 *                2014 University of California, Berkeley
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Koushik Sen, Michael Pradel

// JALANGI DO NOT INSTRUMENT

(function(sandbox) {

    // Implementation of shadow memory from Jalangi
    function SMemory () {
        var Constants = sandbox.Constants;

        var SPECIAL_PROP = Constants.SPECIAL_PROP + "M";
        var SPECIAL_PROP2 = Constants.SPECIAL_PROP2 + "M";
        var SPECIAL_PROP3 = Constants.SPECIAL_PROP3 + "M";
        var N_LOG_FUNCTION_LIT = Constants.N_LOG_FUNCTION_LIT;
        var objectId = 1;
        var frameId = 2;
        var scriptCount = 0;
        var HOP = Constants.HOP;


        var frame = Object.create(null);

        var frameStack = [frame];
        var evalFrames = [];

        var nameStack = [];

        function createShadowObject(val) {
            var type = typeof val;
            if ((type === 'object' || type === 'function') && val !== null && !HOP(val, SPECIAL_PROP)) {
                if (Object && Object.defineProperty && typeof Object.defineProperty === 'function') {
                    Object.defineProperty(val, SPECIAL_PROP, {
                        enumerable:false,
                        writable:true
                    });
                }
                try {
                    val[SPECIAL_PROP] = Object.create(null);
                    val[SPECIAL_PROP][SPECIAL_PROP] = objectId;
                    objectId = objectId + 2;
                } catch (e) {
                    // cannot attach special field in some DOM Objects.  So ignore them.
                }
            }

        }

        this.getShadowObject = function (val) {
            var value;
            createShadowObject(val);
            var type = typeof val;
            if ((type === 'object' || type === 'function') && val !== null && HOP(val, SPECIAL_PROP)) {
                value = val[SPECIAL_PROP];
            } else {
                value = undefined;
            }
            return value;
        };

        this.getFrame = function (name) {
            var tmp = frame;
            while (tmp && !HOP(tmp, name)) {
                tmp = tmp[SPECIAL_PROP3];
            }
            if (tmp) {
                return tmp;
            } else {
                return frameStack[0]; // return global scope
            }
        };

        this.getParentFrame = function (otherFrame) {
            if (otherFrame) {
                return otherFrame[SPECIAL_PROP3];
            } else {
                return null;
            }
        };

        this.getCurrentFrame = function () {
            return frame;
        };

        this.getClosureFrame = function (fun) {
            return fun[SPECIAL_PROP3];
        };

        this.getShadowObjectID = function (obj) {
            return obj[SPECIAL_PROP];
        };

        this.defineFunction = function (val, type) {
            if (type === N_LOG_FUNCTION_LIT) {
                if (Object && Object.defineProperty && typeof Object.defineProperty === 'function') {
                    Object.defineProperty(val, SPECIAL_PROP3, {
                        enumerable:false,
                        writable:true
                    });
                }
                val[SPECIAL_PROP3] = frame;
            }
        };

        this.evalBegin = function () {
            evalFrames.push(frame);
            frame = frameStack[0];
        };

        this.evalEnd = function () {
            frame = evalFrames.pop();
        };

        this.initialize = function (name) {
            frame[name] = undefined;
        };

        this.initialize_all = function() {
            while(nameStack.length > 0) {
                frame[nameStack.shift()] = undefined;
            }
        }

        this.initialize_pre = function (name) {
            nameStack.push(name);
        };

        this.functionEnter = function (val) {
            frameStack.push(frame = Object.create(null));
            if (Object && Object.defineProperty && typeof Object.defineProperty === 'function') {
                Object.defineProperty(frame, SPECIAL_PROP3, {
                    enumerable:false,
                    writable:true
                });
            }
            frame[SPECIAL_PROP3] = val[SPECIAL_PROP3];
        };

        this.functionReturn = function () {
            frameStack.pop();
            frame = frameStack[frameStack.length - 1];
        };

        this.scriptEnter = function () {
            scriptCount++;
            if (scriptCount>1) {
                frameStack.push(frame = Object.create(null));
                frame[SPECIAL_PROP3] = frameStack[0];
            }
        };

        this.scriptReturn = function () {
            if (scriptCount>1) {
                frameStack.pop();
                frame = frameStack[frameStack.length - 1];
            }
            scriptCount--;
        };

    };


    function InconsistentTypeEngine() {
        var online = true;  // set to 'true' to search for inconsistencies right after the end of the execution
                             //    (recommended for small examples)
                             // set to 'false' to run online and offline analysis separately
                             //    (recommended for larger programs)

        var smemory = sandbox.smemory;
        var iidToLocation = sandbox.iidToLocation;
        var typeAnalysis = importModule("TypeAnalysis");
        var util = importModule("CommonUtil");
        var callGraph = importModule("CallGraph");
        var beliefPrefix = "ITA_Belief: ";
        var beliefInfix = " has type ";
        var printWarnings = true;
        var visualizeAllTypes = false; // only for node.js execution (i.e., not in browser)
        var visualizeWarningTypes = sandbox.Constants.isBrowser ? false : true; // only for node.js execution (i.e., not in browser)
        var considerNativeFunctions = false;

        // type/function name could be object(iid) | array(iid) | function(iid) | null | object | function | number | string | undefined | boolean
        var typeNameToFieldTypes = {}; // type or function name -> (field or this/return/argx -> type name -> iid -> true)  --  for each type/function, gives the fields, their types, and where this field type has been observed
        var typeNames = {};
        var frameToBeliefs = {}; // function name -> var name -> type -> true

        annotateGlobalFrame();

        var getSymbolic = this.getSymbolic = function(obj) {

            var sobj = smemory.getShadowObject(obj);
            if (sobj) {
                return sobj.shadow;
            } else {
                return undefined;
            }
        };

        /**
         * @param {object} map
         * @param {string} key
         * @returns {object} 
         */
        function getAndInit(map, key) {
            if (!util.HOP(map, key))
                return map[key] = {};
            else
                return map[key];
        }

        /**
         * @param {string} name
         * @param {function | object} obj
         */
        function addFunctionOrTypeName(name, obj) {
            if (name.indexOf("function") === 0) {
                typeNames[name] = obj.name ? obj.name : "";
            } else {
                typeNames[name] = obj.constructor ? obj.constructor.name : "";
            }
        }

        /**
         * @param {object} base
         * @param {string} offset
         * @param {object} value
         * @param {number} updateLocation (IID)
         * @param {string} typeNameOptional
         */
        function updateType(base, offset, value, updateLocation, typeNameOptional) {
            var typeName, tval, type, s;
            if (!typeNameOptional) {
                typeName = getSymbolic(base);
            } else {
                typeName = typeNameOptional;
            }

            if (typeName) {
                addFunctionOrTypeName(typeName, base);
                tval = getAndInit(typeNameToFieldTypes, typeName);
                type = typeof value;
                s = getSymbolic(value);
                if (s) {
                    type = s;
                } else if (value === null) {
                    type = "null";
                }
                if (typeName.indexOf("array") === 0) {
                    if (offset > 10) {
                        offset = 100000;
                    }
                }
                var tmap = getAndInit(tval, offset);
                var locations = getAndInit(tmap, type);
                locations[updateLocation] = true;
            }
        }

        /**
         * Attach shadow with type name to object.
         * @param {number} creationLocation
         * @param {object} obj
         * @param {string} optionalTypeName
         * @returns {object} The given object
         */
        function annotateObject(creationLocation, obj, optionalTypeName) {
            var type, i, s, sobj;

            var sobj = smemory.getShadowObject(obj);

            if (sobj) {
                if (sobj.shadow === undefined) {
                    type = typeof obj;
                    if ((type === "object" || type === "function") && obj !== null && obj.name !== "eval") {
                        if (Array.isArray(obj)) {
                            type = "array";
                        }
                        if (optionalTypeName) {
                            type = optionalTypeName;
                        }
                        s = type + "(" + creationLocation + ")";
                        sobj.shadow = s;
                        addFunctionOrTypeName(s, obj);
                        getAndInit(typeNameToFieldTypes, s);
                        for (i in obj) {
                            if (util.HOP(obj, i)) {
                                updateType(obj, i, obj[i], creationLocation, s);
                            }
                        }
                    }
                }
            }
            return obj;
        }

        function annotateGlobalFrame() {
            var f = smemory.getCurrentFrame();

            while (smemory.getParentFrame(f) !== undefined) {
                f = smemory.getParentFrame(f);
            }

            annotateObject(undefined, f, "global scope");
        }

        function setTypeInFunSignature(value, tval, offset, callLocation) {
            var type, typeName;
            type = typeof value;
            typeName = getSymbolic(value);
            if (typeName) {
                type = typeName;
            } else if (value === null) {
                type = "null";
            }
            var tmap = getAndInit(tval, offset);
            var locations = getAndInit(tmap, type);
            locations[callLocation] = true;
        }

        /**
         * @param {function} f
         * @param {object} base
         * @param {array} args
         * @param {type} returnValue
         * @param {number} callLocation (IID)
         */
        function updateSignature(f, base, args, returnValue, callLocation) {
            var functionName, tval;
            functionName = getSymbolic(f);
            if (considerNativeFunctions && !functionName && Function.prototype.toString.call(f).indexOf("[native code]") !== -1 && f.name) {
                functionName = "native function " + f.name; // optimistically identify native fcts by their name (may lead to collisions)
            }
            if (functionName) {
                addFunctionOrTypeName(functionName, f);
                tval = getAndInit(typeNameToFieldTypes, functionName);
                setTypeInFunSignature(returnValue, tval, "return", callLocation);
                setTypeInFunSignature(base, tval, "this", callLocation);
            }
        }

        function updateBeliefs(frame, varName, type) {
            var sframe = smemory.getShadowObject(frame);
            if (sframe && sframe.shadow) {
                var varToTypes = getAndInit(frameToBeliefs, sframe.shadow);
                var types = getAndInit(varToTypes, varName);
                types[type] = true;
            }
        }

        function logResults(results) {
            if (sandbox.Constants.isBrowser) {
                window.$jalangiFFLogResult(JSON.stringify(results), true);
            } else {
                var fs = require("fs");
                var benchmark = process.argv[1];
                var wrappedResults = [{url:benchmark, value:results}];
                var outFile = process.cwd() + "/analysisResults.json";
                fs.writeFileSync(outFile, JSON.stringify(wrappedResults));
            }
        }

        this.invokeFunPre = function(iid, f, base, args, isConstructor) {
            callGraph.prepareBind(smemory, f, getSymbolic(f));

        };

        this.functionEnter = function(iid, fun, dis /* this */) {

            // SMemory component
            smemory.functionEnter(fun);
            smemory.initialize_all();
            smemory.initialize('this');

            // InconsistentType analysis component
            annotateObject(iid, smemory.getCurrentFrame(), "frame");
            callGraph.fEnter(smemory);
        };

        this.invokeFun = function(iid, f, base, args, val, isConstructor) {

            // SMemory component
            smemory.functionReturn();

            // InconsistentType analysis component
            var ret;
            if (isConstructor) {
                ret = annotateObject(iid, val);
            } else {
                ret = val;
            }
            updateSignature(f, base, args, ret, iid);
            return ret;
        };

        this.functionExit = function(iid, fun, dis /* this */) {
            callGraph.fExit(smemory);
        };

        // /s/readPre/read
        this.read = function(iid, name, val, isGlobal) {
            if (name !== "this") {
                updateType(smemory.getFrame(name), name, val, iid);
            }
        };

        // /s/writePre/write
        this.write = function(iid, name, val, oldValue) {
            if (name !== "this") {
                updateType(smemory.getFrame(name), name, val, iid);
            }
        };

        this.literal = function(iid, val) {
            if (typeof val === "function")
                smemory.defineFunction(val);

            if (typeof val === "string" && val.indexOf(beliefPrefix) === 0) { // belief "annotation" produced by preprocessor
                var nameAndType = val.slice(beliefPrefix.length).split(beliefInfix);
                updateBeliefs(smemory.getFrame(nameAndType[0]), nameAndType[0], nameAndType[1]);
            } else {
                return annotateObject(iid, val);
            }
        };

        this.putFieldPre = function(iid, base, offset, val) {
            updateType(base, offset, val, iid);
            return val;
        };

        this.getField = function(iid, base, offset, val, isGlobal) {
            if (val !== undefined) {
                var provider = base; // the object/prototype that provides the field
                while (provider !== null && provider !== undefined &&
                      typeof provider === "object" && !util.HOP(provider, offset)) {
                    provider = Object.getPrototypeOf(provider);
                }
                updateType(provider, offset, val, iid);
            }
            return val;
        };

        this.endExecution = function() {
            smemory.scriptReturn();

            var results = {
                typeNameToFieldTypes:typeNameToFieldTypes,
                typeNames:typeNames,
                callGraph:callGraph.data,
                frameToBeliefs:frameToBeliefs
            };

            if (online) {

                // brute-force prune undefined
                for (subResult in results.typeNameToFieldTypes) {
                    for (subSubResult in results.typeNameToFieldTypes[subResult]) {
                        delete results.typeNameToFieldTypes[subResult][subSubResult]["undefined"];
                    }
                }

                typeAnalysis.analyzeTypes(results, iidToLocation, printWarnings, visualizeAllTypes, visualizeWarningTypes);
            } else {
                logResults(results);
            }
        };

        this.declare = function (iid, name, val, isArgument, argumentIndex, isCatchParam) {
            smemory.initialize_pre(name);
        };

        function importModule(moduleName) {
            if (sandbox.Constants.isBrowser) {
                return window['$' + moduleName];
            } else {
                return require('./' + moduleName + ".js");
            }
        }
    }

    console.log("= Inconsistent Type Analysis =");
    
    // initialize SMemory first
    var smemory = sandbox.smemory = new SMemory();
    smemory.scriptEnter("file.js", "ofile.js");

    sandbox.analysis = new InconsistentTypeEngine();

    if (sandbox.Constants.isBrowser) {
        window.addEventListener("beforeunload", function() {
            // console.log("beforeunload --> logging results");
            sandbox.analysis.endExecution();
        }, false);
    }


}(typeof J$ === 'undefined' ? (J$ = {}) : J$));