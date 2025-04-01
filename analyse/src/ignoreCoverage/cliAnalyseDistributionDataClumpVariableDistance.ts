#!/usr/bin/env node

import fs from 'fs';
import {AnalyseHelper, NumberOccurenceDict, StringOccurenceDict} from "./AnalyseHelper";
import {
    DataClumpsTypeContext,
    DataClumpsVariableFromContext,
    DataClumpsVariableToContext,
    DataClumpTypeContext,
    Dictionary,
    Position
} from "data-clumps-type-context";
import {Timer} from "./Timer";

/**
 * Calculates the absolute distances (in lines) between each pair of clumped fields based on their starting line positions.
 *
 * The function computes the distance using the formula:
 * distance(A, B) = |startLine(A) - startLine(B)|
 *
 * For example, if the positions are as follows:
 * - A: line 2
 * - B: line 10
 * - C: line 20
 *
 * The resulting distances would be calculated as:
 * Distances = [|2 - 10|, |10 - 20|] = [8, 10].
 * Resulting series: [8, 10].
 *
 * @param positions An array of Position objects, each containing a startLine property.
 * @returns A record where the keys are the calculated distances and the values are the counts of how many times each distance occurs.
 *
 * @throws Error if the input is not an array of Position objects.
 */
function calculateLinePairwiseDistances(positions: Position[]): NumberOccurenceDict {
    // sort the positions by start line
    const startLines = positions.map(pos => pos.startLine).sort((a, b) => a - b);
    const distances = new NumberOccurenceDict();
    for(let i = 1; i < startLines.length; i++){
        let distance = Math.abs(startLines[i] - startLines[i - 1]);
        let distance_key = parseInt(distance.toString());
        distances.addOccurence(distance_key, 1);
    }
    return distances;
}

/**
 * Calculates the spread of start lines from an array of position objects.
 *
 * The spread is defined as the difference between the maximum and minimum
 * start line values found in the provided positions. This function returns
 * an object where the keys are the calculated spread values and the values
 * are the counts of how many times each spread value occurs.
 *
 * @param positions - An array of Position objects, each containing a
 *                   startLine property.
 * @returns A Record where each key is a string representation of the
 *          spread value and each value is the count of occurrences of
 *          that spread.
 *
 * @throws Will throw an error if the positions array is empty.
 */
function calculateLineSpread(positions: Position[]): NumberOccurenceDict {
    const startLines = positions.map(pos => pos.startLine);
    let distances = new NumberOccurenceDict();
    for(let i = 1; i < startLines.length; i++){
        let distance = Math.max(...startLines) - Math.min(...startLines);
        let distance_key = parseInt(distance.toString());
        distances.addOccurence(distance_key, 1);
    }
    return distances;
}

/**
 * Calculates the distances of given positions' start lines to the median start line.
 *
 * This function takes an array of positions, extracts their start lines,
 * computes the median of these start lines, and then calculates the absolute
 * distances of each start line from the median. The result is returned as
 * a record where the keys are the distances and the values are the counts
 * of how many times each distance occurs.
 *
 * @param {Position[]} positions - An array of Position objects, each containing a startLine property.
 * @returns {Record<string, number>} A record mapping each distance to its occurrence count.
 *
 * @throws {Error} Throws an error if the positions array is empty.
 */
function calculateLineDistancesToMedian(positions: Position[]): NumberOccurenceDict {
    const startLines = positions.map(pos => pos.startLine).sort((a, b) => a - b);
    const median = startLines[Math.floor(startLines.length / 2)];
    let distances = new NumberOccurenceDict();
    for(let i = 0; i < positions.length; i++){
        let distance = Math.abs(positions[i].startLine - median);
        let distance_key = parseInt(distance.toString());
        distances.addOccurence(distance_key, 1);
    }
    return distances;
}

