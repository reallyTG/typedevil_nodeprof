// do not remove the following comment
// JALANGI DO NOT INSTRUMENT
(function (sandbox) {
    function ChainedAnalyses() {
        function clientAnalysisException(e) {
            console.error("analysis exception!!!");
            console.error(e.stack);
            if (typeof process !== 'undefined' && process.exit) {
                process.exit(1);
            } else {
                throw e;
            }
        }
        var funList = ["_return", "_throw", "_with",
                       "binaryPre", "binary", "conditional",
                       "declare", "endExecution", "endExpression",
                       "forinObject", "functionEnter", "functionExit",
                       "getFieldPre", "getField", "instrumentCodePre",
                       "instrumentCode", "invokeFunPre", "invokeFun",
                       "literal", "onReady","putFieldPre",
                       "putField", "read", "runInstrumentedFunctionBody",
                       "scriptEnter", "scriptExit",  "unaryPre",
                       "unary", "write"];
        this.globals = {};
        this.addAnalysis = function (analysis) {
            for (let fun of funList) {
                let impl = analysis[fun];
                if (impl) {
                    if (!this[fun]) {
                        this[fun + "_impls"] = [];
                        this[fun] =
                            this.createWrapperCallback(this[fun + "_impls"]);
                    }
                    this[fun + "_impls"].push((...args) => impl.apply(analysis, args));
                }
            }

            console.log("functionEnter implementations:");
            let functionEnterImpls = this["functionEnter_impls"];
            if (functionEnterImpls) {
                functionEnterImpls.forEach((i) => console.log(`- ${i}`));
            }
        };
        this.createWrapperCallback = function(impls) {
            return function(...args) {
                for (let impl of impls) {
                    console.log(`in ChainedAnalyses: invoking callback: ${impl}`);
                    impl();
                }
            };
        };
    }
    var thisAnalysis = new ChainedAnalyses();
    Object.defineProperty(sandbox, 'analysis', {
        get:function () {
            return thisAnalysis;
        },
        set:function (a) {
            thisAnalysis.addAnalysis(a);
        }
    });
    if (sandbox.Constants.isBrowser) {
        window.addEventListener('keydown', function (e) {
            // keyboard shortcut is Alt-Shift-T for now
            if (e.altKey && e.shiftKey && e.keyCode === 84) {
                sandbox.analysis.endExecution();
            }
        });
    }
}(J$));