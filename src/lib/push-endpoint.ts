// Where a phone's push address may point. A push address is a web address the server
// will send to, so the test route only sends to the push services phones actually use:
// Apple's, Google's, Mozilla's and Microsoft's.
const EXACT = new Set(["web.push.apple.com", "fcm.googleapis.com"]);
const SUFFIXES = [".push.services.mozilla.com", ".notify.windows.com"];

export const isPushServiceEndpoint = (endpoint: string): boolean => {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  // No credentials or odd port: those are how a lookalike address gets past a host check.
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") return false;
  const host = url.hostname.toLowerCase();
  return EXACT.has(host) || SUFFIXES.some((suffix) => host.endsWith(suffix));
};
