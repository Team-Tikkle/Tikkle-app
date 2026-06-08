// Type declarations for Google Identity Services (GSI) SDK
// Loaded dynamically via <script src="https://accounts.google.com/gsi/client">

export interface GoogleTokenResponse {
  access_token?: string
  error?: string
}

export interface GoogleTokenClient {
  requestAccessToken(): void
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
  }): GoogleTokenClient
}

interface GoogleAccounts {
  oauth2: GoogleOAuth2
}

interface Google {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google?: Google
  }
}

export {}
