package net.sourceforge.pmd.examples.java.rules.parsedAstTypes;

public class AstElementTypeContext {
    public String name;
    public String key;
    public String type;
    public boolean hasTypeVariable; // Some types are variable, e.g. List<T> but not List<Number>
    public AstPosition position;

    public AstElementTypeContext(){

    }
}
