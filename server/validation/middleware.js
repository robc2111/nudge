// server/validation/middleware.js
const { ZodError } = require('zod');

/**
 * Flexible validator:
 *  - validate({ body, params, query })
 *  - validate(schema, 'body' | 'params' | 'query')
 */
function validate(arg1 = {}, which) {
  // Signature validate(schema, 'body')
  if (arg1 && typeof arg1.safeParse === 'function' && typeof which === 'string') {
    const schema = arg1;
    const key = which;
    return (req, res, next) => {
      const parsed = schema.safeParse(req[key]);
      if (!parsed.success) {
        return res.status(400).json({
          error: `Invalid ${key}`,
          details: parsed.error.flatten(),
        });
      }
      req[key] = parsed.data;
      next();
    };
  }

  // Signature validate({ body?, params?, query? })
  const { body, params, query } = arg1;
  return (req, res, next) => {
    try {
      if (body) {
        const r = body.safeParse(req.body);
        if (!r.success) return res.status(400).json({ error: 'Invalid body', details: r.error.flatten() });
        req.body = r.data;
      }
      if (params) {
        const r = params.safeParse(req.params);
        if (!r.success) return res.status(400).json({ error: 'Invalid params', details: r.error.flatten() });
        req.params = r.data;
      }
      if (query) {
        const r = query.safeParse(req.query);
        if (!r.success) return res.status(400).json({ error: 'Invalid query', details: r.error.flatten() });
        req.query = r.data;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.flatten() });
      }
      next(err);
    }
  };
}

module.exports = { validate };