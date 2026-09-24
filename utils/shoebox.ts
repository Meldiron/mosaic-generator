/**
 * "Sign in with Shoebox".
 *
 * Shoebox (an Appwrite project) is an OAuth 2.1 / OpenID Connect provider. This
 * app is registered there as a public client, so it signs in with the
 * authorization code flow plus PKCE and never holds a secret. On the consent
 * screen the user picks one gallery; the gallery API then returns its photos.
 */

const ISSUER = "https://fra.cloud.appwrite.io/v1/oauth2/6ab43a98000b9aedd03c";
const CLIENT_ID = "6ab512350005925f9297";
const GALLERY_API = "https://shoebox-gallery-api.fra.appwrite.run";
const SCOPE = "openid gallery.read";
const PKCE_KEY = "shoebox_pkce";
const TOKEN_KEY = "shoebox_token";

export type ShoeboxPhoto = { id: string; name: string; url: string };
export type ShoeboxGallery = { id: string; name: string; photos: ShoeboxPhoto[] };

/** The page itself, with the trailing slash. Register it as a redirect URI on the Shoebox client. */
const redirectUri = () => `${location.origin}/`;

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const random = (bytes: number) => base64url(crypto.getRandomValues(new Uint8Array(bytes)));

async function sha256(text: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}

/** Sends the browser to Shoebox. It comes back to redirectUri() with ?code=…&state=…. */
export async function signInWithShoebox() {
  const verifier = random(32);
  const state = random(16);
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    state,
    code_challenge: await sha256(verifier),
    code_challenge_method: "S256",
  });
  location.assign(`${ISSUER}/authorize?${params}`);
}

/**
 * Call once on page load. If the URL carries an authorization code, swaps it
 * for an access token (a public client proves itself with the PKCE verifier
 * instead of a secret) and cleans the URL. Returns the token from this or an
 * earlier sign-in in this tab, or null when signed out.
 */
export async function completeSignIn(): Promise<string | null> {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const error = params.get("error");
  if (code || error) history.replaceState(null, "", location.pathname);
  if (error) throw new Error(params.get("error_description") || error);

  const pkce = sessionStorage.getItem(PKCE_KEY);
  if (code && pkce) {
    sessionStorage.removeItem(PKCE_KEY);
    const { verifier, state } = JSON.parse(pkce);
    if (params.get("state") !== state) throw new Error("Sign-in state mismatch, try again");
    const response = await fetch(`${ISSUER}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
      }),
    });
    const token = await response.json();
    if (!response.ok) throw new Error(token.error_description || token.error || "Sign-in failed");
    sessionStorage.setItem(TOKEN_KEY, token.access_token);
  }
  return sessionStorage.getItem(TOKEN_KEY);
}

export function signOutOfShoebox() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Every photo of the one gallery the user shared, from Shoebox's gallery API.
 * The URLs are presigned and valid for an hour; no credentials needed to load them.
 */
export async function loadGallery(token: string): Promise<ShoeboxGallery> {
  const photos: ShoeboxPhoto[] = [];
  let gallery = { id: "", name: "" };
  for (let offset = 0, total = 1; offset < total; offset += 100) {
    const response = await fetch(`${GALLERY_API}/?limit=100&offset=${offset}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      signOutOfShoebox();
      throw new Error("Your Shoebox sign-in expired, sign in again");
    }
    const page = await response.json();
    if (!response.ok) throw new Error(`Shoebox gallery: ${page.error}`);
    gallery = page.gallery;
    total = page.total;
    photos.push(...page.files.filter((file: ShoeboxPhoto) => file.url));
  }
  return { ...gallery, photos };
}
