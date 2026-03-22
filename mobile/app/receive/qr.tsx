/**
 * Receive QR – Redirect to main Receive screen. Buffr G2P.
 * Main Receive screen shows the large QR; this route redirects so /receive/qr still works.
 * PRD §3.9, §7.6.1.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function ReceiveQRRedirect() {
  useEffect(() => {
    router.replace('/receive');
  }, []);
  return null;
}