/**
 * Adjusts the position of a variable declaration based on modifiers, type, and whether it is the first variable.
 *
 * This function modifies the start column of the given position by accounting for the length of any modifiers
 * and the type name. If the `adjustForModifiersAndTypes` flag is false, the original position is returned.
 *
 * @param {Position} position - The original position to be adjusted.
 * @param {string[] | undefined} modifiers - An array of modifiers (e.g., 'public', 'static') to be considered for adjustment.
 * @param {string} fullyQualifiedType - The fully qualified type name from which the simple type will be extracted.
 * @param {string} variableName - The name of the variable being declared (not used in calculations but may be relevant for context).
 * @param {boolean} adjustForModifiersAndTypes - A flag indicating whether to adjust the position based on modifiers and types.
 * @param {boolean} isFirst - A flag indicating whether this is the first variable in a declaration, affecting the adjustment.
 *
 * @returns {Position} The adjusted position with updated start column.
 *
 * @throws {Error} Throws an error if the position is invalid or if any unexpected input is provided.
 */
function adjustPositionForModifiersTypeAndDelimiters(
    position: Position,
    modifiers: string[] | undefined,
    fullyQualifiedType: string,
    variableName: string,
    adjustForModifiersAndTypes: boolean,
    isFirst: boolean
): Position {
    if(!adjustForModifiersAndTypes){
        return position;
    }

    //console.log("Position Raw")
    //console.log(JSON.stringify(position, null, 2))

    // Extract the simple type name from the fully qualified type
    const simpleType = fullyQualifiedType.split(".").pop() || fullyQualifiedType; // "org.antlr.v4.automata.org.antlr.v4.tool.ast.GrammarAST" -> "GrammarAST"
    //console.log("Simple Type: "+simpleType)

    // Calculate the full "true" length of the declaration
    let modifierString = ""
    if (modifiers) {
        modifierString = modifiers.join(" ") + " ";
    }
    const typeString = simpleType + " ";
    //console.log("Modifier String: "+modifierString)

    // Adjust the startColumn backwards by the combined length of modifiers and type
    let adjustedStartColumn = position.startColumn - (modifierString.length + typeString.length);
    if(!isFirst){
        adjustedStartColumn -= ", ".length; // Add ", " if not the first variable
    }
    //console.log("Adjusted Start Column: "+adjustedStartColumn)

    return {
        ...position,
        startColumn: adjustedStartColumn >= 0 ? adjustedStartColumn : 0
    };
}

/**
 * Adjusts the position of a variable declaration to account for modifiers.
 * Example: String a, b, c -> [String a, String b, String c] then the startColumn of b and c should be adjusted accordingly.
 * @param sortedPositions
 */
function fixSortedAdjustedPositions(sortedPositions: Position[]): Position[] {
    const fixedPositions: Position[] = [...sortedPositions];

    for (let i = 1; i < fixedPositions.length; i++) {
        const prev = fixedPositions[i - 1];
        const current = fixedPositions[i];

        // If the current position starts before the previous one ends, adjust its start
        if (current.startColumn <= prev.endColumn) {
            const adjustment = prev.endColumn + 1; // Ensure there's at least one space
            fixedPositions[i] = {
                ...current,
                startColumn: adjustment,
                endColumn: Math.max(adjustment + (current.endColumn - current.startColumn), adjustment) // Adjust end accordingly
            };
        }
    }

    return fixedPositions;
}

/**
 * Adjusts the positions of the given variables based on their modifiers and type.
 *
 * This function takes an array of variables and adjusts their positions according to specified
 * modifiers and types. It can also account for whether to adjust based on modifiers and types.
 *
 * @param {Array<DataClumpsVariableFromContext | DataClumpsVariableToContext>} variables -
 * An array of variables that need position adjustments. Each variable should contain properties
 * such as position, modifiers, type, and name.
 *
 * @param {boolean} adjustForModifiersAndType - A flag indicating whether to adjust positions
 * based on modifiers and type. If true, the adjustments will consider these factors.
 *
 * @returns {Array<Position>} An array of adjusted positions corresponding to the input variables.
 *
 * @throws {Error} Throws an error if the input variables are not in the expected format or if
 * any required property is missing from the variable objects.
 */
function adjustPositionsForModifiersAndType(
    variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[],
    adjustForModifiersAndType: boolean,
): Position[] {
    //console.log("Adjusting position for modifiers and type");
    //console.log("Amount of variables: "+variables.length)

    let index = 0;
    return variables.map(variable =>
        {
            const isFirst = index === 0;
            index++;
            return adjustPositionForModifiersTypeAndDelimiters(
                variable.position,
                variable.modifiers,
                variable.type,
                variable.name,
                adjustForModifiersAndType,
                isFirst
            )
        }
    );
}



