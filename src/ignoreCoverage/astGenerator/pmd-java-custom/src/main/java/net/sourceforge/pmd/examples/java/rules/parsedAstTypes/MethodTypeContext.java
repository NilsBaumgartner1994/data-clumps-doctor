package net.sourceforge.pmd.examples.java.rules.parsedAstTypes;

import java.util.ArrayList;
import java.util.List;

public class MethodTypeContext extends AstElementTypeContext {
    public List<String> modifiers = new ArrayList<String>();
    public boolean overrideAnnotation;
    public String returnType;
    public List<MethodParameterTypeContext> parameters = new ArrayList<MethodParameterTypeContext>();
    public String classOrInterfaceKey;

    public MethodTypeContext(){

    }
}