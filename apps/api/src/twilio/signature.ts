import twilio from 'twilio';

export function validateTwilioWebhookSignature(opts: {
  authToken: string;
  twilioSignatureHeader: string | undefined;
  url: string;
  params: Record<string, string>;
}): boolean {
  const { authToken, twilioSignatureHeader, url, params } = opts;
  if (!twilioSignatureHeader) return false;
  try {
    return twilio.validateRequest(authToken, twilioSignatureHeader, url, params);
  } catch {
    return false;
  }
}
