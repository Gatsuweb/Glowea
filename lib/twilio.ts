import Twilio from "twilio";

type SendSmsParams = {
  to: string;
  body: string;
};

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Configuration Twilio manquante");
  }

  return Twilio(accountSid, authToken);
}

function normalizePhoneNumber(phone: string) {
  return phone.replace(/\s/g, "").trim();
}

export async function sendSms(params: SendSmsParams) {
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = normalizePhoneNumber(params.to);

  if (process.env.SMS_PROVIDER === "mock") {
    console.log("MOCK SMS SENT", {
      from: from || "mock_from",
      to,
      body: params.body,
    });

    return {
      sid: `mock_${Date.now()}`,
    };
  }

  if (!from) {
    throw new Error("Numero Twilio expediteur manquant");
  }

  const message = await getTwilioClient().messages.create({
    from,
    to,
    body: params.body,
  });

  return { sid: message.sid };
}