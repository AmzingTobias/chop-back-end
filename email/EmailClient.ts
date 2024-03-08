import { Transporter, createTransport } from "nodemailer";
import fs from "fs";
import ejs from "ejs";
import path from "path";

enum EEmailSubject {
  SUPPORT_TICKET_UPDATED = "Your ticket has been updated",
}

class EmailClient {
  readonly transporter: Transporter;
  constructor() {
    this.transporter = createTransport({
      host: process.env["SITE_EMAIL_HOST_NAME"],
      port: Number(process.env["SITE_EMAIL_HOST_PORT"]),
      secure: true,
      auth: {
        user: process.env["SITE_EMAIL_USER"],
        pass: process.env["SITE_EMAIL_PASS"],
      },
    });
  }

  sendEmail(
    toEmail: string,
    emailSubject: EEmailSubject,
    htmlContentForEmail: string
  ) {
    const fromEmail = `"Chop support" <${process.env["SITE_EMAIL_USER"]}>`;
    this.transporter
      .sendMail({
        from: fromEmail,
        to: toEmail,
        subject: emailSubject,
        html: htmlContentForEmail,
      })
      .then(() => {})
      .catch((err) => console.error(err));
  }
}

export const sendTicketUpdateEmail = (
  emailToSendTo: string,
  ticketId: number,
  ticketTitle: string
) => {
  const emailClient = new EmailClient();

  fs.readFile(
    path.join(__dirname, "templates/ticket_update.ejs"),
    "utf8",
    (err, templateContent) => {
      if (err) {
        console.error("Error reading HTML file:", err);
        return;
      }
      const templateData = {
        ticketTitle: ticketTitle,
        ticketId: ticketId,
      };
      const htmlContent = ejs.render(templateContent, templateData);
      emailClient.sendEmail(
        emailToSendTo,
        EEmailSubject.SUPPORT_TICKET_UPDATED,
        htmlContent
      );
    }
  );
};
