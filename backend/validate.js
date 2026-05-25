const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details
      });
    }

    return next();
  };
}

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const createTripSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departure_time: z.string().min(1),
  available_seats: z.coerce.number().int().positive(),
  price: z.coerce.number().positive()
});

const updateTripSchema = z.object({
  departure_time: z.string().min(1).optional(),
  available_seats: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().positive().optional(),
  status: z.enum(['active', 'cancelled']).optional()
});

const bookingSchema = z.object({
  trip_id: z.coerce.number().int().positive()
});

const applyDriverSchema = z.object({
  license_number: z.string().min(1),
  vehicle_info: z.string().min(1)
});

const reviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createTripSchema,
  updateTripSchema,
  bookingSchema,
  applyDriverSchema,
  reviewApplicationSchema
};
