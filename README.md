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

We're excited to share our public [Data-Clumps Dataset](https://github.com/FireboltCasters/Data-Clumps-Dataset/) with you. We invite you to explore it and consider contributing to our growing repository. By uploading your analyzed data, you can help enrich our dataset and support the broader community in their software analysis endeavors. Together, we can enhance our understanding of data-clumps and their impact on software development.

## Reporting Format

In our endeavor to ensure precision and standardization in reporting data clumps, we utilize the following specification: [Data-Clumps-Type-Context](https://github.com/FireboltCasters/data-clumps-type-context/).

## Requirements

- The project to be analyzed can not have [Wildcard imports](https://stackoverflow.com/questions/147454/why-is-using-a-wild-card-with-a-java-import-statement-bad)
  - It will not break but the detector may generate false positives
  - Since a static source-code analysis is made, the detector does not know where the import comes exactly from
- Node Version 14.15.6 (test on this. Newer versions might also work)
- Java 19
  - openjdk version "19.0.1" 2022-10-18
  - OpenJDK Runtime Environment (build 19.0.1+10-21)
  - OpenJDK 64-Bit Server VM (build 19.0.1+10-21, mixed mode, sharing)
- Git needs to be installed

## Installation

```
cd data-clumps-doctor/analyse && npm ci && npm run build
```

Optional: build the astGenerator from source
```
cd data-clumps-doctor/analyse/src/ignoreCoverage/astGenerator && make build
```

## Usage

```
cd data-clumps-doctor/analyse
node ./build/ignoreCoverage/cli.js <Path_to_your_project_to_analyse>
```

Example to analyse local project completely:
```
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --path_to_project /Users/nbaumgartner/Desktop/argouml
```

Example to analyse git ArgoUML completely:
```
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_urls_to_analyse https://github.com/argouml-tigris-org/argouml
```

Example to analyse multiple git completely:
```
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/argouml-tigris-org/argouml
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/ben-manes/caffeine
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/apache/dolphinscheduler
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/jflex-de/jflex
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/jfree/jfreechart
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/apache/rocketmq
node ./build/ignoreCoverage/cli.js --output /Users/nbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Projects/{project_name}/tags/{project_commit}.json --commit_selection tags --git_project_url_to_analyse https://github.com/apache/xerces2-j
```

### Help

```
cd data-clumps-doctor/analyse
node ./build/ignoreCoverage/cli.js --help
```



## Roadmap

- [x] Support cli
    - [ ] Improve options and add documentation
- [x] Parser
    - [x] Support Java - PMD
    - [ ] Support TypeScript
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
