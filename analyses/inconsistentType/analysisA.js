// DO NOT INSTRUMENT
(function (sandbox) { function MyAnalysis() {

        this.invokeFunPre = function () {
            console.log("invokeFunPre in analysis A");
        };
        this.invokeFun = function () {
            console.log("invokeFun in analysis A");
        };
    }

    sandbox.analysis = new MyAnalysis();

    console.log("initializing analysis A");
})(J$);
