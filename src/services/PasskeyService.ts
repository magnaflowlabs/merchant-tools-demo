import { logger } from '@/utils/logger';
import { passkeyRegister, passkeyVerifyFinish } from '@/services/ws/api';
import type { PasskeyVerifyStartData } from '@/auth/types';
export interface PasskeyCredential {
  id: string;
  rawId: ArrayBuffer;
  type: 'public-key';
  response: {
    attestationObject?: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer;
  };
}

export class PasskeyService {
  private static readonly RP_ID = PasskeyService.getRelyingPartyId();

  /**
   * Get Relying Party ID (Smart domain detection)
   */
  private static getRelyingPartyId(): string {
    const hostname = window.location.hostname;
    // Local development environment
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost';
    }

    // Check if it's an IP address
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIpAddress) {
      return hostname; // IP address must use itself as RP_ID
    }

    // Check if it's a subdomain of magnaflow.top
    if (hostname.endsWith('.magnaflow.top')) {
      return 'magnaflow.top'; // For subdomains, use the top-level domain
    }

    // Check if it's the exact magnaflow.top domain
    if (hostname === 'magnaflow.top') {
      return 'magnaflow.top';
    }
    return hostname;
  }

  /**
   * ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Register a new passkey
   */
  static async registerPasskey(
    passkey_verify_start_data: PasskeyVerifyStartData
  ): Promise<boolean> {
    try {
      // Create credential options
      const createCredentialOptions: CredentialCreationOptions = {
        publicKey: {
          rp: {
            id: this.RP_ID,
            name: passkey_verify_start_data.rp_name,
          },
          user: {
            id: new TextEncoder().encode(passkey_verify_start_data.user_id),
            name: passkey_verify_start_data.user_id,
            displayName: passkey_verify_start_data.user_id,
          },
          challenge: new TextEncoder().encode(passkey_verify_start_data.challenge),
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: -7, // ES256
            },
            {
              type: 'public-key',
              alg: -257, // RS256
            },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      };

      // Create credential (get attestation material)
      const credential = (await navigator.credentials.create(
        createCredentialOptions
      )) as PublicKeyCredential;

      if (!credential) {
        throw new Error('User cancelled Passkey registration or registration failed');
      }

      // Organize registration materials to be sent to backend
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const attestationObject = attestationResponse.attestationObject;
      const clientDataJSON = attestationResponse.clientDataJSON;

      const publicKey = attestationResponse.getPublicKey
        ? attestationResponse.getPublicKey()
        : null;

      if (!attestationObject || !clientDataJSON) {
        throw new Error('Invalid attestation response');
      }
      if (!publicKey) {
        throw new Error('Merchant service not initialized');
      }
      // Send registration data to server
      const registerRes = await passkeyRegister({
        credential_id: this.arrayBufferToBase64(credential.rawId),
        public_key: this.arrayBufferToBase64(publicKey),
        attestation_object: this.arrayBufferToBase64(attestationObject),
        client_data_json: this.arrayBufferToBase64(clientDataJSON),
      });

      if (!registerRes.success && registerRes.code === 200) {
        throw new Error(registerRes.error || 'Passkey register failed');
      }

      return true;
    } catch (error) {
      logger.error('Error registering passkey:', error);
      return false;
    }
  }

  /**
   * Verify passkey
   */
  static async verifyPasskey(passkey_verify_start_data: PasskeyVerifyStartData): Promise<any> {
    try {
      const challengeB64 = passkey_verify_start_data.challenge as string;
      if (!challengeB64) {
        throw new Error('Server did not return challenge');
      }

      const passkeyRegistered_ids = passkey_verify_start_data?.registered_ids;

      const allowCredentials = passkeyRegistered_ids
        ? passkeyRegistered_ids.map((id) => ({
            type: 'public-key' as const,

            id: Uint8Array.from(atob(id), (c) => c.charCodeAt(0)),
          }))
        : undefined;
      const getCredentialOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: new TextEncoder().encode(challengeB64),
          rpId: this.RP_ID,
          allowCredentials: allowCredentials,
          userVerification: 'required',
          timeout: 60000,
        },
      };

      const credential = (await navigator.credentials.get(
        getCredentialOptions
      )) as PublicKeyCredential;
      if (!credential) {
        throw new Error('User cancelled Passkey verification or verification failed');
      }

      const assertion = credential.response as AuthenticatorAssertionResponse;
      if (!assertion.signature || !assertion.authenticatorData) {
        throw new Error('Invalid assertion response');
      }

      // 3) Send assertion to backend to complete verification
      const finishRes = await passkeyVerifyFinish({
        credential_id: this.arrayBufferToBase64(credential.rawId),
        authenticator_data: this.arrayBufferToBase64(assertion.authenticatorData),
        client_data_json: this.arrayBufferToBase64(assertion.clientDataJSON),
        signature: this.arrayBufferToBase64(assertion.signature),
      });

      if (!finishRes.success && finishRes.code === 200) {
        throw new Error(finishRes.error || 'Passkey verify finish failed');
      }

      return finishRes;
    } catch (error) {
      logger.error('Error verifying passkey:', error);
      return false;
    }
  }
}
