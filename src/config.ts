const isDev = import.meta.env.DEV;

export default {
  api: isDev ? 'http://localhost:3000' : 'https://private.api.tiouo.xyz',
};
