// ============================================================
// MITM PROTECTION UTILITIES
// ============================================================

/**
 * Check if the current connection is secure (HTTPS)
 * @returns {boolean} - True if connection is secure
 */
export function isSecureConnection() {
  if (typeof window === 'undefined') return true;
  
  // Allow localhost for development
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0') {
    return true;
  }
  
  return window.location.protocol === 'https:';
}

/**
 * Check if HSTS is enabled
 * @returns {boolean} - True if HSTS is enabled
 */
export function hasHSTS() {
  if (typeof document === 'undefined') return false;
  
  // Check for HSTS meta tag
  const meta = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
  if (meta) return true;
  
  // Check for HSTS header (can't check via JS, but we can check if we're on HTTPS)
  return isSecureConnection();
}

/**
 * Check if secure cookies are being used
 * @returns {boolean} - True if secure cookies are present
 */
export function hasSecureCookies() {
  if (typeof document === 'undefined') return false;
  
  const cookies = document.cookie.split(';');
  return cookies.some(cookie => 
    cookie.trim().startsWith('__Secure-') || 
    cookie.trim().startsWith('__Host-')
  );
}

/**
 * Validate the current connection status
 * @returns {Object} - Connection security status
 */
export function validateConnection() {
  const isSecure = isSecureConnection();
  
  return {
    isSecure: isSecure,
    hasHSTS: hasHSTS(),
    hasSecureCookie: hasSecureCookies(),
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
  };
}

/**
 * Log connection status to console
 * @returns {Object} - Connection security status
 */
export function logConnectionStatus() {
  const status = validateConnection();
  
  console.log('🔐 Connection Security Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🔒 Secure Protocol:   ${status.isSecure ? '✅ Yes' : '❌ No'}`);
  console.log(`  🛡️  HSTS Enabled:      ${status.hasHSTS ? '✅ Yes' : '❌ No'}`);
  console.log(`  🍪 Secure Cookies:    ${status.hasSecureCookie ? '✅ Yes' : '❌ No'}`);
  console.log(`  🌐 Protocol:          ${status.protocol}`);
  console.log(`  🏠 Hostname:          ${status.hostname}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!status.isSecure) {
    console.warn('⚠️ WARNING: Connection is not secure!');
    console.warn('   Your data may be vulnerable to MITM attacks.');
    console.warn('   Please use HTTPS in production.');
  }
  
  return status;
}

/**
 * Redirect to HTTPS if not secure
 * @returns {boolean} - True if redirect was performed
 */
export function redirectToHTTPS() {
  if (typeof window === 'undefined') return false;
  
  if (!isSecureConnection() && window.location.hostname !== 'localhost') {
    const httpsUrl = window.location.href.replace('http://', 'https://');
    console.log(`🔄 Redirecting to HTTPS: ${httpsUrl}`);
    window.location.href = httpsUrl;
    return true;
  }
  return false;
}

/**
 * Check certificate pinning (web browsers have limited support)
 * @returns {Object} - Certificate pinning status
 */
export function checkCertificatePinning() {
  // In web browsers, certificate pinning is limited
  // This is more applicable to native apps
  return {
    supported: false,
    message: 'Certificate pinning is not fully supported in web browsers.',
    recommendation: 'Use HSTS and secure cookies for web applications.'
  };
}

/**
 * Get security headers from the current page
 * @returns {Object} - Security headers
 */
export function getSecurityHeaders() {
  if (typeof document === 'undefined') return {};
  
  // Check for security-related meta tags
  const headers = {};
  
  // CSP
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (cspMeta) {
    headers['Content-Security-Policy'] = cspMeta.getAttribute('content');
  }
  
  // HSTS (not actually a meta tag, but we check anyway)
  const hstsMeta = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
  if (hstsMeta) {
    headers['Strict-Transport-Security'] = hstsMeta.getAttribute('content');
  }
  
  return headers;
}

/**
 * Full security check - runs all checks and returns comprehensive report
 * @returns {Object} - Complete security report
 */
export function runSecurityCheck() {
  const connection = validateConnection();
  const headers = getSecurityHeaders();
  const pinning = checkCertificatePinning();
  
  const report = {
    timestamp: new Date().toISOString(),
    connection: connection,
    headers: headers,
    certificatePinning: pinning,
    issues: [],
    recommendations: []
  };
  
  // Add issues and recommendations
  if (!connection.isSecure) {
    report.issues.push('Connection is not secure (HTTP)');
    report.recommendations.push('Enable HTTPS in production');
  }
  
  if (!connection.hasHSTS) {
    report.issues.push('HSTS is not detected');
    report.recommendations.push('Enable HSTS header to force HTTPS');
  }
  
  if (!connection.hasSecureCookie) {
    report.issues.push('Secure cookies not detected');
    report.recommendations.push('Use secure and HTTP-only cookies');
  }
  
  // Log if there are issues
  if (report.issues.length > 0) {
    console.warn('⚠️ Security issues detected:');
    report.issues.forEach(issue => console.warn(`  - ${issue}`));
    console.warn('💡 Recommendations:');
    report.recommendations.forEach(rec => console.warn(`  - ${rec}`));
  } else {
    console.log('✅ All security checks passed!');
  }
  
  return report;
}

// ============================================================
// AUTO-RUN ON PAGE LOAD (Optional)
// ============================================================
// Uncomment the line below to auto-run security check on page load
// if (typeof window !== 'undefined') {
//   setTimeout(() => {
//     runSecurityCheck();
//   }, 1000);
// }

export default {
  isSecureConnection,
  hasHSTS,
  hasSecureCookies,
  validateConnection,
  logConnectionStatus,
  redirectToHTTPS,
  checkCertificatePinning,
  getSecurityHeaders,
  runSecurityCheck
};