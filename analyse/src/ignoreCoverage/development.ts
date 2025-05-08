import fs from 'fs';
import {ParserHelperXmlVisualParadigm} from "./parsers/ParserHelperXmlVisualParadigm";
import {Analyzer} from "./Analyzer";
import {SoftwareProjectDicts} from "./SoftwareProject";
import {ParserHelper} from "./ParserHelper";
import {GitHelper} from "./GitHelper";

const current_working_directory = process.cwd();

async function main() {
    console.log("Development started");

    let url = await GitHelper.getRemoteUrl(current_working_directory);
    console.log("url");
    console.log(url);

    /**
    //const pathToExportedXMLFile = current_working_directory+"/src/ignoreCoverage/astGeneratorFromUmlClassXmlFile/project.xml"
    //const pathToExportedXMLFile = current_working_directory+"/src/ignoreCoverage/astGeneratorFromUmlClassXmlFile/projectUseOfGeneralisation.xml"
    //const pathToExportedXMLFile = current_working_directory+"/src/ignoreCoverage/astGeneratorFromUmlClassXmlFile/projectImplementsInterface.xml"
    //const pathToExportedXMLFile = current_working_directory+"/src/ignoreCoverage/astGeneratorFromUmlClassXmlFile/projectExampleSwEng-WorkflowManagement.xml"
    const pathToExportedXMLFile = current_working_directory+"/src/ignoreCoverage/astGeneratorFromUmlClassXmlFile/projectDataClumpAttribute.xml"

    const path_to_ast_output = current_working_directory+"/src/ignoreCoverage/testDataParsedAst"
    console.log("current_working_directory");
    console.log(current_working_directory);

    await ParserHelperXmlVisualParadigm.parseXmlToAst(pathToExportedXMLFile, path_to_ast_output);
    let softwareProjectDicts: SoftwareProjectDicts = await ParserHelper.getSoftwareProjectDictsFromParsedAstFolder(path_to_ast_output);

    let project_url = "exampleURL";
    let project_name = "testProject";
    let project_version = "1.0.0";
    let commit = "1234567890";
    let commit_tag = "v1.0.0";
    let commit_date = "2021-01-01";
    let path_to_result = current_working_directory+"/src/ignoreCoverage/testDataResult";
    let progressCallback = null;

    await Analyzer.analyseSoftwareProjectDicts(softwareProjectDicts, project_url, project_name, project_version, commit, commit_tag, commit_date, path_to_result, progressCallback);
*/


}

main();
