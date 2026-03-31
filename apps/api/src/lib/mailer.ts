import nodemailer from "nodemailer";

import { apiEnv } from "../config";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter =
    apiEnv.EMAIL_TRANSPORT === "JSON"
      ? nodemailer.createTransport({
          jsonTransport: true,
        })
      : nodemailer.createTransport({
          host: apiEnv.SMTP_HOST,
          port: apiEnv.SMTP_PORT,
          secure: apiEnv.SMTP_SECURE,
          auth:
            apiEnv.SMTP_USER && apiEnv.SMTP_PASSWORD
              ? {
                  user: apiEnv.SMTP_USER,
                  pass: apiEnv.SMTP_PASSWORD,
                }
              : undefined,
        });

  return transporter;
}

export async function sendPlatformEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string | undefined;
  fromName?: string | undefined;
  fromAddress?: string | undefined;
  replyTo?: string | undefined;
}) {
  const transport = getTransporter();
  const fromName = input.fromName ?? apiEnv.EMAIL_FROM_NAME;
  const fromAddress = input.fromAddress ?? apiEnv.EMAIL_FROM_ADDRESS;
  const info = await transport.sendMail({
    from: {
      name: fromName,
      address: fromAddress,
    },
    to: input.to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return {
    messageId: info.messageId,
    accepted: Array.isArray(info.accepted) ? info.accepted : [],
    rejected: Array.isArray(info.rejected) ? info.rejected : [],
    transport: apiEnv.EMAIL_TRANSPORT,
  };
}
