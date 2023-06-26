module.exports = {
  regex: (regexExpression) => {
    const regExpImpl = new RegExp(regexExpression);
    return {
      rule: async (key, data) => regExpImpl.test(data[key]),
      errorMessage: (key, _) => `The ${key} field is invalid.`,
    };
  },
};
