type CompleteOtpSignInOptions = {
  refreshSession: () => Promise<unknown>;
  redirectUrl: string;
  hardNavigate?: (url: string) => void;
};

export function completeOtpSignIn({
  refreshSession,
  redirectUrl,
  hardNavigate = (url) => window.location.assign(url),
}: CompleteOtpSignInOptions) {
  try {
    void refreshSession().catch(() => undefined);
  } catch {
    // Authentication already succeeded; the hard navigation reads the cookie.
  }

  hardNavigate(redirectUrl);
}
