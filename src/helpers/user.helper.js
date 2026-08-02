import env from '../config/env.js';

export const formatUser = (user) => {
  if (!user) return user;
  const formatted = { ...user };
  if (formatted.avatar) {
    formatted.avatar = `${env.app.url}/uploads/${formatted.avatar}`;
  }
  return formatted;
};
