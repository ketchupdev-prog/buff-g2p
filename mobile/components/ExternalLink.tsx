import { Link } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

/**
 * Opens href in external or in-app browser. expo-web-browser is loaded lazily
 * to avoid "Cannot find native module" at startup when the dev binary was
 * built before the module was linked.
 */
export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      // @ts-expect-error: External URLs are not typed.
      href={props.href}
      onPress={async (e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          try {
            const WebBrowser = await import('expo-web-browser');
            await WebBrowser.openBrowserAsync(props.href as string);
          } catch (err) {
            console.error('ExternalLink openBrowserAsync error:', err);
          }
        }
      }}
    />
  );
}
