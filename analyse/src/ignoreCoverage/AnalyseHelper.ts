#!/usr/bin/env node

export class AnalyseHelper {

    static printProgress(files, total_files, data_clumps, total_data_clumps){
        console.log("Progress analysing files: "+files.toString().padStart(4, "0")+
            "/"+total_files.toString().padStart(4, "0")+
            " - Data Clumps: "+data_clumps.toString().padStart(6, "0")+
            "/"+total_data_clumps.toString().padStart(6, "0"));
    }

    static getMedian(listOfValues: number[]): number {
        // Sort the list of values
        let sortedValues = [...listOfValues].sort((a, b) => a - b);

        let amountSingleGroups = listOfValues.length

        // Calculate the median
        let median;
        if (amountSingleGroups % 2 === 0) {
            // If even, average the two middle values
            median = (sortedValues[amountSingleGroups / 2 - 1] + sortedValues[amountSingleGroups / 2]) / 2;
        } else {
            // If odd, take the middle value
            median = sortedValues[Math.floor(amountSingleGroups / 2)];
        }
        return median;
    }

    static getValuesFor(nameOfVariable: string, listOfValues: number[]){
        let fileContent = "";
        let median = AnalyseHelper.getMedian(listOfValues);
        //console.log("Median for "+nameOfVariable+": "+median)
        fileContent += "\n";
        fileContent += "# "+nameOfVariable+"_median = "+median+"\n";
        fileContent += nameOfVariable+"= [\n";
        let amountSingleGroups = listOfValues.length
        for(let i = 0; i < amountSingleGroups; i++){
            fileContent += "  "+listOfValues[i];
            if(i < amountSingleGroups - 1){
                fileContent += ",\n";
            }
        }
        fileContent += "\n";
        fileContent += "]\n";
        fileContent += "\n";

        return fileContent;
    }
}