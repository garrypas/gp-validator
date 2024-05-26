const getRules = (ruleList) => Array.isArray(ruleList) 
  ? ruleList
  : ruleList?.split('|') || [];

const cleanKey = (str) => {
  const parts = str.split('.');
  return parts[parts.length - 1];
}

const flattenObject = (obj, prefix = '') => {
  if (!obj) {
    return {};
  }
  return Object.entries(obj).reduce(
    (flattened, [key, value]) =>
      typeof value === 'object' && !Array.isArray(value)
        ? {
          ...flattened,
          ...flattenObject(value, `${prefix}${key}.`)
        }
        : Object.assign(flattened, { [`${prefix}${key}`]: value }),
    {}
  );
}

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

const extractArguments = (func) => {
  const argumentRegex = /\((.*?)\)/;
  const argumentMatches = func.toString().match(argumentRegex);
  if (!argumentMatches?.length || argumentMatches.length < 2) {
    return [];
  }

  const argumentString = argumentMatches[1];
  if (argumentString.trim() === '') {
    return [];
  }
  
  return argumentString.split(',').map(arg => arg.trim());
}

const createDecimalRegex = (args = []) => {
  return new RegExp(`^\\d+(?:\\.\\d{${args[0] ?? 1},${args[1] ?? args[0] ?? ''}})?$`);
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
      money: (key) => `The ${cleanKey(key)} field must be a valid monetary value.`,
      length: (key, data, args = []) =>
        `The ${cleanKey(key)} field must be ${
          args[0] && args[0] !== '0' ? `greater than ${args[0]}` : ''
        }${
          args[0] && args[0] !== '0' && args[1] ? ' and ' : ''
        }${
          args[1] ? `less than ${args[1]}` : ''
        } in length.`,
    }
    this.#rules = {
      required: (key, data) => !!data[key]?.toString() ? undefined : this.#errorMessages.required(key, data),
      integer: (key, data) => /^[0-9]*$/i.test(data[key].toString()) ? undefined : this.#errorMessages.integer(key, data),
      decimal: (key, data, args = []) =>
        data[key] && !createDecimalRegex(args).test(data[key].toString())
          ? this.#errorMessages.decimal(key, data)
          : undefined,
      money: (key, data) => data[key] && !createDecimalRegex([1, 2]).test(data[key]) 
        ? this.#errorMessages.money(key, data)
        : undefined,
      length: (key, data, args = []) => {
        const minLength = args[0] ? parseInt(args[0]) : 0;
        const maxLength = args[1] ? parseInt(args[1]) : Number.MAX_SAFE_INTEGER;
        const value = data[key];
        if (minLength > maxLength) {
          throw new Error(`Invalid validation defintion for ${key}; minLength must be smaller than maxLength`)
        }
        return value.length < minLength || value.length > maxLength
          ? this.#errorMessages.length(key, data, args)
          : undefined;
      },
    };
  }

  async validate (data, rules) {
    const flatData = flattenObject(data);
    const flatRules = flattenObject(rules);

    const validationResults = await Promise.all(
      Object.keys(flatRules).flatMap(
        async (key) => {
          const thisKeyRules = getRules(flatRules[key]);
          return ({
            key,
            validationResult: (await Promise.all(
              thisKeyRules.map(async (ruleItem) => {
                if (typeof ruleItem === 'string') {
                  return this.#getError(ruleItem, key, flatData);
                }
                const isValid = ruleItem.rule
                  ? await ruleItem.rule(key, flatData)
                  : !(await this.#getError(ruleItem.name, key, flatData));

                if (!isValid) {
                  return ruleItem.errorMessage(key, data);
                }
                return undefined;
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
    const { rule, errorMessage } = ruleDefinition;
    this.#rules[name] = async (key, data) => !!(await rule(key, data)) ? undefined : errorMessage(key, data);
  }

  setErrorHandler (name, handler) {
    this.#errorMessages[name] = handler;
  }

  #getError(ruleName, key, data) {
    const args = extractArguments(ruleName);
    ruleName = ruleName.split('(')[0];
    if (!this.#rules[ruleName]) {
      return undefined;
    }
    return this.#rules[ruleName](key, data, args);
  }
}

module.exports = {
  create: () => new Validator(),
};