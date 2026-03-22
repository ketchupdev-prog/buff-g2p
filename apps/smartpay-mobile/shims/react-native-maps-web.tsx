/**
 * react-native-maps-web shim
 *
 * Purpose:
 * - Prevent web bundling from importing native-only `react-native-maps`.
 * - Location: `fintech/apps/smartpay-mobile/shims/react-native-maps-web.tsx`
 *
 * Functionality:
 * - Exports minimal MapView/Marker/Callout components compatible with
 *   existing imports (including `require('react-native-maps')` patterns).
 * - When running on web, these components render simple Views.
 */

import React from 'react';
import { View } from 'react-native';

// Keep in sync with `react-native-maps` API expectations used in `ATMMapCard.tsx`.
const MapView = (_props: any) => <View />;

const Marker = (_props: any) => <View />;

const Callout = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;

// `ATMMapCard` references this constant to set `provider={PROVIDER_GOOGLE}`.
export const PROVIDER_GOOGLE = 'google';

export default MapView;
export { Marker, Callout };

