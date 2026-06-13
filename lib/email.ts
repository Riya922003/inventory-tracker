// Email utility for sending invitations and notifications using Nodemailer + Gmail
import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const info = await transporter.sendMail({
      from: `"Inventory Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send email");
  }
}
