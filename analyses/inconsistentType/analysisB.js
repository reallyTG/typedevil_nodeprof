// DO NOT INSTRUMENT
(function (sandbox) { function MyAnalysis() {
    
        this.invokeFunPre = function () {
            console.log("invokeFunPre in analysis B");
        };
        this.invokeFun = function () {
            console.log("invokeFun in analysis B");
        };
    }

    sandbox.analysis = new MyAnalysis();

    console.log("initializing analysis B");
})(J$);
