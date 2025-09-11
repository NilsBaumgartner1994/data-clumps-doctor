// example.js

// Declare variables
var x = 10;
var y = 20;
var z = x + y;

// Function to calculate sum
function calculateSum(a, b) {
  return a + b;
}

// Unused variable
var unusedVar = 'I am not used';

// Duplicate code
function duplicateCodeExample() {
  console.log('This is duplicate code');
}

function anotherDuplicateCodeExample() {
  console.log('This is duplicate code');
}

// Function to calculate product
function calculateProduct(a, b) {
  return a * b;
}

// Call functions
var sum = calculateSum(x, y);
var product = calculateProduct(x, y);

console.log('Sum: ' + sum);
console.log('Product: ' + product);
