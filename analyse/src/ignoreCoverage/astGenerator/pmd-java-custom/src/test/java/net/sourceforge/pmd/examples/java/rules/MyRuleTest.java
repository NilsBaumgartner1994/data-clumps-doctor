package net.sourceforge.pmd.examples.java.rules;

import net.sourceforge.pmd.testframework.SimpleAggregatorTst;

public class MyRuleTest extends SimpleAggregatorTst {

    @Override
    /**
     * Set up the test environment.
     *
     * This method is used to set up the test environment before running the test cases.
     * It currently adds a rule for testing purposes.
     *
     * @throws UnsupportedOperationException if the rule addition fails
     */
    protected void setUp() {
        //addRule("net/sourceforge/pmd/examples/java/rules/MyRule.xml", "MyRule");
    }
}
