// StoryBuilder validate middleware (SPEC §3.1) — runs a Joi schema with
// { abortEarly:false, stripUnknown:true }. Failure → 400 VALIDATION_ERROR with
// a `fields` array [{ field, message }...].

export function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const fields = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload.',
        fields,
      });
    }

    req[source] = value;
    return next();
  };
}

export default validate;