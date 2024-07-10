/* istanbul ignore file */

//test comment
import {SoftwareProjectDicts} from "./ignoreCoverage/SoftwareProject";
import * as ParsedAstTypes from "./ignoreCoverage/ParsedAstTypes";
import {Detector, DetectorOptionsInformation, DetectorOptions as DetectorOptions_} from "./ignoreCoverage/detector/Detector";
export {SoftwareProjectDicts};
export type DetectorOptions = DetectorOptions_; // https://stackoverflow.com/questions/53728230/cannot-re-export-a-type-when-using-the-isolatedmodules-with-ts-3-2-2
export {Detector, DetectorOptionsInformation}
export {ParsedAstTypes};
