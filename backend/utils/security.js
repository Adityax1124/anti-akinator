// ===== SSL/TLS Certificate Pinning =====
// Store the expected certificate fingerprints
const EXPECTED_PINS = {
  // Add your certificate public key hashes (SHA-256 base64)
  // Get these from your SSL certificate
  // pin1: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  // pin2: 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
};

// ===== Public Key Pinning Check =====
export function checkCertificatePinning(publicKey) {
  // This would be implemented in a service worker or native app
  // For web apps, certificate pinning is limited due to browser restrictions
  console.warn('Certificate pinning is not fully supported in web browsers');
  return true;
}

// ===== CORS Security Check =====
export function validateCORS(origin) {
  const allowedOrigins = [
    'https://anti-akinator-silk.vercel.app',
    'https://anti-akinator.vercel.app',
    'http://localhost:5173'
  ];
  
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn('Blocked CORS request from:', origin);
    return false;
  }
  return true;
}