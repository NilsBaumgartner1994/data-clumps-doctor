<h1 align="center">
Data-Clumps-Doctor
</h1>

<p align="center">
    <img src="https://github.com/NilsBaumgartner1994/data-clumps-doctor/raw/master/assets/logo-animation.gif" alt="https://lottiefiles.com/animations/data-scanning-9P3AsKKZ59" style="height:200px;"/>
</p>

<h3 align="center">
Check your code for data clumps and refactor them
</h3>

## About

A library to parse files and folders to check for data clumps and refactor them.

## Dataset

We're excited to share our public [Data-Clumps Dataset](https://github.com/NilsBaumgartner1994/Data-Clumps-Dataset/) with you. We invite you to explore it and consider contributing to our growing repository. By uploading your analyzed data, you can help enrich our dataset and support the broader community in their software analysis endeavors. Together, we can enhance our understanding of data-clumps and their impact on software development.

## Reporting Format

In our endeavor to ensure precision and standardization in reporting data clumps, we utilize the following specification: [Data-Clumps-Type-Context](https://github.com/FireboltCasters/data-clumps-type-context/).

## Requirements

- The project to be analyzed can not have [Wildcard imports](https://stackoverflow.com/questions/147454/why-is-using-a-wild-card-with-a-java-import-statement-bad)
  - It will not break but the detector may generate false positives
  - Since a static source-code analysis is made, the detector does not know where the import comes exactly from
- Node Version 18.19.1 (test on this. Newer and older versions might also work)
- Java 19
  - openjdk version "19.0.1" 2022-10-18
  - OpenJDK Runtime Environment (build 19.0.1+10-21)
  - OpenJDK 64-Bit Server VM (build 19.0.1+10-21, mixed mode, sharing)
- Git needs to be installed

## Installation

```
cd data-clumps-doctor/analyse/src/ignoreCoverage/astGenerator && make build
```

```
cd data-clumps-doctor/analyse && npm ci && npm run build
```

--output /Users/nilsbaumgartner/Desktop/dataClumpsReportsUpdate/{project_name}/tags/{project_commit}.json

## Usage

```
cd data-clumps-doctor/analyse
node ./build/ignoreCoverage/cli.js <Path_to_your_project_to_analyse>
```

Example to analyse local project current:
```
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection current --path_to_project /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Desktop/argouml
```

Example to analyse git ArgoUML completely:
```
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/argouml-tigris-org/argouml
```

Example to analyse multiple git completely:
```
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/argouml-tigris-org/argouml && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/apache/dolphinscheduler && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/apache/rocketmq && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/apache/xerces2-j && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/nostra13/Android-Universal-Image-Loader && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/antlr/antlr4 && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/BroadleafCommerce/BroadleafCommerce && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/ben-manes/caffeine && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/eclipse-archived/ceylon-ide-eclipse && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/elastic/elasticsearch && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/hazelcast/hazelcast && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/jflex-de/jflex && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/jfree/jfreechart && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/junit-team/junit4 && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/junit-team/junit5 && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/jankotek/mapdb && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/mcMMO-Dev/mcMMO && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/neo4j/neo4j && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/netty/netty && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/orientechnologies/orientdb && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/OryxProject/oryx && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/spring-projects/spring-boot && \
node ./build/ignoreCoverage/cli.js --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --fast_detection true --git_project_url_to_analyse https://github.com/thinkaurelius/titan
```

### Commit Selection

All Git Tags
```
node ./build/ignoreCoverage/cli.js --git_project_url_to_analyse https://github.com/argouml-tigris-org/argouml --commit_selection tags --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/{project_name}/tags/{project_commit}.json
```

Specific commits
```
node ./build/ignoreCoverage/cli.js --git_project_url_to_analyse https://github.com/argouml-tigris-org/argouml --commit_selection be952fcfa77451e594a41779db83e1a0d7221002 --output /Users/nilsbaumgartner/Desktop/argoUml.json
```


All Commits
```
--commit_selection full
```

Current
```
--commit_selection current
```


### Example for Digital Twin Definition Language

Download an example project from GitHub:
```
https://github.com/XMPro/Wind-Power-Plant-Wind-Turbine-DTDL-Models/tree/main
```

Then run the following command:
```
npm run build && node ./build/ignoreCoverage/cli.js --preserve_ast_output true --output /Users/nilsbaumgartner/Desktop/dtdl.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --path_to_project /Users/nilsbaumgartner/Downloads/Wind-Power-Plant-Wind-Turbine-DTDL-Models-main/Wind\ Power\ Plant;
```


### Help

```
cd data-clumps-doctor/analyse
node ./build/ignoreCoverage/cli.js --help
```


### Analysis

#### Statistic Overview
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliCountTotalStatistics.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
```

#### Types
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Cluster Types
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsClusterTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Data Clumps Fan In
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpClassAndMethodFanIn.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### File Path Distance
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpFilePathDistance.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

### Variable Distance
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableDistance.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Variable Distribution to Types
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableAmount.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Most Common Variables
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseMostCommonDataClumpVariable.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Parameter Name Length
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpParameterNameLength.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Detection Time
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsAnalyseTime.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

#### Diverging Log Scaled Bar Chart
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliGenerateDetectedDataClumpsChartDivergingLogScaledBarChart.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
```

#### Chartline Number Data Clumps
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliGenerateDetectedDataClumpsChartLine.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
```

#### Chartline Number Faults
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliGenerateDetectedDataClumpsNumberFaultsChartLine.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
```

#### Evolution Category
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDetectedDataClumpsEvolution.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
```


#### Fault Correlation
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDetectedDataClumpsFaultCorrelation.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
```


## Roadmap

- [x] Support cli
- [ ] Verbose option
    - [ ] Improve options and add documentation
- [x] Parser
    - [x] Support Java - PMD
    - [x] Support TypeScript
    - [ ] Support JavaScript
    - [ ] Support Python
    - [ ] Support C#
    - [ ] Support C++
- [ ] Refactoring
    - [ ] Support Java

## Roadmap - Future improvements
- [x] Extract file parsing to PMD for speed increase: https://github.com/FireboltCasters/pmd-data-clumps
    - Using PMD will then not support web-based parsing

## License

All Rights Reserved.

Copyright (c) 2023 Nils Baumgartner

No part of this software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the copyright holder, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.

For permission requests, please contact the copyright holder at nilsbaumgartner1994@gmail.com



## Contributors

Nils Baumgartner

<a href="https://github.com/NilsBaumgartner1994/data-clumps"><img src="https://contrib.rocks/image?repo=NilsBaumgartner1994/data-clumps" alt="Contributors" /></a>