/**
 * Retrieves fixed adjusted positions based on the provided variables and type modifier adjustment flag.
 *
 * This function processes an array of variables, sorts them by their position, adjusts their positions
 * according to specified modifiers and type, and then returns the final fixed adjusted positions.
 *
 * @param {Array<DataClumpsVariableFromContext | DataClumpsVariableToContext>} variables - An array of variables
 *        that can either be of type `DataClumpsVariableFromContext` or `DataClumpsVariableToContext`.
 * @param {boolean} adjustForTypeModifier - A flag indicating whether to adjust the positions for type modifiers.
 *
 * @returns {Array<Position>} An array of adjusted positions after sorting and fixing.
 *
 * @throws {Error} Throws an error if the input variables are not of the expected types.
 */
function getFixedAdjustedPositions(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[], adjustForTypeModifier: boolean): Position[] {
    const sortedVariables = sortVariablesByPosition(variables);
    const positions = adjustPositionsForModifiersAndType(sortedVariables, adjustForTypeModifier);
    return fixSortedAdjustedPositions(positions);
}

/**
 * Retrieves fixed adjusted positions based on the provided data clump variables and a type modifier adjustment flag.
 *
 * This function accepts an array of either `DataClumpsVariableFromContext` or `DataClumpsVariableToContext`
 * and determines the adjusted positions accordingly.
 *
 * @param {Array<DataClumpsVariableFromContext | DataClumpsVariableToContext>} variables - An array of data clump variables
 *        from either the context of 'from' or 'to'.
 * @param {boolean} adjustForTypeModifier - A flag indicating whether to adjust the positions for type modifiers.
 * @returns {Array<Position>} An array of adjusted positions based on the input variables and type modifier flag.
 *
 * @throws {Error} Throws an error if the input variables are not of the expected types.
 */
export function getFixedAdjustedPositionFromDataClumpTypeContext(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[], adjustForTypeModifier: boolean): Position[] {
    return getFixedAdjustedPositions(variables, adjustForTypeModifier);
}


/**
 * Calculates various distance metrics based on the provided variable contexts.
 *
 * This function takes an array of variables, which can either be from the
 * DataClumpsVariableFromContext or DataClumpsVariableToContext types, and computes
 * the pairwise distances, spread, and distances to the median for the adjusted positions
 * derived from these variables.
 *
 * @param {Array<DataClumpsVariableFromContext | DataClumpsVariableToContext>} variables -
 * An array of variables representing either the source or target contexts for data clumps.
 *
 * @returns {{ pairwise: Record<string, number>, spread: Record<string, number>, toMedian: Record<string, number> }}
 * An object containing three properties:
 * - pairwise: A record of pairwise distances between positions.
 * - spread: A record representing the spread of positions.
 * - toMedian: A record of distances from each position to the median position.
 *
 * @throws {Error} Throws an error if the input variables are not of the expected types.
 */
function calculateFieldDistances(
    variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[]
): { pairwise: NumberOccurenceDict; spread: NumberOccurenceDict; toMedian: NumberOccurenceDict } {
    let positions = getFixedAdjustedPositionFromDataClumpTypeContext(variables, false);

    return {
        pairwise: calculateLinePairwiseDistances(positions),
        spread: calculateLineSpread(positions),
        toMedian: calculateLineDistancesToMedian(positions)
    };
}


/**
 * Calculates various distance metrics for parameters within a data clump.
 * This function analyzes the positions of method parameters and the provided
 * data clump variables to compute pairwise distances, spread, and distances
 * to the median.
 *
 * @param {DataClumpTypeContext} data_clump - The context of the data clump,
 * containing information about the method and its parameters.
 * @param {(DataClumpsVariableFromContext[] | DataClumpsVariableToContext[])} data_clump_variables - An array of variables
 * associated with the data clump, which can be either from or to context.
 *
 * @returns {{ pairwise: Record<string, number>, spread: Record<string, number>, spread_normalized: Record<string, number>, toMedian: Record<string, number>, toMedian_normalized: Record<string, number> }}
 * An object containing:
 * - pairwise: A record of pairwise distances between parameters.
 * - spread: A record of the spread distance between the first and last parameters.
 * - spread_normalized: A normalized version of the spread distance.
 * - toMedian: A record of distances of each parameter to the median position.
 * - toMedian_normalized: A normalized version of the distances to the median.
 *
 * @throws {Error} Throws an error if method parameters cannot be extracted
 * from the data clump or if no parameters are found.
 */
