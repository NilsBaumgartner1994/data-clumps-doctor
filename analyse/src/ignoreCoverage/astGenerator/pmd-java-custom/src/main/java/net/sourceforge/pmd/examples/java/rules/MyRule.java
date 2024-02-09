package net.sourceforge.pmd.examples.java.rules;

import java.lang.reflect.Method;
import java.io.BufferedWriter;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.fasterxml.jackson.databind.SerializationFeature;
import net.sourceforge.pmd.RuleContext;
import net.sourceforge.pmd.examples.java.rules.parsedAstTypes.*;
import net.sourceforge.pmd.lang.java.ast.*;
import net.sourceforge.pmd.lang.java.rule.AbstractJavaRule;
import net.sourceforge.pmd.lang.java.symbols.JClassSymbol;
import net.sourceforge.pmd.lang.java.symbols.JTypeDeclSymbol;
import net.sourceforge.pmd.lang.java.types.JClassType;
import net.sourceforge.pmd.lang.java.types.JTypeVar;
import net.sourceforge.pmd.lang.java.types.JTypeMirror;
import net.sourceforge.pmd.lang.java.types.TypePrettyPrint;
import net.sourceforge.pmd.lang.java.types.*;
import net.sourceforge.pmd.properties.StringProperty;
import net.sourceforge.pmd.lang.ast.*;
import net.sourceforge.pmd.lang.document.TextDocument;
import net.sourceforge.pmd.lang.document.FileId;
import net.sourceforge.pmd.util.OptionalBool;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;

public class MyRule extends AbstractJavaRule {

    static int count = 0;
    static String output = "";
    static String filePath = "";
    static String packageName = "";

