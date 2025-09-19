const noop = () => undefined;

module.exports = {
  AzureLogger: {
    info: noop,
    warning: noop,
    error: noop,
  },
  createClientLogger: () => ({
    info: noop,
    warning: noop,
    error: noop,
  }),
  setLogLevel: noop,
  setLogger: noop,
};
