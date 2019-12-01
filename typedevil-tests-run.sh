#!/bin/bash

# --analysis /root/analysis/ChainedAnalyses.js --analysis /root/analysis/SMemory.js --analysis /root/analysis/InconsistentTypeEngine.js
#docker run --rm -v /Users/Alexi/Documents/Projects/docker-nodeprof/programs:/root/program \
#  -v /Users/Alexi/Documents/Projects/docker-nodeprof/inconsistentType:/root/analysis \
#  nodeprof bash -c "(cd /root/program; /root/mx/mx -p /root/nodeprof/ jalangi --analysis /root/analysis/ChainedAnalyses.js --analysis /root/analysis/SMemory.js --analysis /root/analysis/InconsistentTypeEngine.js /root/program/inconsistent_frame.js)"


docker run --rm -v $PWD/programs:/root/program \
  -v $PWD/analyses/inconsistentType:/root/analysis \
  nodeprof bash -c "(cd /root/program; /root/mx/mx -p /root/nodeprof/ jalangi /root/analysis/runAllTests.js)"
