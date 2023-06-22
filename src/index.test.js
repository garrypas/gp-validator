const { create } = require("./index");

const rules = {
  title: 'required',
  price: 'decimal',
  numField: 'required|integer',
  fish: 'fish-names',
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
})