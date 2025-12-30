export const config = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    SOCKET_RECOVERY: {
      maxDisconnectionDuration: 120000,
      skipMiddlewares: true
    }
  };