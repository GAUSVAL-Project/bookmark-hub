// Contract for a FUTURE Microsoft Graph / MSAL adapter.
// No authentication, token handling, remote calls, or synchronization exists.
export const syncProvider = Object.freeze({
  available:false,
  label:'OneDrive同期・ログインは未実装',
  async sync(){throw new Error('OneDrive同期は未実装です。JSONバックアップをご利用ください。');}
});
