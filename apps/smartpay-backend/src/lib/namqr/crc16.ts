/**
 * NAMQR CRC-16 Calculator
 * Implements ISO/IEC 13239 CRC calculation as specified in NAMQR Standards
 * 
 * Specification Requirements:
 * - Polynomial: 0x1021 (hex)
 * - Initial Value: 0xFFFF (hex)
 * - Calculate over all data objects including Tag, Length, Value
 * - Include Tag and Length of CRC itself (Tag 63, Length 04) but exclude CRC value
 * - Convert result to 4-character uppercase hex string
 */

export class NAMQRCrc16 {
  private static readonly POLYNOMIAL = 0x1021;
  private static readonly INITIAL_VALUE = 0xFFFF;

  /**
   * Calculate CRC-16 for NAMQR payload according to ISO/IEC 13239
   * @param data - The NAMQR payload data without the CRC value
   * @returns 4-character uppercase hex string (e.g., "007B")
   */
  public static calculate(data: string): string {
    // Convert string to bytes
    const bytes = Buffer.from(data, 'utf8');
    
    let crc = this.INITIAL_VALUE;
    
    // Process each byte
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i] ?? 0;
      crc ^= (b << 8);
      
      // Process each bit
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ this.POLYNOMIAL;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    // Mask to 16 bits
    crc &= 0xFFFF;
    
    // Convert to 4-character uppercase hex string
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Validate CRC-16 for a complete NAMQR payload
   * @param payload - Complete NAMQR payload including CRC
   * @returns true if CRC is valid
   */
  public static validate(payload: string): boolean {
    if (!payload.includes('6304')) {
      return false;
    }

    // Extract everything before the CRC value (including "6304")
    const crcIndex = payload.lastIndexOf('6304');
    if (crcIndex === -1 || crcIndex + 8 > payload.length) {
      return false;
    }

    const dataWithoutCrcValue = payload.substring(0, crcIndex + 4); // Include "6304"
    const extractedCrc = payload.substring(crcIndex + 4, crcIndex + 8);
    
    const calculatedCrc = this.calculate(dataWithoutCrcValue);
    
    return calculatedCrc === extractedCrc.toUpperCase();
  }

  /**
   * Append CRC to NAMQR payload
   * @param payloadWithoutCrc - NAMQR payload without CRC tag
   * @returns Complete payload with CRC appended
   */
  public static appendCrc(payloadWithoutCrc: string): string {
    // Add CRC tag and length
    const dataForCrc = payloadWithoutCrc + '6304';
    const crc = this.calculate(dataForCrc);
    return payloadWithoutCrc + '6304' + crc;
  }

  /**
   * Verify and extract CRC from payload
   * @param payload - Complete NAMQR payload
   * @returns Object with isValid flag and CRC value
   */
  public static extractAndVerify(payload: string): { isValid: boolean; crc: string | null; calculated: string | null } {
    const crcIndex = payload.lastIndexOf('6304');
    
    if (crcIndex === -1 || crcIndex + 8 > payload.length) {
      return { isValid: false, crc: null, calculated: null };
    }

    const dataWithoutCrcValue = payload.substring(0, crcIndex + 4);
    const extractedCrc = payload.substring(crcIndex + 4, crcIndex + 8);
    const calculatedCrc = this.calculate(dataWithoutCrcValue);
    
    return {
      isValid: calculatedCrc === extractedCrc.toUpperCase(),
      crc: extractedCrc.toUpperCase(),
      calculated: calculatedCrc
    };
  }
}

/**
 * Example Usage:
 * 
 * const payload = "00020101021102160004hxyz0105hxyz052045230316";
 * const crc = NAMQRCrc16.calculate(payload + "6304");
 * const completePayload = payload + "6304" + crc;
 * 
 * // Or use helper
 * const withCrc = NAMQRCrc16.appendCrc(payload);
 * const isValid = NAMQRCrc16.validate(withCrc);
 */