function calculateParameterDistances(
    data_clump: DataClumpTypeContext,
    data_clump_variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[],
): { pairwise: NumberOccurenceDict; spread: NumberOccurenceDict; spread_normalized: NumberOccurenceDict; toMedian: NumberOccurenceDict; toMedian_normalized: NumberOccurenceDict } {
    // Extract parameters from the data clump

    // Da wir im Data Clumps Dataset keine Informationen haben (zumindest direkt) welche anderen Parameter vorhanden sind
    // Bringt es nichts die column distance zu berechnen. In einer Methode sind die Parameter in der Regel in einer Zeile bzw. nahe beieinander
    // Daher würde es mehr Sinn machen zu schauen, ob die gleich in der richtigen Reihenfolge sind.
    // "from_method_key": "com.nostra13.universalimageloader.core.ImageLoader/method/displayImage(java.lang.String uri, com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.imageaware.ImageAware imageAware, com.nostra13.universalimageloader.core.DisplayImageOptions options, com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingListener listener, com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingProgressListener progressListener)",
    // Die idee ist, dass wir die Position der variables aus dem from_method_key extrahieren und dann schauen ob die in der richtigen Reihenfolge sind, bzw. die Information davon ableiten
    let method_parameters_list = AnalyseHelper.getUnsafeMethodParameterListFromMethod(data_clump);
    const methodParameterListNull = !method_parameters_list
    if(methodParameterListNull){
        console.error("ERROR: Could not extract method parameters from fromMethodKey for data clump: "+data_clump.key)
    }
    let emptyMethodParameterList = false;
    if(!!method_parameters_list){
        emptyMethodParameterList = method_parameters_list.length <= 0;
    }
    if(emptyMethodParameterList){
        console.error("ERROR: Could not extract method parameters from fromMethodKey: "+data_clump.from_method_key+ " for data clump: "+data_clump.key)
    }
    if(!method_parameters_list || emptyMethodParameterList){
        return {
            pairwise: new NumberOccurenceDict(),
            spread: new NumberOccurenceDict(),
            spread_normalized: new NumberOccurenceDict(),
            toMedian: new NumberOccurenceDict(),
            toMedian_normalized: new NumberOccurenceDict()
        };
    }

    // method_parameters_list = ["java.lang.String uri", "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.imageaware.ImageAware imageAware", "com.nostra13.universalimageloader.core.DisplayImageOptions options", "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingListener listener", "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingProgressListener progressListener"]

    let dict_method_parameter_positions = new StringOccurenceDict();
    for(let i = 0; i < method_parameters_list.length; i++){
        let method_parameter = method_parameters_list[i];
        dict_method_parameter_positions[method_parameter] = i
    }
    // dict_method_parameter_positions = {
    // "java.lang.String uri": 0,
    // "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.imageaware.ImageAware imageAware": 1,
    // "com.nostra13.universalimageloader.core.DisplayImageOptions options": 2,
    // "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingListener listener": 3,
    // "com.nostra13.universalimageloader.core.com.nostra13.universalimageloader.core.assist.ImageLoadingProgressListener progressListener": 4
    // }

    // variables sind z. B. nur 3 von den 5 Parametern

    let variables_index_position = new StringOccurenceDict();

    /**
     * Generates a key string for a given method parameter variable.
     *
     * This function takes a variable of type `DataClumpsVariableFromContext` or `DataClumpsVariableToContext`
     * and constructs a string that combines the variable's type and name.
     *
     * @param {DataClumpsVariableFromContext | DataClumpsVariableToContext} variable - The variable from which to generate the key.
     * @returns {string} A string representation of the variable's type and name, formatted as "type name".
     *
     * @throws {TypeError} Throws an error if the provided variable is not of the expected types.
     */
    function getVariableKeyForMethodParameter(variable: DataClumpsVariableFromContext | DataClumpsVariableToContext): string {
        // "name": "uri",
        // "type": "java.lang.String",
        return variable.type+" "+variable.name;
    }

    /**
     * Retrieves the index of a specified variable within the method parameters.
     *
     * This function takes a variable of type `DataClumpsVariableFromContext` or
     * `DataClumpsVariableToContext`, determines its corresponding key, and looks up
     * the index in the predefined dictionary of method parameter positions.
     * If the variable is not found, it returns -1.
     *
     * @param {DataClumpsVariableFromContext | DataClumpsVariableToContext} variable -
     * The variable for which the index is to be retrieved.
     *
     * @returns {number} The index of the variable in the method parameters, or -1 if not found.
     *
     * @throws {Error} Throws an error if the variable is invalid or if there is an issue
     * retrieving its key.
     */
    function getVariableIndexInMethodParameters(variable: DataClumpsVariableFromContext | DataClumpsVariableToContext): number {
        let key = getVariableKeyForMethodParameter(variable);
        return dict_method_parameter_positions[key] || -1;
    }


    for(let i = 0; i < data_clump_variables.length; i++){
        let variable = data_clump_variables[i];
        let key = getVariableKeyForMethodParameter(variable);
        if(dict_method_parameter_positions[key] !== undefined){
            variables_index_position[key] = dict_method_parameter_positions[key];
        }
    }

    let sortedVariables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[] = data_clump_variables.sort((a, b) => {
        let position_a = getVariableIndexInMethodParameters(a);
        let position_b = getVariableIndexInMethodParameters(b);
        // smaller values first
        return position_a - position_b;
    });

    let pairwise = new NumberOccurenceDict();
    let spread = new NumberOccurenceDict();
    let spread_normalized = new NumberOccurenceDict();
    let toMedian = new NumberOccurenceDict();
    let toMedian_normalized = new NumberOccurenceDict();

    // Calculate pairwise distances
    for(let i = 1; i < sortedVariables.length; i++){
        let position_a = getVariableIndexInMethodParameters(sortedVariables[i-1]);
        let position_b = getVariableIndexInMethodParameters(sortedVariables[i]);
        let pairwise_distance = Math.abs(position_a - position_b);
        let pairwise_key = parseInt(pairwise_distance.toString());
        pairwise.addOccurence(pairwise_key, 1);
    }

    // Calculate spread
    let start = getVariableIndexInMethodParameters(sortedVariables[0]);
    let end = getVariableIndexInMethodParameters(sortedVariables[sortedVariables.length-1]);
    let spread_distance = Math.abs(end - start);
    let spread_key = parseInt(spread_distance.toString());
    spread.addOccurence(spread_key, 1);

    // Calculate normalized spread
    // Normalize the spread by dividing by the number of parameters - 1
    let normalized_spread_distance = spread_distance / (sortedVariables.length - 1);
    spread_normalized.addOccurence(normalized_spread_distance, 1);

    // Calculate distances to median
    let median_index = Math.floor(sortedVariables.length / 2);
    let median = getVariableIndexInMethodParameters(sortedVariables[median_index]);
    for(let i = 0; i < sortedVariables.length; i++){
        let position = getVariableIndexInMethodParameters(sortedVariables[i]);
        let distance = Math.abs(position - median);
        let distanceToMedianKey = parseInt(distance.toString());
        toMedian.addOccurence(distanceToMedianKey, 1);

        // Calculate normalized distances to median
        // Normalize the distance by dividing by ((the number of parameters - 1) / 2)
        // so that the minimum distance is 1 and we are referencing the median
        let normalized_distance = distance / ((sortedVariables.length - 1) / 2);
        let normalized_distance_key = parseFloat(normalized_distance.toString());
        toMedian_normalized.addOccurence(normalized_distance_key, 1);
    }

    return {
        pairwise: pairwise,
        spread: spread,
        spread_normalized: spread_normalized,
        toMedian: toMedian,
        toMedian_normalized: toMedian_normalized
    };
}


