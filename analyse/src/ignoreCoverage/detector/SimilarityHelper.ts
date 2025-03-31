import Levenshtein from 'levenshtein';

export class SimilarityHelper {

    private static removeSpecialCharactersAndNumbers(name: string): string {
        return name.replace(/[^a-zA-Z ]/g, "");
    }

    private static removeSpaces(name: string): string {
        return name.replace(/\s/g, "");
    }

    private static removeNumbers(name: string): string {
        return name.replace(/[0-9]/g, "");
    }

    private static sanitizeNameForNameSimilarity(name: string): string {
        let nameLowerCase = name.toLowerCase();
        let nameWithoutSpecialCharacters = SimilarityHelper.removeSpecialCharactersAndNumbers(nameLowerCase);
        let nameWithoutSpaces = SimilarityHelper.removeSpaces(nameWithoutSpecialCharacters);
        let nameWithoutNumbers = SimilarityHelper.removeNumbers(nameWithoutSpaces);
        return nameWithoutNumbers;
    }

    public static getAmountChangesRequiredToTransformNameAtoB(nameA: string, nameB: string): number {
        let levenshteinDistanceNumberOfChangesRequired = new Levenshtein(nameA, nameB);
        return levenshteinDistanceNumberOfChangesRequired.distance
    }

    /**
     * Calculate the similarity between two names
     * Output is a number between 0 and 1
     * @param nameA
     * @param nameB
     */
    public static isSimilarName(nameA: string, nameB: string): number {
        if(!!nameA && !!nameB && nameA === nameB){
            return 1;
        } else {
            return 0;
        }

        // TODO: Adapt this stragegy in the Detector.ts in InvertedIndexSoftwareProject
        // we need to save the parameter names there as well good.

        let nameA_sanitized = SimilarityHelper.sanitizeNameForNameSimilarity(nameA);
        let nameB_sanitized = SimilarityHelper.sanitizeNameForNameSimilarity(nameB);

        let levenshteinDistanceNumberOfChangesRequired = SimilarityHelper.getAmountChangesRequiredToTransformNameAtoB(nameA_sanitized, nameB_sanitized);
        // we need to normalize the distance, as the simiarity is 1 for equal strings and 0 for completely different strings
        let similarity = 1;
        if(nameA_sanitized.length > 0 && nameB_sanitized.length > 0){
            let maxNameLength = Math.max(nameA_sanitized.length, nameB_sanitized.length);
            let normalizedLevenshteinDistance = levenshteinDistanceNumberOfChangesRequired / maxNameLength;
            similarity = 1 - normalizedLevenshteinDistance;
        } else {
            similarity = 0; // if one of the names is empty, the similarity is 0
        }

        return similarity;
    }

}
