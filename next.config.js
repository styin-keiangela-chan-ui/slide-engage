/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    const officeFrameAncestors = [
      "'self'",
      'https://*.office.com',
      'https://*.officeapps.live.com',
      'https://*.microsoft.com',
      'https://*.microsoftonline.com',
      'https://*.powerpoint.office.com',
    ].join(' ');

    const officeSafeHeaders = [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://appsforoffice.microsoft.com https://*.office.net https://*.microsoft.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https: wss:",
          "frame-src 'self' https:",
          `frame-ancestors ${officeFrameAncestors}`,
        ].join('; '),
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
    ];

    return [
      {
        source: '/taskpane',
        headers: officeSafeHeaders,
      },
      {
        source: '/taskpane-test',
        headers: officeSafeHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
