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
    const marker = 'DATA_CLUMP_MISMATCH_SUMMARY::';

    for (const message of failureMessages) {
      const markerIndex = message.indexOf(marker);
      if (markerIndex === -1) {
        continue;
      }

      const startIndex = markerIndex + marker.length;
      const endIndex = message.indexOf('\n', startIndex);
      const rawJson = (endIndex === -1 ? message.slice(startIndex) : message.slice(startIndex, endIndex)).trim();
      const sanitizedJson = rawJson.replace(/\u001b\[[0-9;]*m/g, '').trim();

      try {
        const parsed = JSON.parse(sanitizedJson);
        return {
          testName: parsed.testName,
          expectedCount: parsed.expectedCount,
          actualCount: parsed.actualCount,
        };
      } catch (_error) {
        return null;
      }
    }

    return null;
  }

  printTable(rows) {
    const headers = ['Test', 'Erwartete Data Clumps', 'Gefundene Data Clumps'];
    const columnGetters = [
      row => row.testName,
      row => row.expectedCount,
      row => row.actualCount,
    ];

    const columnWidths = headers.map((header, index) => {
      const values = rows.map(row => String(columnGetters[index](row) ?? ''));
      const widestValue = values.reduce((max, value) => Math.max(max, value.length), 0);
      return Math.max(header.length, widestValue);
    });

    const separator = `+-${columnWidths.map(width => '-'.repeat(width)).join('-+-')}-+`;
    const formatRow = values =>
      `| ${values
        .map((value, index) => String(value).padEnd(columnWidths[index], ' '))
        .join(' | ')} |`;

    const lines = [
      '',
      'Zusammenfassung fehlgeschlagener Data-Clumps-Tests:',
      separator,
      formatRow(headers),
      separator,
      ...rows.map(row => formatRow(columnGetters.map(getter => getter(row)))),
      separator,
      '',
    ];

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  }
}

module.exports = FailureSummaryReporter;
