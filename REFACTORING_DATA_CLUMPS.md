# Refactoring Strategies for Each Data Clump Type

## 1. General Principle

All data clumps follow the same core idea:

> Recurring groups of variables should be transformed into an explicit abstraction.

Typical refactorings:

- Extract Class
- Introduce Parameter Object
- Preserve Whole Object
- Optional: Inheritance instead of composition

However, the applicability depends on the data clump type and its directionality.

---

## 2. Data Clump Types and Refactoring

### 2.1 Field–Field Data Clumps (Bidirectional)

**Definition:**  
A group of fields appears in multiple classes.

**Refactoring Strategy:**

- Extract shared fields into a new class  
  (e.g. class Address with street, city, zip)
- Replace duplicated fields with a reference to this class

**Alternative:**

- Use inheritance:
  - Move shared fields into a superclass

**Key Property:**

- Bidirectional  
  → Refactoring can start from either class

**When to use what:**

- Extract Class → if the data represents a meaningful concept
- Inheritance → if classes share a structural identity

---

### 2.2 Parameter–Parameter Data Clumps (Bidirectional)

**Definition:**  
A group of parameters appears repeatedly across multiple methods.

**Refactoring Strategy:**

- Introduce a parameter object  
  (replace multiple parameters with a single object)
- Update all affected method signatures consistently

**Optional:**

- Preserve Whole Object if a suitable object already exists

**Key Property:**

- Bidirectional  
  → Any method can be refactored first

**Important:**

- Refactoring must be applied consistently  
  → Otherwise, a Parameter–Field Data Clump may emerge

---

### 2.3 Parameter–Field Data Clumps (Unidirectional)

**Definition:**  
A group of method parameters corresponds to fields of a class.

**Example (conceptual):**

- Method parameters: morning, noon, evening
- Class fields: morning, noon, evening

---

## 3. Key Property: Unidirectionality

- Refactoring has a fixed direction
- Refactoring must start from the method side (parameters)

---

### Correct Refactoring Strategy

- Replace parameters with the existing object:

  - fn(morning, noon, evening)
  - becomes
  - fn(medicineObject)

- Reuse the existing class instead of creating a new one

---

### Why Not the Other Direction?

- Extracting fields or creating a new class: → only shifts the problem → results again in a
  parameter–field data clump

---

### Typical Cause

- Incomplete refactoring:
  - Parameters were extracted into a class
  - But not all usages were updated

→ Leads to inconsistent structures (parameters + fields)

---

## 4. Comparison of Data Clump Types

| Type                | Direction      | Refactoring Freedom | Strategy                       |
| ------------------- | -------------- | ------------------- | ------------------------------ |
| Field–Field         | Bidirectional  | High                | Extract Class / Inheritance    |
| Parameter–Parameter | Bidirectional  | High                | Parameter Object               |
| Parameter–Field     | Unidirectional | Restricted          | Replace Parameters with Object |

---

## 5. Practical Decision Logic

1. Identify data clump
2. Check if a suitable class already exists

   - Yes → reuse existing class (preferred)
   - No → create new abstraction

3. Determine type:
   - Field–Field → refactor either side
   - Parameter–Parameter → refactor all methods consistently
   - Parameter–Field → refactor parameters only

---

## 6. Core Insight

- Bidirectional data clumps represent symmetric duplication  
  → flexible refactoring

- Unidirectional data clumps represent asymmetric inconsistency  
  → only one correct refactoring direction
