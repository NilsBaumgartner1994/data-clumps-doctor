package net.sourceforge.pmd.examples.java.rules.parsedAstTypes;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ClassOrInterfaceTypeContext extends AstElementTypeContext {
    public List<String> modifiers = new ArrayList<String>();
    public Map<String, MemberFieldParameterTypeContext> fields = new HashMap<String, MemberFieldParameterTypeContext>();
    public Map<String, MethodTypeContext> methods = new HashMap<String, MethodTypeContext>();
    public Map<String, MethodTypeContext> constructors = new HashMap<String, MethodTypeContext>();
    public String file_path;
    public boolean anonymous;
    public boolean auxclass; // true: wont be analysed. the class is only an aux class in order to support the hierarchy.
    public List<String> implements_ = new ArrayList<String>();
    public List<String> extends_ = new ArrayList<String>(); // Languages that support multiple inheritance include: C++, Common Lisp

    public String definedInClassOrInterfaceTypeKey; // key of the class or interface where this class or interface is defined

    public Map<String, ClassOrInterfaceTypeContext> innerDefinedClasses = new HashMap<String, ClassOrInterfaceTypeContext>();
    public Map<String, ClassOrInterfaceTypeContext> innerDefinedInterfaces = new HashMap<String, ClassOrInterfaceTypeContext>();

    public ClassOrInterfaceTypeContext(){

    }
}