function sortVariablesByPosition(variables: DataClumpsVariableFromContext[] | DataClumpsVariableToContext[]): DataClumpsVariableFromContext[] | DataClumpsVariableToContext[] {
    return variables.sort((a, b) => {
        if (a.position.startLine !== b.position.startLine) {
            return a.position.startLine - b.position.startLine;
        }
        return a.position.startColumn - b.position.startColumn;
    });
}


/**
 * Calculates the number of variables that are in the wrong order compared to other variables
 * within a given data clump context.
 *
 * This function takes a DataClumpTypeContext object, extracts the relevant variables, sorts them,
 * and compares their order to another set of variables derived from the same context. It counts
 * how many variables are out of order based on their expected positions.
 *
 * @param {DataClumpTypeContext} data_clump - The data clump context containing the variables to analyze.
 * @returns {number} The count of variables that are in the wrong order.
 *
 * @throws {Error} Throws an error if the input data_clump is invalid or does not contain the expected structure.
 */
function getNumberVariablesInWrongOrderAsOtherVariables(data_clump: DataClumpTypeContext): number {
    let data_clump_data = data_clump.data_clump_data;
    const variables = Object.values(data_clump_data);
    const sortedVariables = sortVariablesByPosition(variables) as DataClumpsVariableFromContext[];
    let otherVariables: DataClumpsVariableToContext[] = [];
    for(let variable_key in data_clump_data){
        let variableFrom = data_clump_data[variable_key];
        let variableTo = variableFrom.to_variable
        otherVariables.push(variableTo);
    }
    let otherSortedVariables = sortVariablesByPosition(otherVariables) as DataClumpsVariableToContext[];
    let numberOfVariablesInWrongOrder = 0;
    for(let i = 0; i < sortedVariables.length; i++){
        let fromVariable = sortedVariables[i];
        let expectedVariable = otherSortedVariables[i];
        if(fromVariable.to_variable.key !== expectedVariable.key){
            numberOfVariablesInWrongOrder++;
        }
    }
    return numberOfVariablesInWrongOrder;
}

