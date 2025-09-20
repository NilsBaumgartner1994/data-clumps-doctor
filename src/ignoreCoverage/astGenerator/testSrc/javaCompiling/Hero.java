package com.example;

import java.util.List;

class Hero<T extends Number> {

    T item;
    List noVarType;
    List<T> varType;
    List<? extends Number> extendsType;
    List<Number> noVarTypeWithNumber;

    private void lookupRemoveItem(T item) {
            // Implementation here
        }

}
