import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import { EResponseStatusCodes } from "../../common/response-types";
import { createNewSupportTicket } from "../../models/support.models";
import { EDatabaseResponses } from "../../data/data";

export const supportRouter = Router();

/**
 * @swagger
 * /support:
 *   post:
 *     tags: [Support]
 *     summary: Create a new support ticket
 *     parameters:
 *       - in: body
 *         name: title
 *         required: true
 *         description: The main contents of the ticket
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Support ticket created
 *       400:
 *         description: Request parameters invalid or not supplied
 *       401:
 *         description: Account is not a customer
 *       500:
 *          description: Internal server error
 */
supportRouter.post("/", verifyToken, (req, res) => {
  // Must be customer co create a new support ticket
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const customerId = req.user.accountTypeId;
  // Get the ticket information from request body
  const { title: ticketTitle } = req.body;
  if (typeof ticketTitle !== "string" || ticketTitle.trim().length === 0) {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  } else {
    const trimmedTicketTitle = ticketTitle.trim();
    createNewSupportTicket(trimmedTicketTitle, customerId)
      .then((databaseResponse) => {
        switch (databaseResponse.status) {
          case EDatabaseResponses.OK:
            return res.json({ ticketId: databaseResponse.ticketId });
          case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
            return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
          default:
            return res.sendStatus(
              EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
            );
        }
      })
      .catch((err) => {
        console.error(err);
        return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }
});

export default supportRouter;
