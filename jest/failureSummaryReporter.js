class FailureSummaryReporter {
  onRunComplete(_contexts, aggregatedResults) {
    if (!aggregatedResults || aggregatedResults.numFailedTests === 0) {
      return;
    }

    const rows = [];

    for (const testResult of aggregatedResults.testResults ?? []) {
      for (const assertionResult of testResult.testResults ?? []) {
        if (assertionResult.status !== 'failed') {
          continue;
        }

        const summary = this.extractDataClumpSummary(assertionResult.failureMessages ?? []);
        rows.push({
          testName: summary?.testName ?? assertionResult.fullName ?? assertionResult.title ?? testResult.testFilePath,
          expectedCount: this.formatCount(summary?.expectedCount),
          actualCount: this.formatCount(summary?.actualCount),
        });
      }
    }

    if (rows.length === 0) {
      return;
    }

    this.printTable(rows);
  }

  formatCount(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return 'unbekannt';
  }

  extractDataClumpSummary(failureMessages) {
    for (const message of failureMessages) {
      const sanitizedMessage = message.replace(/\u001b\[[0-9;]*m/g, '');

      const scenarioMatch = /Fehler im Report-Szenario:\s*(.+)/.exec(sanitizedMessage);
      const expectedMatch = /Erwartete Data Clumps:\s*([^\n]+)/.exec(sanitizedMessage);
      const actualMatch = /Gefundene Data Clumps:\s*([^\n]+)/.exec(sanitizedMessage);

      if (scenarioMatch || expectedMatch || actualMatch) {
        return {
          testName: scenarioMatch?.[1]?.trim(),
          expectedCount: this.parseCount(expectedMatch?.[1]),
          actualCount: this.parseCount(actualMatch?.[1]),
        };
      }
    }

    return null;
  }

  parseCount(rawValue) {
    if (!rawValue) {
      return undefined;
    }

    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const numericValue = Number(trimmed);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }

    return trimmed;
  }

  printTable(rows) {
    const lines = [''];

    lines.push('Zusammenfassung fehlgeschlagener Data-Clumps-Tests:');

    for (const row of rows) {
      lines.push(`  - ${row.testName}`);
      lines.push(`      Erwartete Data Clumps: ${row.expectedCount}`);
      lines.push(`      Gefundene Data Clumps: ${row.actualCount}`);
    }

    lines.push('');

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  }
}

module.exports = FailureSummaryReporter;
