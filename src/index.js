const evaluateRule = (key, ruleName, data) => {

}

class Validator {
  constructor () {
    this.rules = {
      required: (key, data) => !!data[key].toString() ? undefined : `The ${key} field is required.`,
      integer: (key, data) => /^[0-9]+$/i.test(data[key].toString()) ? undefined : `The ${key} field must be an integer value.`,
      decimal: (key, data) => /^[0-9.]+$/i.test(data[key].toString()) ? undefined : `The ${key} field must be an integer value.`,
    };
  }

  getRules(ruleList) {
    return ruleList.split('|');
  }

  async validate (data, rules) {
    const validationResults = await Promise.all(
      Object.keys(data).flatMap(
        async (key) => {
          const thisKeyRules = this.getRules(rules[key]);
          return ({
            key,
            validationResult: (await Promise.all(
              thisKeyRules.map((ruleName) => this.evaluateRule(ruleName, key, data)),
            )).filter((error) => error)
          });
        },
      ),
    );
    let errorCount = 0;
    const errors = {
      ...validationResults.reduce((prev, cur) => {
        prev[cur.key] = cur.validationResult;
        errorCount += cur.validationResult.length;
        return prev;
      }, {})
    };
    const result = {
      errorCount,
      errors,
    };
    return result;
  }

  addRule (name, ruleDefinition) {
    const { rule, errorTextFunction } = ruleDefinition;
    this.rules[name] = async (key, data) => !!(await rule(key, data)) ? undefined : errorTextFunction(key, data);
  }

  evaluateRule(ruleName, key, data) {
    if (!this.rules[ruleName]) {
      return undefined;
    }
    return this.rules[ruleName](key, data);
  }
}

module.exports = {
  create: () => new Validator(),
};