/**
 * QR Code Scanner – Buffr G2P.
 * Full-screen camera for NAMQR scanning: pay-by-QR, cash-out, voucher redemption.
 * Parses TLV payload, validates CRC (Tag 63), calls Token Vault validation (Tag 65).
 * §3.6 screen 41b / Figma 81:465.
 * Uses UserContext for profile and walletStatus (frozen guard).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { validateQR } from '@/services/cashout';
import { validateNAMQRCRC } from '@/utils/crc';

/**
 * Minimal NAMQR TLV parser.
 * Returns a map of tag → value for the top-level TLV payload.
 * NAMQR uses 2-char hex tag IDs and 2-digit decimal length.
 */
function parseTLV(payload: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  while (i < payload.length - 3) {
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len)) break;
    const value = payload.slice(i + 4, i + 4 + len);
    map.set(tag, value);
    i += 4 + len;
  }
  return map;
}

/** Validate NAMQR CRC (Tag 63) via CRC16/CCITT-FALSE. PRD §4.5, §11.8. */
function validateCRC(payload: string): boolean {
  return validateNAMQRCRC(payload);
}

type ScanMode = 'payment' | 'cashout' | 'voucher' | 'general';

export default function ScanQRScreen() {
  const { profile, walletStatus } = useUser();
  const params = useLocalSearchParams<{
    mode?: ScanMode;
    walletId?: string;
    voucherId?: string;
    method?: string;
    amount?: string;
  }>();
  const mode: ScanMode = (params.mode as ScanMode) ?? 'general';
  const walletId = params.walletId;
  const voucherId = params.voucherId;
  // For cashout mode: the method (till/agent/merchant/atm) and user-entered amount before scanning.
  const cashoutMethod = params.method;
  const presetAmount = params.amount;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (scanned || validating) return;
      setScanned(true);
      setValidating(true);
      setError(null);
      Vibration.vibrate(100);

      try {
        // Parse TLV
        const tlv = parseTLV(data);

        // F7: NAMQR structure check – reject non-NAMQR before Token Vault (PRD §3.16.7).
        const formatIndicator = tlv.get('00');
        const country = tlv.get('58');
        const looksLikeNAMQR = Boolean(formatIndicator ?? country ?? data.startsWith('BCD'));

        if (!looksLikeNAMQR) {
          setError('This QR code is not supported. Please scan a NAMQR code.');
          setValidating(false);
          return;
        }

        // Validate CRC (NAMQR Tag 63)
        const crcOk = validateCRC(data);
        if (!crcOk) {
          setError('QR code failed integrity check (CRC). Please try again or use a different code.');
          setValidating(false);
          return;
        }

        // Validate via Token Vault (API)
        const result = await validateQR(data);

        if (!result.valid) {
          const isExpired = /expired|invalid|invalid token/i.test(result.error ?? '');
          setError(isExpired ? 'QR code has expired. Request a new one.' : (result.error ?? 'QR code is invalid. Please try again.'));
          setValidating(false);
          return;
        }

        setValidating(false);

        // Route based on mode
        if (mode === 'cashout' && walletId) {
          // F3: Route to confirm screen (not back to the hub) so user sees payee + fee + 2FA.
          // Prefer amount from Token Vault result; fall back to user-entered preset amount.
          const resolvedAmount = result.amount ? String(result.amount) : (presetAmount ?? '0');
          router.replace({
            pathname: `/wallets/${walletId}/cash-out/confirm` as never,
            params: {
              qrPayload: data,
              payeeName: result.payeeName ?? '',
              amount: resolvedAmount,
              tokenRef: result.tokenRef ?? '',
              method: cashoutMethod ?? 'till',
            },
          });
        } else if (mode === 'payment') {
          // F4: Pass walletId so confirm screen knows which wallet to debit.
          router.replace({
            pathname: '/send-money/confirm' as never,
            params: {
              qrPayload: data,
              recipientName: result.payeeName ?? '',
              recipientPhone: '',
              amount: String(result.amount ?? 0),
              walletId: walletId ?? '',
            },
          });
        } else if (mode === 'voucher' && voucherId) {
          // PRD §18.5: After scanning branch QR, go to voucher redeem confirm.
          const voucherAmount = params.amount ?? String(result.amount ?? 0);
          router.replace({
            pathname: '/utilities/vouchers/redeem/confirm' as never,
            params: {
              voucherId,
              amount: voucherAmount,
              branchName: result.payeeName ?? 'NamPost / SmartPay branch',
              qrPayload: data,
            },
          });
        } else {
          // General: route by QR type
          // Tag 29 = merchant account info (payment); Tag 65 = Token Vault NREF (cash-out)
          const hasTokenVault = tlv.has('65');
          const hasMerchant = tlv.has('26') || tlv.has('29');

          if (hasTokenVault && walletId) {
            router.replace({
              pathname: `/wallets/${walletId}/cash-out/confirm` as never,
              params: {
                qrPayload: data,
                payeeName: result.payeeName ?? '',
                amount: String(result.amount ?? 0),
                tokenRef: result.tokenRef ?? '',
                method: 'general',
              },
            });
          } else if (hasMerchant) {
            router.replace({
              pathname: '/send-money/confirm' as never,
              params: {
                qrPayload: data,
                recipientName: result.payeeName ?? '',
                recipientPhone: '',
                amount: String(result.amount ?? 0),
                walletId: walletId ?? '',
              },
            });
          } else {
            // Unknown — show payee info and let user decide
            setError(`Scanned QR: ${result.payeeName ?? 'Unknown payee'}${result.amount ? ` — N$${result.amount}` : ''}. Go back to choose an action.`);
          }
        }
      } catch (e) {
        if (__DEV__) { console.error('QR scan error:', e); } // SEC-S10
        const err = e as Error & { code?: string; message?: string };
        const msg = err?.message ?? '';
        if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('network')) {
          setError('No internet connection. Check your signal and try again.');
        } else if (msg.includes('timeout') || msg.includes('Timeout') || err?.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Service temporarily unavailable. Please try again shortly.');
        }
        setValidating(false);
      }
    },
    [scanned, validating, mode, walletId, voucherId, cashoutMethod, presetAmount]
  );

  const resetScan = () => {
    setScanned(false);
    setError(null);
    setValidating(false);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator color={designSystem.colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Ionicons name="camera-outline" size={60} color={designSystem.colors.neutral.textTertiary} />
        <Text style={styles.permissionTitle}>Camera access required</Text>
        <Text style={styles.permissionText}>
          Allow camera access to scan QR codes for payments and cash-out.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>
            {permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const modeLabel: Record<ScanMode, string> = {
    payment: 'Scan to Pay',
    cashout: 'Scan to Cash Out',
    voucher: 'Scan Voucher QR',
    general: 'Scan QR Code',
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Header overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
            accessibilityLabel="Go back"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modeLabel}>{modeLabel[mode]}</Text>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => setTorchOn((v) => !v)}
            accessibilityLabel={torchOn ? 'Turn off torch' : 'Turn on torch'}
          >
            <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scanner frame */}
        <View style={styles.frameContainer}>
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.instruction}>
            Point your camera at the QR code
          </Text>
        </View>

        {/* Bottom status */}
        <View style={styles.bottomBar}>
          {validating ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.statusText}>Validating QR code…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={resetScan}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const FRAME_SIZE = 250;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designSystem.spacing.g2p.horizontalPadding,
    backgroundColor: designSystem.colors.neutral.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: 8,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeLabel: {
    ...designSystem.typography.textStyles.bodyLg,
    color: '#fff',
    fontWeight: '600',
  },
  frameContainer: {
    alignItems: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  instruction: {
    ...designSystem.typography.textStyles.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  bottomBar: {
    padding: designSystem.spacing.g2p.horizontalPadding,
    paddingBottom: 32,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
  },
  statusText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
  },
  errorCard: {
    backgroundColor: 'rgba(30,0,0,0.85)',
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    borderWidth: 1,
    borderColor: designSystem.colors.semantic.error,
  },
  errorCardText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retryText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
    fontWeight: '600',
  },
  permissionTitle: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  permissionButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
    fontWeight: '600',
  },
  backButton: {
    height: designSystem.components.button.height,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
});
