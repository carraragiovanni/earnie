import twilio from 'twilio';
import { decryptString } from '../crypto/encryption.js';
import { env } from '../env.js';

export function getTwilioClient(twilioConfig: {
  accountSidEnc: string;
  authTokenEnc: string;
}) {
  const accountSid = decryptString(twilioConfig.accountSidEnc, env.APP_ENCRYPTION_KEY);
  const authToken = decryptString(twilioConfig.authTokenEnc, env.APP_ENCRYPTION_KEY);
  return twilio(accountSid, authToken);
}

export function decryptAuthToken(authTokenEnc: string): string {
  return decryptString(authTokenEnc, env.APP_ENCRYPTION_KEY);
}
