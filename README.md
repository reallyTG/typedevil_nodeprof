
# TypeDevil-on-NodeProf

This is a working implementation of the TypeDevil dynamic analysis by Pradel et al. [1] working on NodeProf, the GraalJS dynamic analysis framework by Sun et al. [2].

## Usage

For convenience, NodeProf is wrapped in a Docker image, so you'll need to install Docker.

To build the image: from the repo directory, run `./docker-build`, and wait a while. This will set up a `nodeprof` docker image in your machine.

You don't need to be in a Docker instance to run the analysis. Instead, we have included two runner scripts which spin up the image, analyze a file, and report results, without you needing to interact with the image.

To analyze a single file, run: `./typedevil-docker-run.sh <name-of-file>.js`. For example, `./typedevil-docker-run.sh inconsistent_frame.js`. You can find 100 example programs in `/path/to/repo/programs`.

To run the test suite provided by the original TypeDevil authors, run: `./typedevil-tests-run.sh`. Currently, there are 18 failing tests: 5 do not execute, and there are 2 false positives and 11 false negatives. For comparison, TypeDevil (link to repo) has 14 failings tests: 5 do not execute, and there 3 false positives and 6 false negatives.

## Misc

The analysis files are available for your perusal in `/path/to/repo/analyses/inconsistentType`.

## Future Work

We plan to improve upon TypeDevil-on-NodeProf in a few ways, outlined in the report linked below.

The first order of business will be configuring the Docker image with the prerequisites to run more of the original TypeDevil functionality.

**Link to progress report:** *https://docs.google.com/document/d/152JLIvyva_3SU87qXn125YVgKGIZJdRYSdccNWwvK7c/edit?usp=sharing*

### References

**[1]** Michael Pradel, Parker Schuh, and Koushik Sen. 2015. TypeDevil: dynamic type inconsistency analysis for JavaScript. ICSE '15, Vol. 1. IEEE Press, Piscataway, NJ, USA, 314-324. https://dl.acm.org/citation.cfm?id=2818754.2818795


**[1-Artifact]** https://github.com/Berkeley-Correctness-Group/Jalangi-Berkeley/tree/master/src/js/analyses/inconsistentType

**[2]** Haiyang Sun, Daniele Bonetta, Christian Humer, and Walter Binder. 2018. Efficient dynamic analysis for Node.js. CC 2018. ACM, New York, NY, USA, 196-206. https://dl.acm.org/citation.cfm?id=3179527

**[2-Artifact]** https://github.com/Haiyang-Sun/nodeprof.js

