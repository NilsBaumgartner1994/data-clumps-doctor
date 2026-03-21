import { PriorityListItem } from './cliGeneratePriorityList';

/**
 * Content of REFACTORING_DATA_CLUMPS.md – embedded here so that every
 * generated GitHub issue contains the full refactoring guide without
 * requiring the file to be present at runtime.
 *
 * ⚠ Keep this in sync with REFACTORING_DATA_CLUMPS.md at the repository root.
 * When REFACTORING_DATA_CLUMPS.md is updated, this constant must be updated
 * to match so that generated issue bodies reflect the latest guidance.
 */
const REFACTORING_DATA_CLUMPS_GUIDE = `# Refactoring Strategies for Each Data Clump Type

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

- Extract shared fields into a new **class** (preferred over an interface)
  (e.g. class Address with street, city, zip)
- Replace duplicated fields with a reference to this class
- If a suitable class already exists, **reuse it** instead of creating a new one

**Alternative:**

- Use inheritance:
  - Move shared fields into a superclass

**Key Property:**

- Bidirectional
  → Refactoring can start from either class

**When to use what:**

- Reuse existing class → if a matching class already exists (most preferred)
- Extract Class → if the data represents a meaningful concept and no suitable class exists; **use a class, not an interface**
- Inheritance → if classes share a structural identity

**Note on classes vs. interfaces:**

> Prefer generating a **class** over an interface for the extracted data clump type.
> Classes can carry behaviour, be instantiated directly, and are easier to evolve.
> Only use an interface when you explicitly need a structural contract without implementation.

---

### 2.2 Parameter–Parameter Data Clumps (Bidirectional)

**Definition:**
A group of parameters appears repeatedly across multiple methods.

**Refactoring Strategy:**

- Introduce a parameter object
  (replace multiple parameters with a single **class** instance; prefer a class over an interface)
- If a suitable class already exists, **reuse it** instead of creating a new one
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
2. Check if a suitable **class** already exists

   - Yes → **reuse existing class** (most preferred)
   - No → create new abstraction as a **class** (preferred over an interface)

3. Determine type:
   - Field–Field → refactor either side
   - Parameter–Parameter → refactor all methods consistently
   - Parameter–Field → refactor parameters only

> **Prefer classes over interfaces** when creating a new data clump type.
> Reuse existing classes whenever possible before introducing a new one.

---

## 6. Core Insight

- Bidirectional data clumps represent symmetric duplication
  → flexible refactoring

- Unidirectional data clumps represent asymmetric inconsistency
  → only one correct refactoring direction
`;

export interface IssueMarkdownOptions {
  /** Base URL of the GitHub repository, e.g. https://github.com/owner/repo */
  projectUrl?: string;
  /** Commit hash used to build stable permalink URLs */
  commitHash?: string;
  /**
   * Optional path prefix relative to the repository root that should be prepended
   * to all file paths when building GitHub permalink URLs.
   * Use this when the source files are not at the repository root, e.g. "src" or "src/main/java".
   * Corresponds to the `--relative_path_to_source_folder_in_project` option of the detector.
   */
  sourcePrefix?: string;
  /**
   * Maximum number of characters allowed in the generated issue body.
   * Matches the GitHub issue body limit (65,536 by default).
   * Set to 0 or -1 to disable the limit entirely.
   */
  charLimit?: number;
}

/**
 * Generates GitHub-flavoured Markdown for a data-clump refactoring issue.
 *
 * Usage:
 *   const md = IssueMarkdownGenerator.generate(priorityList, { projectUrl, commitHash });
 *   // → pass md as the issue body to `gh issue create --body "..."`
 */
