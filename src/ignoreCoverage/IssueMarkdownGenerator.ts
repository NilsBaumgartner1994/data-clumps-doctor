import { PriorityListItem } from './cliGeneratePriorityList';

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

  /** Renders a single location line (file path, optionally as a markdown link). */
  private static renderLocation(className: string, filePath: string, link: string | null): string {
    if (!filePath) return '(unknown)';
    const classLabel = className ? `\`${className}\` in ` : '';
    if (link) return `${classLabel}${filePath} – [view lines](${link})`;
    return `${classLabel}${filePath}`;
  }

  /**
   * Renders one data-clump entry as a markdown section.
   */
  private static renderItem(item: PriorityListItem, options: IssueMarkdownOptions, index: number): string {
    const fromLink = IssueMarkdownGenerator.buildLink(options, item.from_file_path, item.from_start_line, item.from_end_line);
    const toLink = IssueMarkdownGenerator.buildLink(options, item.to_file_path, item.to_start_line, item.to_end_line);

    const fromLocation = IssueMarkdownGenerator.renderLocation(item.from_class_or_interface_name, item.from_file_path, fromLink);
    const toLocation = IssueMarkdownGenerator.renderLocation(item.to_class_or_interface_name, item.to_file_path, toLink);

    const methodInfo: string[] = [];
    if (item.from_method_name) methodInfo.push(`**From method:** \`${item.from_method_name}\``);
    if (item.to_method_name) methodInfo.push(`**To method:** \`${item.to_method_name}\``);

    const lines: string[] = [`### ${index}. Data Clump:`, '', `The classes \`${item.from_class_or_interface_name}\` and \`${item.to_class_or_interface_name}\` share **${item.amount_of_variables}** variable(s): ${IssueMarkdownGenerator.formatVariableNames(item.variable_names)}.`, '', '**Affected locations**', '', `- **From:** ${fromLocation}`, `- **To:** ${toLocation}`];

    if (methodInfo.length > 0) {
      lines.push('');
      methodInfo.forEach(m => lines.push(`- ${m}`));
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
   */
  static generate(items: PriorityListItem[], options: IssueMarkdownOptions = {}): string {
    if (items.length === 0) {
      return '_No data clumps found._\n';
    }

    const header = ['## Data Clump Refactoring Task', '', `Detected **${items.length}** data clump(s) that should be refactored. Please extract the shared variables into a dedicated class or parameter object and update all usages accordingly.`, ''].join('\n');

    const sections = items.map((item, i) => IssueMarkdownGenerator.renderItem(item, options, i + 1)).join('\n\n----\n\n');

    const footer = ['', '', '_Automatically generated by [data-clumps-doctor](https://github.com/NilsBaumgartner1994/data-clumps-doctor). For refactoring strategies, see [REFACTORING_DATA_CLUMPS.md](https://github.com/NilsBaumgartner1994/data-clumps-doctor/blob/main/REFACTORING_DATA_CLUMPS.md)._'].join('\n');

    return header + sections + footer;
  }
}
