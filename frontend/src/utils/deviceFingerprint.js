export const getDeviceFingerprint = () => {
  // Combine multiple browser attributes for a unique fingerprint
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    canvas: getCanvasFingerprint(),
    fonts: getFontFingerprint(),
    webgl: getWebGLFingerprint(),
  };

  const fingerprintString = JSON.stringify(fingerprint);
  return hashString(fingerprintString);
};

// ===== IMPROVED HASH FUNCTION =====
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Return a unique string with timestamp to ensure uniqueness
  return 'fp_' + Math.abs(hash).toString(36).padStart(8, '0') + '_' + Date.now().toString(36);
};

const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#069';
    ctx.fillText('Anti-Akinator', 20, 20);
    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-error';
  }
};

const getFontFingerprint = () => {
  try {
    const fonts = [
      'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
      'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Monaco', 'Helvetica'
    ];
    const detectedFonts = [];
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '72px monospace';
    const defaultWidth = ctx.measureText('mmmmmmmmmmlli').width;
    
    fonts.forEach(font => {
      ctx.font = `72px ${font}, monospace`;
      const width = ctx.measureText('mmmmmmmmmmlli').width;
      if (width !== defaultWidth) {
        detectedFonts.push(font);
      }
    });
    
    return detectedFonts.join(',');
  } catch (e) {
    return 'fonts-error';
  }
};

const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}||${renderer}`;
  } catch (e) {
    return 'webgl-error';
  }
};