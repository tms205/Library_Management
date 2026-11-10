// mobile/src/api/notificationApi.js
import client from './client';

export const registerDeviceTokenApi = async (token, platform, deviceId = null) => {
  const response = await client.post('/api/notifications/device-token', {
    token,
    platform: platform || 'ANDROID',
    deviceId,
  });
  return response.data;
};

export const unregisterDeviceTokenApi = async (token) => {
  const response = await client.delete('/api/notifications/device-token', {
    params: { token },
  });
  return response.data;
};
