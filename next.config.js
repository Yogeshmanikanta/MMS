/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // V1 URLs, kept so bookmarks keep working.
    return [
      { source: '/dashboard', destination: '/today', permanent: true },
      { source: '/attendance', destination: '/today', permanent: true },
      { source: '/in-charge', destination: '/today', permanent: true },
      { source: '/guest-ledger', destination: '/guests', permanent: true },
      { source: '/tokens', destination: '/guests', permanent: true },
      { source: '/monthly-bills', destination: '/bills', permanent: true },
      { source: '/billing', destination: '/bills', permanent: true },
      { source: '/reports', destination: '/bills', permanent: true },
      { source: '/cost-management', destination: '/prices', permanent: true },
      { source: '/students/import', destination: '/students?import=1', permanent: true }
    ];
  }
};

module.exports = nextConfig;
