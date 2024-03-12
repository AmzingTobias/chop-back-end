import { Transporter, createTransport } from "nodemailer";
import fs from "fs";
import ejs from "ejs";
import path from "path";

enum EEmailSubject {
  SUPPORT_TICKET_UPDATED = "Your ticket has been updated",
  ORDER_STATUS_UPDATE = "Your order has been updated",
  ORDER_PLACED = "Your order has been placed",
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
      .then((emailInfo) => {
        console.log(`Email sent (${emailSubject}): ${emailInfo.messageId}`);
      })
      .catch((err) => console.error(err));
  }
}

/**
 * Send an email notifying of a ticket update
 * @param emailToSendTo The address of the email to send to
 * @param ticketId The id of the ticket
 * @param ticketTitle The title of the ticket
 */
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

type TAddressForEmail = {
  areaCode: string;
  firstAddressLine: string;
  countryState: string;
  countryName: string;
  secondAddressLine: string;
};
type TDiscountCodesUsedForEmail = {
  code: string;
}[];
export type TProductsInOrderForEmail = {
  name: string;
  quantity: number;
  price: string;
  image: string;
};
type TOrderInfoForEmail = {
  orderId: number;
  orderStatus: string;
  address: TAddressForEmail;
  total: number;
  pricePaid: number;
  discountsUsed: TDiscountCodesUsedForEmail;
  products: TProductsInOrderForEmail[];
};

export enum EOrderEmailTypes {
  PLACED,
  STATUS_UPDATED,
}
/**
 * Send an email relating to an order
 * @param emailToSendTo The address to send the email to
 * @param order The contents of the order to display in the email
 * @param emailType The type of order update being sent
 */
export const sendOrderUpdateEmail = (
  emailToSendTo: string,
  order: TOrderInfoForEmail,
  emailType: EOrderEmailTypes
) => {
  const emailClient = new EmailClient();
  fs.readFile(
    path.join(__dirname, "templates/order_status_message.ejs"),
    "utf8",
    (err, templateContent) => {
      if (err) {
        console.error("Error reading HTML file:", err);
        return;
      }
      const templateData = {
        orderEmailType:
          emailType === EOrderEmailTypes.STATUS_UPDATED ? "updated" : "placed",
        ...order,
      };
      const htmlContent = ejs.render(templateContent, templateData);
      emailClient.sendEmail(
        emailToSendTo,
        emailType === EOrderEmailTypes.STATUS_UPDATED
          ? EEmailSubject.ORDER_STATUS_UPDATE
          : EEmailSubject.ORDER_PLACED,
        htmlContent
      );
    }
  );
};
