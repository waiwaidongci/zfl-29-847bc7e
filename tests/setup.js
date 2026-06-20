class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

globalThis.localStorage = new LocalStorageMock();

if (typeof globalThis.TextEncoder === 'undefined') {
  class TextEncoderPolyfill {
    encode(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xc0 | (code >> 6));
          bytes.push(0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes.push(0xe0 | (code >> 12));
          bytes.push(0x80 | ((code >> 6) & 0x3f));
          bytes.push(0x80 | (code & 0x3f));
        } else {
          i++;
          const code2 = str.charCodeAt(i);
          const cp = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
          bytes.push(0xf0 | (cp >> 18));
          bytes.push(0x80 | ((cp >> 12) & 0x3f));
          bytes.push(0x80 | ((cp >> 6) & 0x3f));
          bytes.push(0x80 | (cp & 0x3f));
        }
      }
      return new Uint8Array(bytes);
    }
  }
  class TextDecoderPolyfill {
    decode(bytes) {
      let str = '';
      let i = 0;
      while (i < bytes.length) {
        const b = bytes[i];
        let code;
        if (b < 0x80) {
          code = b;
          i++;
        } else if (b < 0xe0) {
          code = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
          i += 2;
        } else if (b < 0xf0) {
          code = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
          i += 3;
        } else {
          const cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
          const offset = cp - 0x10000;
          code = 0xd800 + (offset >> 10);
          str += String.fromCharCode(code);
          code = 0xdc00 + (offset & 0x3ff);
          i += 4;
        }
        str += String.fromCharCode(code);
      }
      return str;
    }
  }
  globalThis.TextEncoder = TextEncoderPolyfill;
  globalThis.TextDecoder = TextDecoderPolyfill;
}

if (typeof globalThis.btoa === 'undefined') {
  const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  globalThis.btoa = function btoa(str) {
    let out = '';
    let i = 0;
    while (i < str.length) {
      const c1 = str.charCodeAt(i++) & 0xff;
      const c2 = i < str.length ? str.charCodeAt(i++) & 0xff : 0;
      const c3 = i < str.length ? str.charCodeAt(i++) & 0xff : 0;
      const enc1 = c1 >> 2;
      const enc2 = ((c1 & 0x03) << 4) | (c2 >> 4);
      const enc3 = ((c2 & 0x0f) << 2) | (c3 >> 6);
      const enc4 = c3 & 0x3f;
      out += BASE64_CHARS.charAt(enc1) + BASE64_CHARS.charAt(enc2);
      out += (i - 2 < str.length ? BASE64_CHARS.charAt(enc3) : '=');
      out += (i - 1 < str.length ? BASE64_CHARS.charAt(enc4) : '=');
    }
    return out;
  };
}

if (typeof globalThis.atob === 'undefined') {
  const BASE64_DECODE = {};
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .forEach((c, i) => { BASE64_DECODE[c] = i; });
  globalThis.atob = function atob(b64) {
    const clean = b64.replace(/=+$/, '');
    let out = '';
    let i = 0;
    while (i < clean.length) {
      const enc1 = BASE64_DECODE[clean.charAt(i++)];
      const enc2 = BASE64_DECODE[clean.charAt(i++)] || 0;
      const enc3 = BASE64_DECODE[clean.charAt(i++)] || 0;
      const enc4 = BASE64_DECODE[clean.charAt(i++)] || 0;
      const c1 = (enc1 << 2) | (enc2 >> 4);
      const c2 = ((enc2 & 0x0f) << 4) | (enc3 >> 2);
      const c3 = ((enc3 & 0x03) << 6) | enc4;
      out += String.fromCharCode(c1);
      if (i - 2 < clean.length || enc2 !== 0 || c2 !== 0) out += String.fromCharCode(c2);
      if (i - 1 < clean.length || enc3 !== 0 || c3 !== 0) out += String.fromCharCode(c3);
    }
    return out;
  };
}
