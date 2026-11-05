// Payment gateway registry — honest gating only.
// A gateway is "enabled" ONLY when its required merchant credentials are present in
// the environment. With no credentials every gateway is disabled and payments stay
// in manual-approval mode. No gateway SDK is called anywhere in this codebase.
export function getGateways() {
  return [
    { key: 'bkash', name: 'bKash', enabled: Boolean(process.env.BKASH_APP_KEY) },
    { key: 'nagad', name: 'Nagad', enabled: Boolean(process.env.NAGAD_MERCHANT_ID) },
    { key: 'sslcommerz', name: 'SSLCommerz', enabled: Boolean(process.env.SSLCZ_STORE_ID && process.env.SSLCZ_STORE_PASSWORD) },
    { key: 'rocket', name: 'Rocket', enabled: false, note: 'Manual transaction ID only — no online gateway configured' },
  ];
}
