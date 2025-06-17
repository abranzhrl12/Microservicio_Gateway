// src/config/joi.validation.ts
import * as Joi from 'joi';

export const JoiValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('production', 'dev', 'staging').default('production'),
  GATEWAY_PORT: Joi.number().default(4000),

  JWT_SECRET: Joi.string().required(),

  AUTH_SERVICE_URL: Joi.string().uri().required(),
  SIDEBAR_SERVICE_URL: Joi.string().uri().required(),
 
  FRONTEND_URLS: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().uri()), // ya es array
      Joi.string().custom((value, helpers) => {
        const urls = value.split(',').map((url) => url.trim());
        const { error } = Joi.array().items(Joi.string().uri()).validate(urls);
        if (error) {
          return helpers.error('any.invalid');
        }
        return urls;
      }),
    )
    .default(['http://localhost:4000']),
});
