package com.example;

import java.util.List;

class Hero<T extends Number> {

    T item;
    List noVarType;
    List<T> varType;
    List<? extends Number> extendsType;
    List<Number> noVarTypeWithNumber;

        /**
         * Removes the specified item from the lookup.
         *
         * @param item the item to be removed from the lookup
         * @throws NullPointerException if the specified item is null
         */
    private void lookupRemoveItem(T item) {
            // Implementation here
        }

}
