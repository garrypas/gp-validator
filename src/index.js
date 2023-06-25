const getRules = (ruleList) => Array.isArray(ruleList) 
  ? ruleList
  : ruleList?.split('|') || [];

const cleanKey = (str) => {
  const parts = str.split('.');
  return parts[parts.length - 1];
}

const flattenObject = (obj, prefix = '') =>
  Object.entries(obj).reduce(
    (flattened, [key, value]) =>
      typeof value === 'object' && !Array.isArray(value)
        ? {
          ...flattened,
          ...flattenObject(value, `${prefix}${key}.`)
        }
        : Object.assign(flattened, { [`${prefix}${key}`]: value }),
    {}
  );

const unFlattenObject = (obj) => {
  return Object.keys(obj).reduce((prev, cur) => {
    const index = cur.indexOf('.');
    const part1 = index !== -1 ? cur.substring(0, index) : cur;
    const part2 = index !== -1 ? cur.substring(index + 1) : undefined;
    if (!part2) {
      prev[cur] = obj[cur];
      return prev;
    }
    prev[part1] = {
      ...prev[part1],
      ...unFlattenObject({ [part2]: obj[cur] }),
    };
    return prev;
  }, {});
}

class Validator {
  #rules;
  #errorMessages;
  constructor () {
    this.#errorMessages = {
      required: (key, data) => Array.isArray(data[key])
        ? `At least one value must be selected for the ${cleanKey(key)} field.`
        : `The ${cleanKey(key)} field is required.`,
      integer: (key) => `The ${cleanKey(key)} field must be an integer value.`,
      decimal: (key) => `The ${cleanKey(key)} field must be a decimal value.`,
    }
    this.#rules = {
      required: (key, data) => !!data[key].toString() ? undefined : this.#errorMessages.required(key, data),
      integer: (key, data) => /^[0-9]+$/i.test(data[key].toString()) ? undefined : this.#errorMessages.integer(key, data),
      decimal: (key, data) => /^[0-9.]+$/i.test(data[key].toString()) ? undefined : this.#errorMessages.decimal(key, data),
    };
  }

  async validate (data, rules) {
    const flatData = flattenObject(data);
    const flatRules = flattenObject(rules);

    const validationResults = await Promise.all(
      Object.keys(flatData).flatMap(
        async (key) => {
          const thisKeyRules = getRules(flatRules[key]);
          return ({
            key,
            validationResult: (await Promise.all(
              thisKeyRules.map(async (ruleItem) => {
                if (typeof ruleItem === 'string') {
                  return this.#evaluateRule(ruleItem, key, flatData);
                }
                const result = await this.#evaluateRule(ruleItem.name, key, flatData);
                if (result) {
                  return ruleItem.errorMessage(key, data);
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
      errors: unFlattenObject(errors),
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