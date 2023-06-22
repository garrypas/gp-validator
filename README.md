# gp-validator

A small validation library

## Example usage

```javascript
const { create } = require('gp-validator');
const validator = create();

const rules = {
  title: 'required',
  description: 'required',
};

const data = {
  title: '',
  descrption: ''
};

const result = validator.validate(data, rules);
// Will have an array with one string message indicating that title is required
console.log(result.errors.title);
// Will have an array with one string message indicating that description is required
console.log(result.errors.description);
```

## Typescript

Has Typescript definitions built in so will work in a TS project too.

## Rules

Built in rules are:
- `required`
- `integer`
- `decimal`

## Adding rules

Custom rules can be added

```javascript
validator.addRule('fish-names', {
  rule: async (key, data) => ['cod', 'tuna', 'pike', 'trout', 'salmon'].includes(data[key]),
  errorTextFunction: (key, _) => `The ${key} field does not contain a valid type of fish.`,
});

const data = { fish: 'cow' };
const rules = { fish: 'fish-names' };
// Will have an array with one string message indicating that cow is not a valid fish name
const result = validator.validate(data, rules);
```