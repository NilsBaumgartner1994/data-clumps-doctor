<h1 align="center">
Data-Clumps-Doctor
</h1>

[![🚀 CI](https://github.com/NilsBaumgartner1994/data-clumps-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/NilsBaumgartner1994/data-clumps-doctor/actions/workflows/ci.yml)
[![Data Clumps](https://raw.githubusercontent.com/NilsBaumgartner1994/data-clumps-doctor/refs/heads/master/reports/data-clumps-doctor/badges/data-clumps.svg)](https://github.com/NilsBaumgartner1994/data-clumps-doctor)



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

## GitHub Action

Run the analysis in any repository via our reusable action:

```yaml
- name: Analyse data clumps
  uses: NilsBaumgartner1994/data-clumps-doctor/.github/actions/analyse-data-clumps@main
  with:
    path-to-source: .
    output-path: reports/data-clumps-doctor/data-clumps.json
    badge-output-path: reports/data-clumps-doctor/badges/data-clumps.svg
    source-language-type: typescript
```

The `output-path` and `badge-output-path` are optional and can be customised to suit your project's layout.

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

### Example for Source Code - TypeScript
```
npm run build && \
node ./build/ignoreCoverage/cli.js \
  --source_type typescript \
  --commit_selection current \
  --output /Users/nilsbaumgartner/Desktop/{project_name}-data-clumps/{project_commit}.json \
  --path_to_project /Users/nilsbaumgartner/Documents/GitHub/rocket-meals
```


### Example for Digital Twins - DTDL

Download an example project from GitHub:
```
https://github.com/JMayrbaeurl/opendigitaltwins-isa95
https://github.com/Azure/opendigitaltwins-building
https://github.com/nikoraes/opendigitaltwins-saref4bldg
https://github.com/WillowInc/opendigitaltwins-rail
https://github.com/WillowInc/opendigitaltwins-airport
https://github.com/JMayrbaeurl/opendigitaltwins-assetadminstrationshell
https://github.com/Azure-Samples/azure-digital-twins-getting-started
https://github.com/WillowInc/opendigitaltwins-mining
https://github.com/XMPro/Wind-Power-Plant-Wind-Turbine-DTDL-Models
https://github.com/Azure/opendigitaltwins-energygrid
https://github.com/JMayrbaeurl/opendigitaltwins-schemaorg
https://github.com/Azure/opendigitaltwins-smartcities
https://github.com/Azure/iot-plugandplay-models
```

Then run the following command:

Filtered:
```
npm run build && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/JMayrbaeurl/opendigitaltwins-isa95 --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-isa95-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure/opendigitaltwins-building --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-building-master && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/nikoraes/opendigitaltwins-saref4bldg --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-saref4bldg-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/WillowInc/opendigitaltwins-rail --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-rail-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/WillowInc/opendigitaltwins-airport --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-airport-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/JMayrbaeurl/opendigitaltwins-assetadminstrationshell --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-assetadminstrationshell-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure-Samples/azure-digital-twins-getting-started --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/azure-digital-twins-getting-started-main_advanced-home-example && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure-Samples/azure-digital-twins-getting-started --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/azure-digital-twins-getting-started-main_energy-grid-example && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure-Samples/azure-digital-twins-getting-started --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/azure-digital-twins-getting-started-main_basic-home-example && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/WillowInc/opendigitaltwins-mining --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-mining-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/XMPro/Wind-Power-Plant-Wind-Turbine-DTDL-Models --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/Wind-Power-Plant-Wind-Turbine-DTDL-Models-main_WindPowerPlant && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/XMPro/Wind-Power-Plant-Wind-Turbine-DTDL-Models --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/Wind-Power-Plant-Wind-Turbine-DTDL-Models-main_WindTurbine && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure/opendigitaltwins-energygrid --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-energygrid-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/JMayrbaeurl/opendigitaltwins-schemaorg --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-schemaorg-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure/opendigitaltwins-smartcities --path_to_project /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/opendigitaltwins-smartcities-main && 
node ./build/ignoreCoverage/cli.js --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/{project_name}/result.json --source_type digitalTwinsDefinitionLanguage --commit_selection current --project_url https://github.com/Azure/iot-plugandplay-models --path_to_projects /Users/nilsbaumgartner/Desktop/DTDL-Projects-Seperated/iot-plugandplay-models-main/dtmi/ && 
echo "Finished Analysis"
```


### Example for Digital Twins - NGSI-LD

You can find more models at: https://github.com/smart-data-models
With filtering for probably non-relevant variables and wanted data clumps for common variable names (alternateName,dataProvider,dateCreated,dateModified,description,name,source), run the following command:

```
npm run build && \
node ./build/ignoreCoverage/cli.js \
  --detector_options_ignored_variable_names "[alternateName,dataProvider,dateCreated,dateModified,description,name,source]" \
  --output /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered/{project_name}/{project_commit}.json \
  --source_type ngsi-ld \
  --commit_selection current \
  --git_project_urls_to_analyse "[https://github.com/smart-data-models/dataModel.DCAT-AP,https://github.com/smart-data-models/dataModel.DataQuality,https://github.com/smart-data-models/dataModel.DataSpace,https://github.com/smart-data-models/dataModel.DigitalInnovationHub,https://github.com/smart-data-models/dataModel.DistributedLedgerTech,https://github.com/smart-data-models/dataModel.FrictionlessData,https://github.com/smart-data-models/dataModel.Gaia-X,https://github.com/smart-data-models/dataModel.HumanResources,https://github.com/smart-data-models/dataModel.IT,https://github.com/smart-data-models/dataModel.IssueTracking,https://github.com/smart-data-models/dataModel.KeyPerformanceIndicator,https://github.com/smart-data-models/dataModel.MachineLearning,https://github.com/smart-data-models/dataModel.Multimedia,https://github.com/smart-data-models/dataModel.Organization,https://github.com/smart-data-models/dataModel.PointOfInteraction,https://github.com/smart-data-models/dataModel.PointOfInterest,https://github.com/smart-data-models/dataModel.PublicAccountability,https://github.com/smart-data-models/dataModel.QueueManagement,https://github.com/smart-data-models/dataModel.RiskManagement,https://github.com/smart-data-models/dataModel.S4SYST,https://github.com/smart-data-models/dataModel.SAREF,https://github.com/smart-data-models/dataModel.SDG,https://github.com/smart-data-models/dataModel.SDMX,https://github.com/smart-data-models/dataModel.STAT-DCAT-AP,https://github.com/smart-data-models/dataModel.SatelliteImagery,https://github.com/smart-data-models/dataModel.SmartDataModels,https://github.com/smart-data-models/dataModel.SocialMedia,https://github.com/smart-data-models/dataModel.User,https://github.com/smart-data-models/dataModel.VerifiableCredentials,https://github.com/smart-data-models/dataModel.Weather,https://github.com/smart-data-models/dataModel.WifiNetwork,https://github.com/smart-data-models/dataModel.Agrifood,https://github.com/smart-data-models/dataModel.Aquaculture,https://github.com/smart-data-models/dataModel.Forestry,https://github.com/smart-data-models/dataModel.Building,https://github.com/smart-data-models/dataModel.GBFS,https://github.com/smart-data-models/dataModel.OSLO,https://github.com/smart-data-models/dataModel.Parking,https://github.com/smart-data-models/dataModel.ParksAndGardens,https://github.com/smart-data-models/dataModel.Ports,https://github.com/smart-data-models/dataModel.S4BLDG,https://github.com/smart-data-models/dataModel.Streetlighting,https://github.com/smart-data-models/dataModel.Transportation,https://github.com/smart-data-models/dataModel.UrbanMobility,https://github.com/smart-data-models/dataModel.WasteManagement,https://github.com/smart-data-models/dataModel.ZEB,https://github.com/smart-data-models/dataModel.Battery,https://github.com/smart-data-models/dataModel.Consumption,https://github.com/smart-data-models/dataModel.Energy,https://github.com/smart-data-models/dataModel.EnergyCIM,https://github.com/smart-data-models/dataModel.GreenEnergy,https://github.com/smart-data-models/dataModel.Environment,https://github.com/smart-data-models/dataModel.WaterQuality,https://github.com/smart-data-models/dataModel.Device,https://github.com/smart-data-models/dataModel.OCF,https://github.com/smart-data-models/dataModel.OpenChannelManagement,https://github.com/smart-data-models/dataModel.WasteWater,https://github.com/smart-data-models/dataModel.WaterConsumption,https://github.com/smart-data-models/dataModel.WaterDistribution,https://github.com/smart-data-models/dataModel.WaterDistributionManagementEPANET,https://github.com/smart-data-models/dataModel.PointOfInterest,https://github.com/smart-data-models/dataModel.TourismDestinations,https://github.com/smart-data-models/dataModel.ACRIS,https://github.com/smart-data-models/dataModel.Aeronautics,https://github.com/smart-data-models/dataModel.UnmannedAerialVehicle,https://github.com/smart-data-models/dataModel.AutonomousMobileRobot,https://github.com/smart-data-models/dataModel.OPCUA,https://github.com/smart-data-models/dataModel.RoboticIndustrialActivities,https://github.com/smart-data-models/dataModel.COVID19,https://github.com/smart-data-models/dataModel.Hl7,https://github.com/smart-data-models/dataModel.AAS,https://github.com/smart-data-models/dataModel.ManufacturingMachine,https://github.com/smart-data-models/dataModel.PredictiveMaintenance,https://github.com/smart-data-models/dataModel.ERA,https://github.com/smart-data-models/dataModel.MarineTransport,https://github.com/smart-data-models/dataModel.Alert,https://github.com/smart-data-models/dataModel.CallComplaints,https://github.com/smart-data-models/dataModel.CivilEngineeringWork,https://github.com/smart-data-models/dataModel.CPSV-AP,https://github.com/smart-data-models/dataModel.UrbanPlanning]"
```


### Help

```
cd data-clumps-doctor/analyse
node ./build/ignoreCoverage/cli.js --help
```


### Analysis

#### Statistics Overview
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliCountTotalStatistics.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliCountTotalStatistics.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/UML_Projects/lindholmenDbDataClumps

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliCountTotalStatistics.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliCountTotalStatistics.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered
```

#### Types
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered/
```

#### Cluster Types
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsClusterTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsClusterTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/UML_Projects/lindholmenDbDataClumps

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsClusterTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpsClusterTypes.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered/
```

#### Data Clumps Density
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpClassAndMethodDensity.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/



```

#### File Path Distance
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpFilePathDistance.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/
```

### Variable Distance
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableDistance.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableDistance.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableDistance.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered/
```

#### Variable Distribution to Types
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableAmount.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableAmount.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseDistributionDataClumpVariableAmount.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered/
```

#### Most Common Variables
```
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseMostCommonDataClumpVariable.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects/

node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseMostCommonDataClumpVariable.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Digital_Twins_Definition_Language_Filtered/
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliAnalyseMostCommonDataClumpVariable.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Digital_Twins/Next_Generation_Service_Interfaces_Linked_Data_Filtered/
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
echo "Gathering Bug Introducing Commits and Update Reports"
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliDataClumpsBugIntroducingCommitGather.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
echo "Analyse Bug Introducing Commits"
node /Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor/analyse/build/ignoreCoverage/cliDataClumpsBugIntroducingCommitAnalyse.js --report_folder /Users/nilsbaumgartner/Documents/GitHub/Data-Clumps-Dataset/Data/Source_Code/Java_Projects
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
