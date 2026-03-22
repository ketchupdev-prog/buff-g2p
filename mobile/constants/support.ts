/**
 * Support and legal URLs – Buffr G2P.
 * Optional URLs for “View full policy”, “Open support”, etc. When set, settings screens
 * show “Open in browser” and use expo-web-browser. PRD §3.5.2.
 * Location: constants/support.ts
 */
export const SUPPORT_URLS = {
  /** Full privacy policy (web). When set, Privacy policy screen shows “Open full policy”. */
  privacyPolicy: 'https://app.ketchup.cc/privacy' as string | null,
  /** Full terms of service (web). When set, Terms screen shows “Open full terms”. */
  termsOfService: 'https://app.ketchup.cc/terms' as string | null,
  /** Help / FAQ (web). When set, Help centre can show “View online”. */
  helpCentre: 'https://app.ketchup.cc/help' as string | null,
  /** General contact / support page (web). When set, Contact us shows “Open support page”. */
  contactUrl: 'https://app.ketchup.cc/contact' as string | null,
};

/** Support contact – mailto and tel. Used by Contact us screen. */
export const SUPPORT_CONTACT = {
  /** Support email (mailto:). Leave empty to hide Email option. */
  email: 'ichigo@ketchup.cc',
  /** Support phone (tel:). Leave empty to hide Call option. E.164 preferred. */
  phone: '+264 81 437 6202',
};

/**
 * Open a URL in the system in-app browser (expo-web-browser).
 * Safe to call when URL is null/empty; no-op.
 */
export async function openSupportUrl(url: string | null | undefined): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  try {
    const WebBrowser = await import('expo-web-browser');
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch (e) {
    console.warn('openSupportUrl failed', e);
    return false;
  }
}
