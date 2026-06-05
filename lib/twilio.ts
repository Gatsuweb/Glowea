import Twilio from "twilio";

type SendSmsParams = {
  to: string;
  body: string;
};

export type SmsProvider = "mock" | "twilio";

export class SmsSendError extends Error {
  code: string;
  userMessage: string;
  details?: unknown;

  constructor(params: { code: string; message: string; userMessage: string; details?: unknown }) {
    super(params.message);
    this.name = "SmsSendError";
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.details = params.details;
  }
}

export function getSmsProvider(): SmsProvider {
  return process.env.SMS_PROVIDER?.trim().toLowerCase() === "twilio" ? "twilio" : "mock";
}

export function getTwilioDiagnostics() {
  return {
    smsProvider: process.env.SMS_PROVIDER || "",
    resolvedProvider: getSmsProvider(),
    hasAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
    hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
    hasFromNumber: Boolean(process.env.TWILIO_FROM_NUMBER),
    fromNumber: process.env.TWILIO_FROM_NUMBER || "",
  };
}

function normalizePhoneNumber(phone: string) {
  const compact = phone
    .trim()
    .replace(/[.\s()-]/g, "")
    .replace(/^00/, "+");

  if (compact.startsWith("+")) return compact;

  if (/^0[67]\d{8}$/.test(compact)) {
    return `+33${compact.slice(1)}`;
  }

  if (/^33[67]\d{8}$/.test(compact)) {
    return `+${compact}`;
  }

  return compact;
}

export function normalizeSmsPhoneNumber(phone: string) {
  const normalized = normalizePhoneNumber(phone);

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new SmsSendError({
      code: "INVALID_PHONE",
      message: `Invalid SMS phone number: ${phone}`,
      userMessage: "Numero invalide. Utilisez un numero au format +336... ou 06...",
      details: { originalPhone: phone, normalizedPhone: normalized },
    });
  }

  return normalized;
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new SmsSendError({
      code: "TWILIO_CONFIG",
      message: "Twilio credentials are missing",
      userMessage: "Twilio non configure. Verifiez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN cote serveur.",
      details: {
        hasAccountSid: Boolean(accountSid),
        hasAuthToken: Boolean(authToken),
      },
    });
  }

  return Twilio(accountSid, authToken);
}

function getTwilioUserMessage(error: unknown) {
  const twilioError = error as { code?: number | string; status?: number; message?: string; moreInfo?: string };
  const code = String(twilioError.code || "");
  const message = twilioError.message || "";

  switch (code) {
    case "21608":
      return "Compte Twilio trial : numero destinataire non verifie.";
    case "21211":
    case "21614":
      return "Numero invalide ou non joignable par SMS.";
    case "21606":
      return "Numero expediteur Twilio invalide ou non autorise.";
    case "21408":
      return "Twilio bloque l'envoi vers ce pays. Verifiez les permissions geographiques.";
    case "20003":
      return "Authentification Twilio refusee. Verifiez le SID et le token cote serveur.";
    default:
      return message ? `Erreur Twilio : ${message}` : "Erreur Twilio inconnue.";
  }
}

export function toSmsSendError(error: unknown) {
  if (error instanceof SmsSendError) return error;

  const twilioError = error as { code?: number | string; status?: number; message?: string; moreInfo?: string };
  return new SmsSendError({
    code: twilioError.code ? `TWILIO_${twilioError.code}` : "TWILIO_ERROR",
    message: twilioError.message || "Twilio send failed",
    userMessage: getTwilioUserMessage(error),
    details: {
      code: twilioError.code,
      status: twilioError.status,
      message: twilioError.message,
      moreInfo: twilioError.moreInfo,
    },
  });
}

export async function sendSms(params: SendSmsParams) {
  const provider = getSmsProvider();
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = normalizeSmsPhoneNumber(params.to);

  if (provider === "mock") {
    console.log("[sms:mock] sent", {
      from: from || "mock_from",
      to,
      body: params.body,
    });

    return {
      sid: `mock_${Date.now()}`,
      to,
      from: from || "mock_from",
      provider,
    };
  }

  if (!from) {
    throw new SmsSendError({
      code: "TWILIO_CONFIG",
      message: "TWILIO_FROM_NUMBER is missing",
      userMessage: "Twilio non configure. TWILIO_FROM_NUMBER est manquant cote serveur.",
      details: { hasFromNumber: false },
    });
  }

  try {
    const message = await getTwilioClient().messages.create({
      from,
      to,
      body: params.body,
    });

    return { sid: message.sid, to, from, provider };
  } catch (error) {
    throw toSmsSendError(error);
  }
}
