// mobile/app.config.js
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE || 'preview';
  const isProduction = profile === 'production';

  // Lấy danh sách plugins hiện tại trong app.json
  const existingPlugins = (config.plugins || []).filter(
    (p) => (typeof p === 'string' ? p : p[0]) !== 'expo-build-properties',
  );

  return {
    ...config,
    plugins: [
      ...existingPlugins,
      [
        'expo-build-properties',
        {
          android: {
            // Cho phép HTTP không mã hóa (Cleartext Traffic) trên mạng LAN cho bản Preview và Development.
            // Bản Production bắt buộc sử dụng HTTPS bảo mật.
            usesCleartextTraffic: !isProduction,
          },
        },
      ],
    ],
  };
};
