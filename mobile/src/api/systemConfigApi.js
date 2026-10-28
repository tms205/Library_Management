import client from './client';

export const getSystemConfigApi = async () => {
  const response = await client.get('/api/system-config');
  return response.data;
};

export const updateMaintenanceApi = async (maintenanceMode) => {
  const response = await client.put('/api/system-config/maintenance', {
    maintenanceMode,
  });
  return response.data;
};