    /**
     * Converts the given object to a JSON string using the Jackson ObjectMapper.
     *
     * @param obj the object to be converted to JSON
     * @return the JSON string representing the object
     * @throws JsonProcessingException if an error occurs during JSON processing
     */
    public static String convertToJson(Object obj) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT); // Enable pretty printing
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private static final StringProperty BAD_NAME = StringProperty.named("badName")
            .defaultValue("foo")
            .desc("The variable name that should not be used.")
            .uiOrder(1.0f)
            .build();

    public MyRule() {
        definePropertyDescriptor(BAD_NAME);
    }

    @Override
    /**
     * Starts the process with the given rule context.
     *
     * @param ctx the rule context to start the process with
     * @throws NullPointerException if ctx is null
     */
    public void start(RuleContext ctx) {
        // Your other code
    }

    @Override
    /**
     * This method is called when the analysis is finished.
     * Override this method as needed to perform any necessary actions at the end of the analysis.
     *
     * @param ctx The rule context for the analysis
     * @throws NullPointerException if the rule context is null
     */
    public void end(RuleContext ctx) {
        // Override as needed
        //System.out.println("================");
        //System.out.println("Finished");
    }

    /**
    /**
     * Returns the position of the given ASTFieldDeclaration node.
     *
     * @param node the ASTFieldDeclaration node
     * @return the AstPosition object representing the position of the node
     * @throws NullPointerException if the input node is null
     */
    private AstPosition getAstPosition(ASTFieldDeclaration node){
        AstPosition position = new AstPosition();
        position.startLine = node.getBeginLine();
        position.startColumn = node.getBeginColumn();
        position.endLine = node.getEndLine();
        position.endColumn = node.getEndColumn();
        return position;
    }

        private AstPosition getAstPosition(ASTVariableDeclaratorId node){
        /**
         * Returns the position of the given ASTVariableDeclaratorId node.
         *
         * @param node the ASTVariableDeclaratorId node
         * @return the position of the node
         * @throws NullPointerException if the node is null
         */
            AstPosition position = new AstPosition();
            position.startLine = node.getBeginLine();
            position.startColumn = node.getBeginColumn();
            position.endLine = node.getEndLine();
            position.endColumn = node.getEndColumn();
            return position;
        }

    private void extractFields(ASTClassOrInterfaceDeclaration node, ClassOrInterfaceTypeContext classContext){
    /**
     * Extracts fields from the given ASTClassOrInterfaceDeclaration and adds them to the provided ClassOrInterfaceTypeContext.
     *
     * @param node The ASTClassOrInterfaceDeclaration from which to extract fields
     * @param classContext The ClassOrInterfaceTypeContext to which the extracted fields will be added
     * @throws NullPointerException if either node or classContext is null
     */
        List<ASTFieldDeclaration> fields = node.descendants(ASTFieldDeclaration.class).toList();

        String memberFieldKeyPre = getClassOrInterfaceKey(node)+"/memberField/";

        // search for rows like: private ArrayList javaArrayList, anotherArrayList[];
        for (ASTFieldDeclaration field : fields) {
            //String memberFieldKey = "";

            // now get from a row like: private ArrayList javaArrayList, anotherArrayList[];
            // the individual : javaArrayList and anotherArrayList[]
            List<ASTVariableDeclaratorId> fieldVariableDeclarators = field.descendants(ASTVariableDeclaratorId.class).toList();
            for(ASTVariableDeclaratorId fieldVariableDeclarator: fieldVariableDeclarators){

                MemberFieldParameterTypeContext fieldContext = new MemberFieldParameterTypeContext();
                // Set the properties of the fieldContext based on the field
                String fieldName = fieldVariableDeclarator.getName();

                fieldContext.name = fieldName;

                // TODO: what is is varargs?
                fieldContext.type = this.getQualifiedNameUnsafe(fieldVariableDeclarator.getTypeMirror());
                fieldContext.hasTypeVariable = this.hasTypeVariable(fieldVariableDeclarator.getTypeMirror());

                // Set the position
                fieldContext.position = this.getAstPosition(fieldVariableDeclarator);

                fieldContext.classOrInterfaceKey = node.getCanonicalName();

                // Extract the modifiers
                ASTModifierList fieldModifiers = field.getFirstDescendantOfType(ASTModifierList.class);
                Set<JModifier> modifierSet = fieldModifiers.getEffectiveModifiers();
                if (modifierSet != null) {
                    fieldContext.modifiers = modifierSet.stream().map(Enum::name).collect(Collectors.toList());
                }

                fieldContext.key = memberFieldKeyPre+fieldName;

                // Add the fieldContext to the classContext.fields
                classContext.fields.put(fieldContext.key, fieldContext);
            }
            /**
            // remove the last comma
            if(memberFieldKey.length()>0){
                memberFieldKey = memberFieldKey.substring(0, memberFieldKey.length()-1);
            }
            System.out.println("memberFieldKey: "+memberFieldKey);
            */
        }
    }

    private void extractMethods(ASTClassOrInterfaceDeclaration node, ClassOrInterfaceTypeContext classContext){
    /**
     * Extracts methods from the given ASTClassOrInterfaceDeclaration and populates the ClassOrInterfaceTypeContext with the extracted methods.
     *
     * @param node The ASTClassOrInterfaceDeclaration from which methods are to be extracted
     * @param classContext The ClassOrInterfaceTypeContext to be populated with the extracted methods
     * @throws NullPointerException if either node or classContext is null
     */

        String classOrInterfaceKey = getClassOrInterfaceKey(node);

        // If you want to only get the fields of the top-level class and not any inner classes, you would need to add a check to exclude fields that belong to inner classes. One way to do this could be to check the parent of each field and see if it's the top-level class node.
        List<ASTMethodDeclaration> methods = node.descendants(ASTMethodDeclaration.class).toList();
        for (ASTMethodDeclaration method : methods) {

            MethodTypeContext methodContext = new MethodTypeContext();
            // Set the properties of the methodContext based on the method
            methodContext.name = method.getMethodName();
            methodContext.type = this.getQualifiedNameUnsafe(method.getResultTypeNode().getTypeMirror());

            //System.out.println("----------------");
            //System.out.println("methodContext.name: "+methodContext.name);

            // Set the position
            AstPosition position = new AstPosition();
            position.startLine = method.getBeginLine();
            position.startColumn = method.getBeginColumn();
            position.endLine = method.getEndLine();
            position.endColumn = method.getEndColumn();
            methodContext.position = position;

            methodContext.classOrInterfaceKey = node.getCanonicalName();

            // Extract the modifiers and check for @Override annotation
            ASTModifierList methodModifiers = method.getFirstDescendantOfType(ASTModifierList.class);
            Set<JModifier> methodModifierSet = methodModifiers.getEffectiveModifiers();
            if (methodModifierSet != null) {
                methodContext.modifiers = methodModifierSet.stream().map(Enum::name).collect(Collectors.toList());
            }

            methodContext.overrideAnnotation = method.isOverridden();

            // Extract the parameters
            ASTFormalParameters parameters = method.getFormalParameters();
            for (ASTFormalParameter parameter : parameters) {

                ASTVariableDeclaratorId parameterVariableDeclarator = parameter.getVarId();

                MethodParameterTypeContext parameterContext = new MethodParameterTypeContext();
                // Set the properties of the parameterContext based on the parameter
                // now get from a row like: private ArrayList javaArrayList, anotherArrayList[];
                // the individual : javaArrayList and anotherArrayList[]
                // Set the properties of the fieldContext based on the field
                parameterContext.name = parameterVariableDeclarator.getName();

                // TODO: what is is varargs?
                parameterContext.type = this.getQualifiedNameUnsafe(parameterVariableDeclarator.getTypeMirror());
                parameterContext.hasTypeVariable = this.hasTypeVariable(parameterVariableDeclarator.getTypeMirror());

                //parameterContext.key = parameterContext.type+" "+parameterContext.name;
                /**
                if (parameter.isVarargs()) {  // Hypothetical method; check PMD documentation
                    System.out.println("This is a varargs parameter: " + parameter.getImage());
                } else if (parameter.isArray()) {  // Hypothetical method; check PMD documentation
                    System.out.println("This is an array parameter: " + parameter.getImage());
                } else {
                    System.out.println("This is a regular parameter: " + parameter.getImage());
                }
                */


                // Set the position
                parameterContext.position = this.getAstPosition(parameterVariableDeclarator);

                // Extract the modifiers
                ASTModifierList fieldModifiers = parameter.getFirstDescendantOfType(ASTModifierList.class);
                Set<JModifier> modifierSet = fieldModifiers.getEffectiveModifiers();
                if (modifierSet != null) {
                    parameterContext.modifiers = modifierSet.stream().map(Enum::name).collect(Collectors.toList());
                }

                //parameterContext.methodKey = methodContext.key;
                // We cant set the methodKey directly, since the method key is not yet defined

                // Add the parameterContext to the methodContext.parameters
                methodContext.parameters.add(parameterContext);
            }

            // set method key
            // Java method key is the method signature. The signature is: method name + parameters (type and order)
            String methodContextParametersKey = classOrInterfaceKey+"/method/"+method.getMethodName()+"(";
            int amountParameters = methodContext.parameters.size();
            for(int i=0; i<amountParameters; i++){
                MethodParameterTypeContext parameterContext = methodContext.parameters.get(i);
                String parameterTypeAndName = parameterContext.type+" "+parameterContext.name;
                methodContextParametersKey += parameterTypeAndName;
                if(i+1<amountParameters){
                    methodContextParametersKey += ", ";
                }
            }
            methodContextParametersKey += ")";

            for(int i=0; i<amountParameters; i++){
                MethodParameterTypeContext parameterContext = methodContext.parameters.get(i);
                parameterContext.key = methodContextParametersKey+"/parameter/"+parameterContext.name;
            }


            methodContext.key = methodContextParametersKey;


            for(MethodParameterTypeContext parameterContext: methodContext.parameters){
                parameterContext.methodKey = methodContext.key;
            }


            // Add the methodContext to the classContext.methods
            classContext.methods.put(methodContext.key, methodContext);
        }
    }

    private String getClassOrInterfaceKey(ASTClassOrInterfaceDeclaration node){
    /**
     * Returns the key of the class or interface.
     *
     * @param node the ASTClassOrInterfaceDeclaration node
     * @return the key of the class or interface
     */
        String classOrInterfaceKey = node.getCanonicalName();
        if(classOrInterfaceKey==null){
            classOrInterfaceKey = node.getSimpleName();
        }
        return classOrInterfaceKey;
    }

    private void extractClassInformations(ASTClassOrInterfaceDeclaration node, ClassOrInterfaceTypeContext classContext){
    /**
     * Extracts information about a class or interface declaration and populates the provided ClassOrInterfaceTypeContext object.
     *
     * @param node the ASTClassOrInterfaceDeclaration node representing the class or interface
     * @param classContext the ClassOrInterfaceTypeContext object to be populated with class information
     * @throws NullPointerException if either node or classContext is null
     */

        // Set the properties of the classContext based on the node
        classContext.name = node.getSimpleName();
        classContext.key = getClassOrInterfaceKey(node);
        classContext.type = node.isInterface() ? "interface" : "class";
        // Set the position
        AstPosition class_position = new AstPosition();
        class_position.startLine = node.getBeginLine();
        class_position.startColumn = node.getBeginColumn();
        class_position.endLine = node.getEndLine();
        class_position.endColumn = node.getEndColumn();
        classContext.position = class_position;

        classContext.anonymous = node.isAnonymous();

        // Extract the modifiers
        ASTModifierList classModifiers = node.getFirstDescendantOfType(ASTModifierList.class);
        Set<JModifier> classModifierSet = classModifiers.getEffectiveModifiers();
        if (classModifierSet != null) {
            classContext.modifiers = classModifierSet.stream().map(Enum::name).collect(Collectors.toList());
        }
    }

    private boolean hasTypeVariable(JTypeMirror typeMirror){
    /**
     * Checks if the given JTypeMirror contains a type variable.
     *
     * @param typeMirror the JTypeMirror to be checked
     * @return true if the typeMirror contains a type variable, false otherwise
     * @throws NullPointerException if the typeMirror is null
     */
        if(typeMirror instanceof JTypeVar){ // something like: T item ==> T
            return true;
        }

        if(typeMirror instanceof JClassType){
            JClassType downCast = (JClassType) typeMirror;
            List<JTypeMirror> typeMirrors = downCast.getTypeArgs();
            boolean isGeneric = downCast.isGeneric();
            if(isGeneric){
                for(int i = 0; i < typeMirrors.size(); i++){
                    JTypeMirror innerTypeMirror = typeMirrors.get(i);
                    if(innerTypeMirror instanceof JTypeVar){ // something like: T item ==> T
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private String getQualifiedNameUnsafe(JTypeMirror typeMirror){
    /**
     * Generates a qualified name for the given type mirror.
     *
     * @param typeMirror the type mirror for which the qualified name is to be generated
     * @return the qualified name of the given type mirror
     * @throws NullPointerException if the typeMirror is null
     */

        TypePrettyPrint.TypePrettyPrinter typePrettyPrinter = new TypePrettyPrint.TypePrettyPrinter();
        typePrettyPrinter.printAnnotations(false);
        typePrettyPrinter.printMethodHeader(false);
        typePrettyPrinter.printMethodResult(false);
        //typePrettyPrinter.printTypeVarBounds(false);
        typePrettyPrinter.qualifyAnnotations(false);
        typePrettyPrinter.qualifyNames(true);
        typePrettyPrinter.qualifyTvars(false);


        String prettyString = TypePrettyPrint.prettyPrint(typeMirror, typePrettyPrinter);
        //System.out.println("prettyString: "+prettyString);
        // the pretty may not be the fully qualified name as it may have * for classes in the same package
        // so we need to replace * by the package name
        String usedPackageName = MyRule.packageName;
        if(usedPackageName!=null && usedPackageName.length()>0){
            usedPackageName = usedPackageName+"."; // add the dot since the packageName might be "com.example" and the import should be "com.example.*"
        }
        String prettyStringWithPackage = prettyString.replace("*", usedPackageName);
        //System.out.println("prettyStringWithPackage: "+prettyStringWithPackage);
        return prettyStringWithPackage;

    }

    private void extractExtendsAndImplements(ASTClassOrInterfaceDeclaration node, ClassOrInterfaceTypeContext classContext){
    /**
     * Extracts the interfaces and classes that the given class or interface extends or implements.
     *
     * @param node the ASTClassOrInterfaceDeclaration representing the class or interface
     * @param classContext the ClassOrInterfaceTypeContext to store the extracted information
     * @throws NullPointerException if either node or classContext is null
     */

        // Extract the interfaces this class implements
        List<ASTImplementsList> implementsLists = node.findDescendantsOfType(ASTImplementsList.class);
        for (ASTImplementsList implementsList : implementsLists) {
            List<ASTClassOrInterfaceType> interfaces = implementsList.findDescendantsOfType(ASTClassOrInterfaceType.class);
            for (ASTClassOrInterfaceType interfaceType : interfaces) {
                String fullQualifiedName = this.getQualifiedNameUnsafe(interfaceType.getTypeMirror());
                if(fullQualifiedName != null){
                    classContext.implements_.add(fullQualifiedName);
                }
            }
        }

        // Extract the classes this class extends
        List<ASTExtendsList> extendsLists = node.findDescendantsOfType(ASTExtendsList.class);
        for (ASTExtendsList extendsList : extendsLists) {
            List<ASTClassOrInterfaceType> superclasses = extendsList.findDescendantsOfType(ASTClassOrInterfaceType.class);
            for (ASTClassOrInterfaceType superclass : superclasses) {
                String fullQualifiedName = this.getQualifiedNameUnsafe(superclass.getTypeMirror());
                if(fullQualifiedName != null){
                    classContext.extends_.add(fullQualifiedName);
                }
            }
        }
    }

    private ClassOrInterfaceTypeContext visitClassOrInterface(ASTClassOrInterfaceDeclaration node){
    /**
     * Visits a class or interface declaration and extracts information about the class or interface.
     *
     * @param node the ASTClassOrInterfaceDeclaration node to be visited
     * @return an instance of ClassOrInterfaceTypeContext containing information about the class or interface
     * @throws SomeException if there is an error during the visit
     */
        //System.out.println("ASTClassOrInterfaceDeclaration");

        // Create a new instance of your ClassOrInterfaceTypeContext class
        ClassOrInterfaceTypeContext classContext = new ClassOrInterfaceTypeContext();
        this.extractClassInformations(node, classContext);

        classContext.file_path = MyRule.filePath;

        // Extract the fields
        this.extractFields(node, classContext);

        // Extract the methods
        this.extractMethods(node, classContext);

        // Extract the interfaces this class implements
        // Extract the classes this class extends
        this.extractExtendsAndImplements(node, classContext);

        // Set the definedInClassOrInterfaceTypeKey
        ASTClassOrInterfaceDeclaration parentClassOrInterface = node.getFirstParentOfType(ASTClassOrInterfaceDeclaration.class);
        if (parentClassOrInterface != null) {
            classContext.definedInClassOrInterfaceTypeKey = getClassOrInterfaceKey(parentClassOrInterface);
        }

        // recursive call for inner classes
        this.visitInnerClassesOrInterfaces(node, classContext);

        return classContext;
    }

    private void visitInnerClassesOrInterfaces(ASTClassOrInterfaceDeclaration node, ClassOrInterfaceTypeContext classContext){
    /**
     * Visits the inner classes or interfaces of the given class or interface node and adds them to the appropriate map in the class context.
     *
     * @param node the ASTClassOrInterfaceDeclaration representing the outer class or interface
     * @param classContext the ClassOrInterfaceTypeContext representing the context of the outer class or interface
     * @throws NullPointerException if the node or classContext is null
     */
        List<ASTClassOrInterfaceDeclaration> innerClassesAndInterfaces = node.findDescendantsOfType(ASTClassOrInterfaceDeclaration.class);
        for (ASTClassOrInterfaceDeclaration innerClassOrInterface : innerClassesAndInterfaces) {
            ClassOrInterfaceTypeContext innerClassOrInterfaceContext = this.visitClassOrInterface(innerClassOrInterface);
            // Set the properties of the innerClassOrInterfaceContext based on the innerClassOrInterface
            // Add the innerClassOrInterfaceContext to the appropriate map
            if (innerClassOrInterface.isInterface()) {
                classContext.innerDefinedInterfaces.put(innerClassOrInterface.getCanonicalName(), innerClassOrInterfaceContext);
            } else {
                classContext.innerDefinedClasses.put(innerClassOrInterface.getCanonicalName(), innerClassOrInterfaceContext);
            }
        }
    }

    public void setFilePathAndPackageName(ASTClassOrInterfaceDeclaration node){
    /**
     * Sets the file path and package name for the given ASTClassOrInterfaceDeclaration node.
     *
     * @param node the ASTClassOrInterfaceDeclaration node for which the file path and package name are to be set
     * @throws NullPointerException if the node is null
     */
        //System.out.println(node.getCanonicalName());
        AstInfo astInfo = node.getAstInfo();

        String packagename = node.getPackageName();
        MyRule.packageName = packagename;

        TextDocument document = astInfo.getTextDocument();

        FileId fileId = document.getFileId();

        String originalPath = fileId.getOriginalPath();

        String directoryFolder = System.getenv("SOURCE");
        if (directoryFolder.endsWith("/")) {
            directoryFolder = directoryFolder.substring(0, directoryFolder.length() - 1);
        }
        String filePath = originalPath.substring(directoryFolder.length()+1);
        MyRule.filePath = filePath;
    }

    public void handleDublicateDefinition(File file, ClassOrInterfaceTypeContext classContext){
    /**
     * Handles duplicate definition of a class or interface in a file.
     *
     * @param file the file to be processed
     * @param classContext the context of the class or interface type
     * @throws RuntimeException if the class is declared multiple times in the same package
     */
        String currentClassDefinedInFile = classContext.file_path;
        String otherClassDefinedInFilePath = "OTHER FILE COULD NOT BE READ";
        String jsonString = "";

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                jsonString += line;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

       try{
            // Read file_path from JSON file
           ObjectMapper objectMapper = new ObjectMapper();
           // Parse JSON string into JsonNode
           JsonNode jsonNode = objectMapper.readTree(jsonString);

           // Extract and print the value of the key "file_path"
           otherClassDefinedInFilePath = jsonNode.get("file_path").asText();
       } catch (Exception e){
           e.printStackTrace();
       }

        // Stop the program and throw an exception
        throw new RuntimeException("Class ("+classContext.name+") with same package ("+MyRule.packageName+") multiple times declared!. Read the parsed AST file:"+file.getAbsolutePath()+". The class was defined in: "+currentClassDefinedInFile+" - and in: "+otherClassDefinedInFilePath);
    }

    public Object visit(ASTClassOrInterfaceDeclaration node, Object data) {
    /**
     * This method visits the ASTClassOrInterfaceDeclaration node and performs various operations on it.
     * It sets the file path and package name, visits the class or interface, and converts the classContext to JSON and adds it to the output.
     * It also handles file creation, deletion, and writing the output to the file.
     *
     * @param node The ASTClassOrInterfaceDeclaration node to be visited
     * @param data The data object
     * @return null
     * @throws IOException If an I/O error occurs while writing to the file
     */
        this.setFilePathAndPackageName(node); // before visitClassOrInterface
        ClassOrInterfaceTypeContext classContext = this.visitClassOrInterface(node); // after setFilePathAndPackageName

        String GENERATE_REFERENCES_OF_FIELDS_AND_METHODS = System.getenv("GENERATE_REFERENCES_OF_FIELDS_AND_METHODS");
        // TODO: Find the usages of fields and methods. We use this later for easier taxonomy of data-clumps and for refactoring help.
        String IGNORE_WILDCARD_IMPORTS = System.getenv("IGNORE_WILDCARD_IMPORTS");

        boolean debug = false;


        // Convert the classContext to JSON and add it to the output
        String outputRow = MyRule.convertToJson(classContext);
        //String usableFilePath = filePath.replaceAll("/","_");
        String fileName = classContext.key+".json";

        if(debug){
            System.out.println("MyRule.filePath: "+filePath);
            System.out.println("fileName: "+fileName);
            System.out.println(outputRow);
            System.out.println("######################");
        } else {
            // Access the DESTINATION environment variable
            String outputFolder = System.getenv("DESTINATION");
            if (outputFolder == null) {
                outputFolder = "./output";  // Default to current directory if not set
            }

//            String fileName = classContext.key;

            // Create a File object
            File file = new File(outputFolder, fileName);

            // Create output folder if it doesn't exist
            new File(outputFolder).mkdirs();

            // Write the outputRow to the file
            boolean fileExists = file.exists();
            // Problem: In Eclipse there are multiple Classes with the same name and the same package: class ColorDialog
                // EclipseJDTCore3.1/plugins/org.eclipse.swt/Eclipse SWT/carbon/org/eclipse/swt/widgets/ColorDialog.java
                // EclipseJDTCore3.1/plugins/org.eclipse.swt/Eclipse SWT/gtk/org/eclipse/swt/widgets/ColorDialog.java
            // Solution: Use as classContext.key: usableFilePath + classContext.key
            String ignoreDublicateDefinition = System.getenv("IGNORE_DUBLICATE_DEFINITION");
            // Normally the file would never exist, since we delete the output folder before each run
            if(ignoreDublicateDefinition != null){
                ignoreDublicateDefinition = ignoreDublicateDefinition.toLowerCase(); // if the user enters TRUE or True
            }
            if(fileExists){
                if(ignoreDublicateDefinition == null || ignoreDublicateDefinition.equals("true")){
                    // delete the file
                    file.delete();
                } else {
                    this.handleDublicateDefinition(file, classContext);
                }
            }

            try (BufferedWriter writer = new BufferedWriter(new FileWriter(file, false))) {
                writer.write(outputRow);
            } catch (IOException e) {
                e.printStackTrace();
            }

            // Print the absolute path of the file
            System.out.println("AST Generated for: " + file.getAbsolutePath());
        }

        //return super.visit(node, data);
        return null;
    }



}
