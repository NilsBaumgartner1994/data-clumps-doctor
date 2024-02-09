// example.js

// Declare variables
var x = 10;
var y = 20;
var z = x + y;

/**
 * Function to calculate sum
 * @param {number} a - The first number
 * @param {number} b - The second number
 * @returns {number} The sum of a and b
 * @throws {TypeError} If either a or b is not a number
 */
// Function to calculate sum
function calculateSum(a, b) {
    return a + b;
}

// Unused variable
var unusedVar = "I am not used";

/**
 * This function is used to demonstrate duplicate code.
 * @throws {Error} Will throw an error if the 'log' function is not available.
 */
// Duplicate code
function duplicateCodeExample() {
    console.log("This is duplicate code");
}

/**
 * This function is an example of duplicate code.
 * It logs the message "This is duplicate code" to the console.
 * 
 * @throws {Error} If the 'log' function is not available.
 */
function anotherDuplicateCodeExample() {
    console.log("This is duplicate code");
}

/**
 * Function to calculate product
 * @param {number} a - The first number
 * @param {number} b - The second number
 * @returns {number} The product of a and b
 * @throws {Error} If either a or b is not a number
 */
// Function to calculate product
function calculateProduct(a, b) {
    return a * b;
}

// Call functions
var sum = calculateSum(x, y);
var product = calculateProduct(x, y);

console.log("Sum: " + sum);
console.log("Product: " + product);
