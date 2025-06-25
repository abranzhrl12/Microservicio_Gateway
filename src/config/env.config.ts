export const EnvConfiguration = () => ({
  environment: process.env.NODE_ENV || 'dev',
  gateway_port: Number(process.env.GATEWAY_PORT || 4000),

  jwtSecret: process.env.JWT_SECRET,

  auth_service_url: process.env.AUTH_SERVICE_URL,
  sidebar_service_url: process.env.SIDEBAR_SERVICE_URL,
  natsUrl: process.env.NATS_URL,
  frontendUrls: process.env.FRONTEND_URLS,
  cookieSecret: process.env.COOKIE_SECRET,
});
