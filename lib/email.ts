// Email utility for sending invitations and notifications using Resend
import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "InsydTracker <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send email");
  }
}
