const { create } = require("./index");

const rules = {
  title: 'required',
  price: 'decimal',
  numField: 'required|integer',
  fish: 'fish-names',
  items: 'required',
  nested: {
    field1: {
      field1a: 'required',
    },
    field2: 'requird',
  },
};

describe('integration tests', () => {
  let data;
  let validator;
  beforeEach(() => {
    validator = create();
    data = {
      title: 'Hello World',
      price: '1000.00',
      numField: 1,
      items: [ 1, 2, 3 ],
      nested: {
        field1: {
          field1a: 'Hello Again',
        },
        field2: 'Goodbye',
      }
    };
  });

  test('should pass validation when everything is valid', async () => {
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(0);
  });

  test('should fail when required value is empty', async () => {
    data.title = '';
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.title).toHaveLength(1);
    expect(result.errors.title).toContain(`The title field is required.`);
  });

  test('should fail when numeric value is empty', async () => {
    data.price = '';
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.price).toHaveLength(1);
    expect(result.errors.price).toContain(`The price field must be a decimal value.`);
  });

  test('should validate multiple rules', async () => {
    data.numField = '';
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(2);
    expect(result.errors.numField).toHaveLength(2);
    expect(result.errors.numField).toEqual([
      'The numField field is required.',
      'The numField field must be an integer value.',
    ]);
  });

  test('should be able to add a custom rule', async () => {
    validator.addRule('fish-names', {
      rule: (key, data) => ['cod', 'tuna', 'pike', 'trout', 'salmon'].includes(data[key]),
      errorTextFunction: (key, _) => `The ${key} field does not contain a valid type of fish.`,
    });
    data.fish = 'cow';
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.fish).toHaveLength(1);
    expect(result.errors.fish).toContain(`The fish field does not contain a valid type of fish.`);
  });

  test('should be able to add a custom async rule', async () => {
    validator.addRule('fish-names', {
      rule: async (key, data) => ['cod', 'tuna', 'pike', 'trout', 'salmon'].includes(data[key]),
      errorTextFunction: (key, _) => `The ${key} field does not contain a valid type of fish.`,
    });
    data.fish = 'cow';
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.fish).toHaveLength(1);
    expect(result.errors.fish).toContain(`The fish field does not contain a valid type of fish.`);
  });

  test('should be able to change the default error message for a rule', async () => {
    data.title = '';
    validator.setErrorHandler('required', (key, data) => `Il titolo "${data.title}" non e buona per ${key}`)
    const result = await validator.validate(data, rules);
    expect(result.errors.title).toContain(`Il titolo "" non e buona per title`);
  });

  test('should validate ok when error message text for a specific field being validated and input is valid', async () => {
    const newRules = {
      ...rules,
      title: [{
        name: 'required',
        rule: (key, data) => `The value "${data.title}" for ${key} was empty.`,
      }],
    }
    const result = await validator.validate(data, newRules);
    expect(result.errors.title).toHaveLength(0);
  });

  test('should be able to change the error message text for a specific field being validated', async () => {
    data.title = '';
    data.description = '';
    const newRules = {
      ...rules,
      title: [{
        name: 'required',
        errorMessage: (key, data) => `The value "${data.title}" for ${key} was empty.`,
      }],
      description: 'required',
    }
    const result = await validator.validate(data, newRules);
    expect(result.errors.title).toContain(`The value "" for title was empty.`);
    expect(result.errors.description).toHaveLength(1);
  });

  test('should fail when array is empty', async () => {
    data.items = [];
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.items).toHaveLength(1);
    expect(result.errors.items).toContain('At least one value must be selected for the items field.');
  });

  test('should validate nested fields', async () => {
    data.nested.field1.field1a = '';
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.nested.field1.field1a).toHaveLength(1);
    expect(result.errors.nested.field1.field1a).toContain('The field1a field is required.');
  });

  test('should validate nested with object definition', async () => {
    data.nested.field1.field1a = '';
    const newRules = {
      ...rules,
      nested: {
        field1: {
          field1a: [{
            name: 'required',
            errorMessage: (key, data) => `The value "${data.nested.field1.field1a}" for ${key} was empty.`,
          }],
        },
      },
    };
    const result = await validator.validate(data, newRules);
    expect(result.errorCount).toBe(1);
    expect(result.errors.nested.field1.field1a).toHaveLength(1);
    expect(result.errors.nested.field1.field1a).toContain('The value "" for nested.field1.field1a was empty.');
  });
})