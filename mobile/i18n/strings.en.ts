/**
 * English strings – Buffr G2P.
 * Use for t('key') when i18n is wired. Add expo-localization + i18n-js to switch by locale.
 */
export const stringsEn = {
  common: {
    retry: 'Try again',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading…',
    error: 'Something went wrong',
    offline: "You're offline. Some features may be limited.",
    retryConnection: 'Retry',
  },
  onboarding: {
    welcome: 'Welcome to Buffr',
    getStarted: 'Get Started',
    signIn: 'Sign In',
    complete: "You're all set!",
    goToHome: 'Go to Home',
  },
  home: {
    send: 'Send',
    request: 'Request',
    addMoney: 'Add money',
  },
  groups: {
    create: 'Create Group',
    settings: 'Group Settings',
    addMembers: 'Add members',
    deactivateYourself: 'Deactivate Yourself',
    deactivateUser: 'Deactivate User?',
  },
} as const;

export type StringKeys = keyof typeof stringsEn | `${keyof typeof stringsEn}.${string}`;
