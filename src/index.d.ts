type ValidatorResult<TData> = {
  errorCount: number;
  errors: {
    [K in keyof TData]:  string[]
  };
}

type ValidatorRules<TData> = {
  [K in keyof TData]:  string
}

type Validator = {
  validate<TData> (data: TData, rules: ValidatorRules<TData>): Promise<ValidatorResult<TData>>;

  addRule<TData> (name: string, ruleDefinition: {
    rule: (key: string, data: TData) => Promise<boolean>,
    errorTextFunction: (key: string, data: TData) => string,
  }): void;
};

declare module '@garrypas/gp-validator' {
  export const create: () => Validator;
}