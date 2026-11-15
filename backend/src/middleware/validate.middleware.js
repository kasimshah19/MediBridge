import ApiError from '../utils/ApiError.js';

/**
 * Generic Zod validation middleware.
 * Validates req.body, req.query, or req.params against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Request property to validate
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return next(new ApiError(400, 'Validation failed', errors));
  }

  // Replace the source data with parsed (and transformed) data
  req[source] = result.data;
  next();
};

export { validate };
export default validate;

