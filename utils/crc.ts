/**
 * CRC16/CCITT-FALSE – Buffr G2P.
 * Used for NAMQR Tag 63 integrity check. PRD §4.5, §11.8.
 * Poly 0x1021, init 0xFFFF, no final XOR.
 */

const CRC16_POLY = 0x1021;
const CRC16_INIT = 0xffff;

/**
 * Compute CRC16/CCITT-FALSE over a byte array.
 */
export function crc16ccitt(bytes: Uint8Array): number {
  let crc = CRC16_INIT;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let b = 0; b < 8; b++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ CRC16_POLY;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc;
}

/**
 * Encode a string as UTF-8 bytes. Uses TextEncoder when available (Expo/RN), else 1-byte per char for NAMQR.
 */
function stringToUtf8Bytes(s: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s);
  }
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out.push(c & 0xff);
  }
  return new Uint8Array(out);
}

/**
 * TLV-walk NAMQR payload to find Tag 63 (by tag ID, not substring).
 * NAMQR uses 2-char hex tag + 2-digit decimal length + value.
 * Returns start index of Tag 63 (first byte of "63") or -1.
 */
function findTag63Index(payload: string): number {
  let i = 0;
  while (i <= payload.length - 4) {
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (tag === '63') return i;
    if (isNaN(len) || len < 0) return -1;
    i += 4 + len;
  }
  return -1;
}

/**
 * Parse NAMQR payload to find Tag 63 and validate CRC (TLV-aware; F6).
 * Payload for CRC = from start of payload up to and including the 2-digit length field of Tag 63 (as UTF-8 bytes).
 * Tag 63 value = 2-byte CRC in hex (4 hex chars). Returns true if computed CRC matches.
 */
export function validateNAMQRCRC(payload: string): boolean {
  const idx = findTag63Index(payload);
  if (idx === -1) return false;
  // Tag 63: 2 chars tag + 2 chars length (decimal) + value (length bytes, here 2 = 4 hex chars)
  const lenStr = payload.slice(idx + 2, idx + 4);
  const len = parseInt(lenStr, 10);
  if (isNaN(len) || len !== 2 || payload.length < idx + 4 + 4) return false;
  const crcValueHex = payload.slice(idx + 4, idx + 4 + 4); // 4 hex chars = 2 bytes
  const expectedCrc = parseInt(crcValueHex, 16);
  if (isNaN(expectedCrc)) return false;
  // Data over which CRC is computed: from start to end of Tag 63 length field (inclusive)
  const dataForCrc = payload.slice(0, idx + 4);
  const bytes = stringToUtf8Bytes(dataForCrc);
  const computedCrc = crc16ccitt(bytes);
  return (computedCrc & 0xffff) === (expectedCrc & 0xffff);
}
