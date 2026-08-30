const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "notifications@visiondatalabs.com";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "VisionTrack - Vision Datalabs";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  title: string;
  headline: string;
  issueCode?: string;
  issueTitle?: string;
  details?: { label: string; value: string }[];
  actionUrl?: string;
  actionText?: string;
}

export async function sendBrevoEmail(params: SendEmailParams) {
  if (!BREVO_API_KEY) {
    console.log(`[Email Service (Mock)]: Brevo API key not set. Email not sent to ${params.to.map((t) => t.email).join(", ")}. Subject: ${params.subject}`);
    return { success: true, mock: true };
  }

  const actionLink = params.actionUrl
    ? (params.actionUrl.startsWith("http") ? params.actionUrl : `${APP_URL}${params.actionUrl}`)
    : `${APP_URL}/dashboard`;

  const detailsHtml = params.details && params.details.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
        ${params.details
          .map(
            (d) => `
          <tr>
            <td style="padding: 10px 16px; font-weight: 600; color: #475569; width: 35%; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${d.label}</td>
            <td style="padding: 10px 16px; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${d.value}</td>
          </tr>`
          )
          .join("")}
      </table>
    `
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 24px 32px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; }
          .content { padding: 32px; color: #1e293b; }
          .tag { display: inline-block; background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }
          .headline { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
          .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>VisionTrack</h1>
            <p>Vision Datalabs Quality & Issue Management</p>
          </div>
          <div class="content">
            ${params.issueCode ? `<span class="tag">${params.issueCode}</span>` : ""}
            <h2 class="title">${params.title}</h2>
            <p class="headline">${params.headline}</p>
            ${detailsHtml}
            <div class="btn-container">
              <a href="${actionLink}" class="btn">${params.actionText || "Open Issue in VisionTrack"}</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from VisionTrack for Vision Datalabs.</p>
            <p style="margin-top: 4px;">Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: params.to,
        subject: params.subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Email Service Error]: Brevo API responded with error:", res.status, errBody);
      return { success: false, error: errBody };
    }

    return { success: true };
  } catch (error) {
    console.error("[Email Service Error]: Failed to send Brevo email:", error);
    return { success: false, error };
  }
}