/**
 * Analyzes data clumps in the specified report folder and generates statistical analysis.
 *
 * This function reads report files from the given folder, processes the data clumps found within,
 * and computes various distance metrics related to parameters and fields. It also generates a boxplot
 * visualization of the computed distances.
 *
 * @async
 * @param {string} report_folder - The path to the folder containing report files to analyze.
 * @param {Object} options - Options for analysis (currently unused).
 * @throws {Error} Will throw an error if the specified report folder does not exist.
 * @returns {Promise<string>} A promise that resolves to a string containing the generated file content
 * for statistical analysis and visualization.
 */
async function analyse(report_folder, options){
    console.log("Analysing Detected Data-Clumps");
    if (!fs.existsSync(report_folder)) {
        console.log("ERROR: Specified path to report folder does not exist: "+report_folder);
        process.exit(1);
    }

    let fields_distance_pairwise = new NumberOccurenceDict()
    let fields_distance_spread = new NumberOccurenceDict()
    let fields_distance_to_median = new NumberOccurenceDict()
    let fields_in_different_order_as_other_variables = new NumberOccurenceDict()
    let fields_3_or_less_in_different_order_as_other_variables = new NumberOccurenceDict()
    let fields_4_or_more_in_different_order_as_other_variables = new NumberOccurenceDict()

    let parameters_distance_with_delimiters_pairwise = new NumberOccurenceDict()
    let parameters_distance_with_delimiters_spread = new NumberOccurenceDict()
    let parameters_distance_with_delimiters_spread_normalized = new NumberOccurenceDict()
    let parameters_distance_with_delimiters_to_median = new NumberOccurenceDict()
    let parameters_distance_with_delimiters_to_median_normalized = new NumberOccurenceDict()
    let parameters_in_different_order_as_other_variables = new NumberOccurenceDict()
    let parameters_3_or_less_in_different_order_as_other_variables = new NumberOccurenceDict()
    let parameters_4_or_more_in_different_order_as_other_variables = new NumberOccurenceDict()

    let timer = new Timer()
    timer.start();

    let all_report_files_paths = AnalyseHelper.getAllReportFilePathsRecursiveInFolder(report_folder);
    let total_amount_of_report_files = all_report_files_paths.length;
    let dict_of_analysed_data_clumps_keys = {};
    let project_names: Dictionary<boolean> = {};

    //let parameter_data_clump_found = false;
    //let field_data_clump_found = false;
    for(let i = 0; i < total_amount_of_report_files; i++){
        let progress_files = i+1;
        timer.printEstimatedTimeRemaining({
            progress: i,
            total: total_amount_of_report_files
        });
        let report_file_path = all_report_files_paths[i];

        let report_file = fs.readFileSync(report_file_path, 'utf8');
        let report_file_json: DataClumpsTypeContext = JSON.parse(report_file);

        let data_clumps = report_file_json?.data_clumps;
        let data_clump_keys = Object.keys(data_clumps);
        let amount_of_data_clumps = data_clump_keys.length;

        for(let j = 0; j < amount_of_data_clumps; j++){
            let progress_data_clumps = j+1;
            let suffix = progress_data_clumps+"/"+amount_of_data_clumps;
            timer.printEstimatedTimeRemainingAfter1Second({
                progress: i,
                total: total_amount_of_report_files,
                prefix: null,
                suffix: suffix
            });

            let data_clump_key = data_clump_keys[j]
            if(dict_of_analysed_data_clumps_keys[data_clump_key] === true){ // Skip already analysed data clumps
                continue;
            } else {
                dict_of_analysed_data_clumps_keys[data_clump_key] = true; // Mark as analysed

                let data_clump: DataClumpTypeContext = data_clumps[data_clump_key];
                let data_clump_data: Dictionary<DataClumpsVariableFromContext> = data_clump.data_clump_data
                let data_clump_type = data_clump.data_clump_type; // 'parameters_to_parameters_data_clump' or 'fields_to_fields_data_clump' or "parameters_to_fields_data_clump"


                if(data_clump_type === AnalyseHelper.DataClumpType.PARAMETER_PARAMETER){
                    const variables = Object.values(data_clump.data_clump_data);

                    let parameters_distance_with_delimiters = calculateParameterDistances(data_clump, variables);
                    parameters_distance_with_delimiters_pairwise.concat(parameters_distance_with_delimiters.pairwise);
                    parameters_distance_with_delimiters_spread.concat(parameters_distance_with_delimiters.spread);
                    parameters_distance_with_delimiters_spread_normalized.concat(parameters_distance_with_delimiters.spread_normalized);
                    parameters_distance_with_delimiters_to_median.concat(parameters_distance_with_delimiters.toMedian);
                    parameters_distance_with_delimiters_to_median_normalized.concat(parameters_distance_with_delimiters.toMedian_normalized);

                    let numberOfVariablesInWrongOrder = getNumberVariablesInWrongOrderAsOtherVariables(data_clump);
                    parameters_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    if(variables.length <= 3){
                        parameters_3_or_less_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    } else {
                        parameters_4_or_more_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    }
                } else if(data_clump_type === AnalyseHelper.DataClumpType.FIELD_FIELD){
                    const variables = Object.values(data_clump.data_clump_data);

                    let fields_distances = calculateFieldDistances(variables);
                    fields_distance_pairwise.concat(fields_distances.pairwise);
                    fields_distance_spread.concat(fields_distances.spread);
                    fields_distance_to_median.concat(fields_distances.toMedian);

                    let numberOfVariablesInWrongOrder = getNumberVariablesInWrongOrderAsOtherVariables(data_clump);
                    fields_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    if(variables.length <= 3){
                        fields_3_or_less_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    } else {
                        fields_4_or_more_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    }

                } else if(data_clump_type === AnalyseHelper.DataClumpType.PARAMETER_FIELD){
                    let parameters = Object.values(data_clump.data_clump_data);
                    let fields: DataClumpsVariableToContext[] = [];
                    for(let variable_key in data_clump_data){
                        let parameter_from = data_clump_data[variable_key];
                        let field_to = parameter_from.to_variable
                        fields.push(field_to);
                    }

                    let parameters_distance_with_delimiters = calculateParameterDistances(data_clump, parameters);
                    parameters_distance_with_delimiters_pairwise.concat(parameters_distance_with_delimiters.pairwise);
                    parameters_distance_with_delimiters_spread.concat(parameters_distance_with_delimiters.spread);
                    parameters_distance_with_delimiters_spread_normalized.concat(parameters_distance_with_delimiters.spread_normalized);
                    parameters_distance_with_delimiters_to_median.concat(parameters_distance_with_delimiters.toMedian);
                    parameters_distance_with_delimiters_to_median_normalized.concat(parameters_distance_with_delimiters.toMedian_normalized);

                    let fields_distance_with_modifiers = calculateFieldDistances(fields);
                    fields_distance_pairwise.concat(fields_distance_with_modifiers.pairwise);
                    fields_distance_spread.concat(fields_distance_with_modifiers.spread);
                    fields_distance_to_median.concat(fields_distance_with_modifiers.toMedian);

                    let numberOfVariablesInWrongOrder = getNumberVariablesInWrongOrderAsOtherVariables(data_clump);
                    parameters_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    if(parameters.length <= 3){
                        parameters_3_or_less_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    } else {
                        parameters_4_or_more_in_different_order_as_other_variables.addOccurence(numberOfVariablesInWrongOrder, 1);
                    }
                }
            }
        }

    }

    console.log("Start analysing distances");

    let analysis_objects: Record<string, NumberOccurenceDict> = {
        "fields_pairwise": fields_distance_pairwise,
        "fields_spread": fields_distance_spread,
        "fields_to_median": fields_distance_to_median,
        "fields_in_different_order_as_other_variables": fields_in_different_order_as_other_variables,
        "fields_3_or_less_in_different_order_as_other_variables": fields_3_or_less_in_different_order_as_other_variables,
        "fields_4_or_more_in_different_order_as_other_variables": fields_4_or_more_in_different_order_as_other_variables,
        "parameters_with_delimiters_pairwise": parameters_distance_with_delimiters_pairwise,
        "parameters_with_delimiters_spread": parameters_distance_with_delimiters_spread,
        "parameters_with_delimiters_spread_normalized": parameters_distance_with_delimiters_spread_normalized,
        "parameters_with_delimiters_to_median": parameters_distance_with_delimiters_to_median,
        "parameters_with_delimiters_to_median_normalized": parameters_distance_with_delimiters_to_median_normalized,
        "parameters_in_different_order_as_other_variables_in_same_class_or_interface": parameters_in_different_order_as_other_variables,
        "parameters_3_or_less_in_different_order_as_other_variables_in_same_class_or_interface": parameters_3_or_less_in_different_order_as_other_variables,
        "parameters_4_or_more_in_different_order_as_other_variables_in_same_class_or_interface": parameters_4_or_more_in_different_order_as_other_variables,
    }

    let fileContent = AnalyseHelper.getPythonLibrariesFileContent()

    fileContent += "all_data = {}\n";
    fileContent += "manual_labels_array = []\n";
    let anylsis_keys = Object.keys(analysis_objects);
    let labels: string[] = [];
    for(let i = 0; i < anylsis_keys.length; i++){
        let analysis_name = anylsis_keys[i];
        let values = analysis_objects[analysis_name];
        fileContent += AnalyseHelper.getPythonAllDataValuesForOccurenceDict("values_"+analysis_name, values);
        labels.push(analysis_name);
    }

    fileContent += "\n";
    fileContent += "labels, data = all_data.keys(), all_data.values()\n";
    fileContent += AnalyseHelper.getPythonStatisticsForDataValues();
    fileContent += AnalyseHelper.getPythonPlot({
        output_filename_without_extension: options.output_filename_without_extension,
        y_label: "Distance",
        y_max: 50,
        offset_left: 0.15,
        offset_right: 0.95,
        offset_top: 0.98,
        offset_bottom: 0.10,
        width_inches: 6,
        height_inches: 4,
        use_manual_labels: true,
    });
    return fileContent

}

async function main() {
    console.log("Data-Clumps-Doctor Detection");

    // Get the options and arguments
    const options = AnalyseHelper.getCommandForAnalysis(process, {
        require_report_path: true,
        require_output_path: false,
        default_output_filename_without_extension: "AnalyseDistributionDataClumpVariableDistance",
    })

    const report_folder = options.report_folder;

    let fileContent = await analyse(report_folder, options);
    let output = options.output;
    // delete output file if it exists
    if (fs.existsSync(output)) {
        fs.unlinkSync(output);
    }

    console.log("Writing output to file: "+output)
    fs.writeFileSync(output, fileContent);
}

main();

