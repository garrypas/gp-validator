type ValidationResultErrors<TData> = {
  [K in keyof TData]:  TData[K] extends object
    ? ValidationResultErrors<TData[K]>
    : string[];
}

type ValidatorResult<TData> = {
  errorCount: number;
  errors: ValidationResultErrors<TData>
}

type FieldRule<TData> = {
  errorMessage: (key: string, data: TData) => string;
} & (
  { name: string } | { rule: (key: string, data: TData) => (Promise<boolean> | boolean) }
)

type ValidatorRules<TData> = {
  [K in keyof TData]:  string | (string | FieldRule<TData>)[]
}

type Validator = {
  /**
   * Runs validation using the supplied set of rules
   * @param data the data to be validated
   * @param rules the rules to apply
   * @returns the result of the validation
   */
  validate<TData> (data: TData, rules: ValidatorRules<TData>): Promise<ValidatorResult<TData>>;

  /**
   * Allows more rules to be defined.
   * @param name the name of the rule to add; if it already exists it will be overwritten
   * @param ruleDefinition the rule definition - return true if it passes, otherwise false
   */
  addRule<TData> (name: string, ruleDefinition: {
    rule: (key: string, data: TData) => Promise<boolean>,
    errorMessage: (key: string, data: TData) => string,
  }): void;

  /**
   * Allows an error handler (for outputting error messages) to be redefined
   * @param name the name of the rule the handler applies to
   * @param handler the error handler
   */
  setErrorHandler<TData> (name: string, handler: (key: string, data: TData) => string): void;
};

declare module '@garrypas/gp-validator' {
  export const create: () => Validator;
}
