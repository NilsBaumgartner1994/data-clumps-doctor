package net.sourceforge.pmd.examples.java.rules.parsedAstTypes;

import java.util.ArrayList;
import java.util.List;

public class ParameterTypeContext extends AstElementTypeContext {
    public List<String> modifiers = new ArrayList<String>();
    public boolean ignore;

    public ParameterTypeContext(){

    }
}