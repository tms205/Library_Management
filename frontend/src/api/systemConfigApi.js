import axiosClient from './axiosClient';

const API_URL = '/api/system-config';

// LAY CAU HINH HIEN TAI
export const getSystemConfig = () => {
  return axiosClient.get(API_URL);
};

// BAT / TAT MAINTENANCE MODE
export const updateMaintenanceMode = (maintenanceMode) => {
  return axiosClient.put(`${API_URL}/maintenance`, {
    maintenanceMode: maintenanceMode,
  });
};