export class IssueMarkdownGenerator {
  /**
   * Builds a clickable GitHub blob permalink or returns null when the
   * required information is not available.
   */
  private static buildLink(options: IssueMarkdownOptions, filePath: string, startLine: number | null, endLine: number | null): string | null {
    const { projectUrl, commitHash, sourcePrefix } = options;
    if (!projectUrl || projectUrl === 'unknown' || !commitHash || commitHash === 'unknown' || !filePath) {
      return null;
    }
    const normalizedPrefix = sourcePrefix
      ? sourcePrefix
          .replace(/^\.\//, '') // strip leading ./
          .replace(/^\//, '') // strip leading /
          .replace(/\/$/, '') // strip trailing /
          .replace(/\/\//g, '/') // collapse duplicate slashes
      : '';
    // Do not use the prefix if it escapes the repository root (e.g. starts with "..")
    const safePrefix = normalizedPrefix && !normalizedPrefix.startsWith('..') ? normalizedPrefix : '';
    const fullPath = safePrefix ? `${safePrefix}/${filePath}` : filePath;
    const base = `${projectUrl.replace(/\/$/, '')}/blob/${commitHash}/${fullPath}`;
    if (startLine != null && endLine != null) {
      return `${base}#L${startLine}-L${endLine}`;
    }
    if (startLine != null) {
      return `${base}#L${startLine}`;
    }
    return base;
  }

  /** Formats a list of variable names as an inline code-separated string. */
  private static formatVariableNames(names: string[]): string {
    return names.map(n => `\`${n}\``).join(', ');
  }

  /**
   * Renders one data-clump entry as a markdown section.
   */
  private static renderItem(item: PriorityListItem, options: IssueMarkdownOptions, index: number): string {
    const fromLink = IssueMarkdownGenerator.buildLink(options, item.from_file_path, item.from_start_line, item.from_end_line);
    const toLink = IssueMarkdownGenerator.buildLink(options, item.to_file_path, item.to_start_line, item.to_end_line);

    const lines: string[] = [`### ${index}. Data Clump:`, '', `The classes \`${item.from_class_or_interface_name}\` and \`${item.to_class_or_interface_name}\` share **${item.amount_of_variables}** variable(s): ${IssueMarkdownGenerator.formatVariableNames(item.variable_names)}.`];

    if (fromLink || toLink) {
      const affectedLines: string[] = ['', '<details>', '<summary>Affected locations</summary>', ''];
      if (fromLink) {
        affectedLines.push('From', '', fromLink, '');
      }
      if (toLink) {
        affectedLines.push('To', '', toLink, '');
      }
      affectedLines.push('</details>');
      lines.push(...affectedLines);
    }

    const rawJson = item.raw !== undefined && item.raw !== null ? item.raw : item;
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>Raw JSON</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(rawJson, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('</details>');

    return lines.join('\n');
  }

  /**
   * Generates the full markdown body for a GitHub issue from a priority list.
   *
   * Multiple data-clump entries are separated by a horizontal rule (`----`).
   *
   * When `options.charLimit` is a positive number, the method stops adding
   * data-clump entries as soon as the next entry would push the total character
   * count beyond that limit, ensuring the output always fits within the allowed
   * size (e.g. GitHub's 65 536 character issue-body limit).
   * Set `options.charLimit` to `0` or `-1` to disable this behaviour.
   */
  static generate(items: PriorityListItem[], options: IssueMarkdownOptions = {}): string {
    if (items.length === 0) {
      return '_No data clumps found._\n';
    }

    const charLimit = options.charLimit;
    const useCharLimit = typeof charLimit === 'number' && charLimit > 0;

    const refactoringGuideSection = ['<details>', '<summary>How to refactor data clumps</summary>', '', REFACTORING_DATA_CLUMPS_GUIDE, '</details>', '', ''].join('\n');

    const footer = ['', '', '_Automatically generated by [data-clumps-doctor](https://github.com/NilsBaumgartner1994/data-clumps-doctor). For refactoring strategies, see [REFACTORING_DATA_CLUMPS.md](https://github.com/NilsBaumgartner1994/data-clumps-doctor/blob/main/REFACTORING_DATA_CLUMPS.md)._'].join('\n');

    const separator = '\n\n----\n\n';

    const buildHeader = (count: number) =>
      ['## Data Clump Refactoring Task', '', `Detected **${count}** data clump(s) that should be refactored. Please extract the shared variables into a dedicated class or parameter object and update all usages accordingly.`, ''].join('\n');

    if (!useCharLimit) {
      const header = buildHeader(items.length);
      const sections = items.map((item, i) => IssueMarkdownGenerator.renderItem(item, options, i + 1)).join(separator);
      return header + refactoringGuideSection + sections + footer;
    }

    // Char-limit mode: include as many items as fit within the allowed length.
    const renderedItems: string[] = [];
    const fixedLength = refactoringGuideSection.length + footer.length;
    let accumulatedItemsLength = 0;

    for (let i = 0; i < items.length; i++) {
      const renderedItem = IssueMarkdownGenerator.renderItem(items[i], options, i + 1);
      const candidateCount = renderedItems.length + 1;
      const headerLength = buildHeader(candidateCount).length;
      const separatorsLength = separator.length * (candidateCount - 1);
      const candidateTotal = fixedLength + headerLength + separatorsLength + accumulatedItemsLength + renderedItem.length;

      if (candidateTotal > charLimit) {
        break;
      }

      renderedItems.push(renderedItem);
      accumulatedItemsLength += renderedItem.length;
    }

    if (renderedItems.length === 0) {
      return '_No data clumps found._\n';
    }

    const header = buildHeader(renderedItems.length);
    const sections = renderedItems.join(separator);
    return header + refactoringGuideSection + sections + footer;
  }
}
