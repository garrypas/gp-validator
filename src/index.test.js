const { create } = require("./index");
const ruleDefinitions = require("./rule-definitions");

describe('integration tests', () => {
  let validator;
  beforeEach(() => {
    validator = create();
  });

  test('should pass validation when everything is valid', async () => {
    const data = {
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
        field2: 'required',
      },
    };
    const result = await validator.validate(data, rules);
    expect(result.errorCount).toBe(0);
  });

  test('should fail when required value is empty', async () => {
    const result = await validator.validate({ title: '' }, { title: 'required' });
    expect(result.errors.title).toContain(`The title field is required.`);
    expect(result.errors.title).toHaveLength(1);
    expect(result.errorCount).toBe(1);
  });

  test('should fail when invalid decimal is provided', async () => {
    const result = await validator.validate({ price: 'fish' }, { price: 'decimal' });
    expect(result.errors.price).toContain(`The price field must be a decimal value.`);
    expect(result.errors.price).toHaveLength(1);
    expect(result.errorCount).toBe(1);
  });

  test('should validate multiple rules', async () => {
    const result = await validator.validate({ numField: '' }, { numField: 'required|integer' });
    expect(result.errors.numField).toEqual([
      'The numField field is required.',
    ]);
    expect(result.errors.numField).toHaveLength(1);
    expect(result.errorCount).toBe(1);

    const result2 = await validator.validate({ numField: 'oops' }, { numField: 'required|integer' });
    expect(result2.errors.numField).toEqual([
      'The numField field must be an integer value.',
    ]);
    expect(result2.errors.numField).toHaveLength(1);
    expect(result2.errorCount).toBe(1);
  });

  test('should be able to add a custom rule', async () => {
    validator.addRule('fish-names', {
      rule: (key, data) => ['cod', 'tuna', 'pike', 'trout', 'salmon'].includes(data[key]),
      errorMessage: (key, _) => `The ${key} field does not contain a valid type of fish.`,
    });

    const result = await validator.validate({ fish: 'cow' }, { fish: 'fish-names' });
    expect(result.errors.fish).toContain(`The fish field does not contain a valid type of fish.`);
    expect(result.errors.fish).toHaveLength(1);
    expect(result.errorCount).toBe(1);
  });

  test('should be able to add a custom async rule', async () => {
    validator.addRule('fish-names', {
      rule: async (key, data) => ['cod', 'tuna', 'pike', 'trout', 'salmon'].includes(data[key]),
      errorMessage: (key, _) => `The ${key} field does not contain a valid type of fish.`,
    });
    const result = await validator.validate({ fish: 'cow' }, { fish: 'fish-names' });
    expect(result.errors.fish).toContain(`The fish field does not contain a valid type of fish.`);
    expect(result.errors.fish).toHaveLength(1);
    expect(result.errorCount).toBe(1);
  });

  test('should be able to change the default error message for a rule', async () => {
    validator.setErrorHandler('required', (key, data) => `Il titolo "${data.title}" non e buona per ${key}`)
    const result = await validator.validate({ title: '' }, { title: 'required' });
    expect(result.errors.title).toContain(`Il titolo "" non e buona per title`);
  });

  test('should validate ok when error message text for a specific field being validated and input is valid', async () => {
    const result = await validator.validate({ title: 'War and Peace' }, {
      title: [{
        name: 'required',
        errorMessage: (key, data) => `The value "${data.title}" for ${key} was empty.`,
      }]
    });
    expect(result.errors.title).toHaveLength(0);
  });

  test('should be able to change the error message text for a specific field being validated', async () => {
    const rules = {
      title: [{
        name: 'required',
        errorMessage: (key, data) => `The value "${data.title}" for ${key} was empty.`,
      }],
      description: 'required',
    }
    const result = await validator.validate({
      title: '', description: ''
    }, rules);
    expect(result.errors.title).toContain(`The value "" for title was empty.`);
    expect(result.errors.title).toHaveLength(1);
    expect(result.errors.description).toHaveLength(1);
  });

  test('should fail when array is empty', async () => {
    const result = await validator.validate({ items: [] }, { items: 'required' });
    expect(result.errors.items).toContain('At least one value must be selected for the items field.');
    expect(result.errors.items).toHaveLength(1);
    expect(result.errorCount).toBe(1);
  });

  test('should validate nested fields', async () => {
    const data = {
      nested: {
        field1: {
          field1a: '',
        },
        field2: '',
      },
    };
    const rules = {
      nested: {
        field1: {
          field1a: 'required',
          fieldSomethingElse: null,
        },
        field2: 'required',
      },
    }
    const result = await validator.validate(data, rules);
    expect(result.errors.nested.field1.field1a).toContain('The field1a field is required.');
    expect(result.errors.nested.field2).toContain('The field2 field is required.');
    expect(result.errors.nested.field2).toHaveLength(1);
    expect(result.errors.nested.field1.field1a).toHaveLength(1);
    expect(result.errorCount).toBe(2);
  });

  test('should validate nested fields when parent is null', async () => {
    const data = {
      nested: {
        field1: null,
        field2: '',
      },
    };
    const rules = {
      nested: {
        field1: {
          field1a: 'required',
          fieldSomethingElse: null,
        },
        field2: 'required',
      },
    }
    const result = await validator.validate(data, rules);
    expect(result.errors.nested.field1.field1a).toContain('The field1a field is required.');
    expect(result.errors.nested.field2).toContain('The field2 field is required.');
    expect(result.errors.nested.field2).toHaveLength(1);
    expect(result.errors.nested.field1.field1a).toHaveLength(1);
    expect(result.errorCount).toBe(2);
  });

  test('should validate objects', async () => {
    const data = {
      field1: null,
    };
    const rules = {
      field1: 'required',
    }
    const result = await validator.validate(data, rules);
    expect(result.errors.field1).toContain('The field1 field is required.');
    expect(result.errorCount).toBe(1);
  });

  test('should validate nested with object definition', async () => {
    const data = {
      nested: {
        field1: {
          field1a: '',
        },
      },
    };
    const rules = {
      nested: {
        field1: {
          field1a: [{
            name: 'required',
            errorMessage: (key, data) => `The value "${data.nested.field1.field1a}" for ${key} was empty.`,
          }],
        },
      },
    };
    const result = await validator.validate(data, rules);
    expect(result.errors.nested.field1.field1a).toContain('The value "" for nested.field1.field1a was empty.');
    expect(result.errors.nested.field1.field1a).toHaveLength(1);
    expect(result.errorCount).toBe(1);
  });

  test('should validate combination of object and string definitions', async () => {
    const rules = {
      price: [
        'decimal',
        {
          name: 'required',
          errorMessage: (key, data) => `The value "${data.price}" for ${key} was empty.`,
        },
      ],
    };
    const result = await validator.validate({ price: '' }, rules);
    expect(result.errors.price).toContain('The value "" for price was empty.');
    expect(result.errors.price).toHaveLength(1);
    expect(result.errorCount).toBe(1);

    const result2 = await validator.validate({ price: 'oops' }, rules);
    expect(result2.errors.price).toContain('The price field must be a decimal value.');
    expect(result2.errors.price).toHaveLength(1);
    expect(result2.errorCount).toBe(1);
  });

  test('should validate regex', async () => {
    const result = await validator.validate(
      { toValidate: 'abc' },
      { toValidate: [
        'decimal',
        ruleDefinitions.regex(/[0-9]/)
      ]},
    );
    expect(result.errors.toValidate).toContain('The toValidate field must be a decimal value.');
    expect(result.errors.toValidate).toContain('The toValidate field is invalid.');
    expect(result.errors.toValidate).toHaveLength(2);
    expect(result.errorCount).toBe(2);
  });

  [
    { value: '', isValid: true },
    { value: '1', isValid: true },
    { value: '1.0', isValid: true },
    { value: '1.00', isValid: true },
    { value: '1.000', isValid: false },
    { value: '1.', isValid: false },
  ].forEach(({ value, isValid }) =>
    test(`should validate "${value}" as ${isValid ? 'a valid': 'an invalid'} monetary value`, async () => {
      const result = await validator.validate(
        { value },
        { value: 'money'},
      );
      if (!isValid) {
        expect(result.errors.value).toContain('The value field must be a valid monetary value.');
      }
      expect(result.errors.value).toHaveLength(isValid ? 0 : 1);
      expect(result.errorCount).toBe(isValid ? 0 : 1);
    }),
  );

  [
    { value: '1.000', isValid: true },
    { value: '1.0000', isValid: false },
  ].forEach(({ value, isValid }) =>
    test(`should validate "${value}" as ${isValid ? 'a valid': 'an invalid'} decimal value when arguments are given`, async () => {
      const result = await validator.validate(
        { value },
        { value: 'decimal(1,3)'},
      );
      if (!isValid) {
        expect(result.errors.value).toContain('The value field must be a decimal value.');
      }
      expect(result.errors.value).toHaveLength(isValid ? 0 : 1);
      expect(result.errorCount).toBe(isValid ? 0 : 1);
    }),
  );

  [
    { value: '1.0', isValid: true },
    { value: '1.00', isValid: false },
  ].forEach(({ value, isValid }) =>
    test(`should validate "${value}" as ${isValid ? 'a valid': 'an invalid'} decimal value when single argument is given`, async () => {
      const result = await validator.validate(
        { value },
        { value: 'decimal(1)'},
      );
      if (!isValid) {
        expect(result.errors.value).toContain('The value field must be a decimal value.');
      }
      expect(result.errors.value).toHaveLength(isValid ? 0 : 1);
      expect(result.errorCount).toBe(isValid ? 0 : 1);
    }),
  );

  test('should validate "" as a valid decimal value (because we should not decide if it is a required field with this validator)', async () => {
    const result = await validator.validate(
      { value: '' },
      { value: 'decimal(1)'},
    );
    expect(result.errors.value).toHaveLength(0);
    expect(result.errorCount).toBe(0);
  });

  [
    { value: 'abc', minLength: '4', expectedError: 'The value field must be greater than 4 in length.' },
    { value: 'abcd', minLength: '4', expectedError: undefined },
    { value: 'abcd', minLength: '0', maxLength: '3', expectedError: 'The value field must be less than 3 in length.' },
    { value: 'abc', minLength: '0', maxLength: '3', expectedError: undefined },
    { value: 'abcd', maxLength: '3', expectedError: 'The value field must be less than 3 in length.' },
    { value: 'abc', maxLength: '3', expectedError: undefined },
    { value: 'abcd', minLength: '1', maxLength: '3', expectedError: 'The value field must be greater than 1 and less than 3 in length.' },
  ].forEach(({ value, expectedError, minLength = '', maxLength = '' }) =>
    test(`should validate "${value}" as ${expectedError ? 'a valid': 'an invalid'} length when size should be in the bounds (${minLength},${maxLength})`, async () => {
      const result = await validator.validate(
        { value },
        { value: `length(${minLength ?? ''},${maxLength ?? ''})`},
      );
      if (expectedError) {
        expect(result.errors.value).toContain(expectedError);
      }
      expect(result.errors.value).toHaveLength(expectedError ? 1 : 0);
      expect(result.errorCount).toBe(expectedError ? 1 : 0);
    }),
  );
})