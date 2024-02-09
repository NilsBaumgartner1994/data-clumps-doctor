/**
 * Executes the test for all languages.
 * 
 * @throws {Error} Throws an error if the test fails.
 */
function testAllLanguages() {
    test('Example test', async () => {
        expect("a").toBe("a");
    });
}

testAllLanguages();

export {} // In order to allow our outer react app to compile, we need to add an empty export statement to this file.
