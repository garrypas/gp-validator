const getRules = (ruleList) => Array.isArray(ruleList)
  ? ruleList
  : ruleList?.split('|') || [];

class Validator {
  #rules;
  #errorMessages;
  constructor () {
    this.#errorMessages = {
      required: (key) => `The ${key} field is required.`,
      integer: (key) => `The ${key} field must be an integer value.`,
      decimal: (key) => `The ${key} field must be a decimal value.`,
    }
    this.#rules = {
      required: (key, data) => !!data[key].toString() ? undefined : this.#errorMessages.required(key, data),
      integer: (key, data) => /^[0-9]+$/i.test(data[key].toString()) ? undefined : this.#errorMessages.integer(key, data),
      decimal: (key, data) => /^[0-9.]+$/i.test(data[key].toString()) ? undefined : this.#errorMessages.decimal(key, data),
    };
  }

  async validate (data, rules) {
    const validationResults = await Promise.all(
      Object.keys(data).flatMap(
        async (key) => {
          const thisKeyRules = getRules(rules[key]);
          return ({
            key,
            validationResult: (await Promise.all(
              thisKeyRules.map(async (ruleItem) => {
                if (typeof ruleItem === 'string') {
                  return this.#evaluateRule(ruleItem, key, data);
                }
                const result = await this.#evaluateRule(ruleItem.name, key, data);
                if (result) {
                  return ruleItem.rule(key, data);
                }
                return result;
              }),
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
    this.#rules[name] = async (key, data) => !!(await rule(key, data)) ? undefined : errorTextFunction(key, data);
  }

  setErrorHandler (name, handler) {
    this.#errorMessages[name] = handler;
  }

  #evaluateRule(ruleName, key, data) {
    if (!this.#rules[ruleName]) {
      return undefined;
    }
    return this.#rules[ruleName](key, data);
  }
}

module.exports = {
  create: () => new Validator(),
};