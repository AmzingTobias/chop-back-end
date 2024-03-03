import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import { EResponseStatusCodes } from "../../common/response-types";
import {
  addCommentToTicket,
  assignSupportAccountToTicket,
  createNewSupportTicket,
  getAllCommentsForTicket,
  getAllTicketsForCustomer,
  markTicketAsClosed,
  unassignSelfFromTicket,
} from "../../models/support.models";
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
  // Must be customer to create a new support ticket
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

/**
 * @swagger
 * /support:
 *   get:
 *     tags: [Support]
 *     summary: Get all tickets for a customer
 *     parameters:
 *       - in: params
 *         name: customerId
 *         required: false
 *         description: The id of the customer
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of tickets associated to the user
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              id:
 *                type: number
 *                description: The id of the ticket
 *              createdOn:
 *                type: Date
 *                description: The date the ticket was created
 *              closedOn:
 *                type: Date | null
 *                description: The date the ticket was closed or null
 *              mostRecentAuthorId:
 *                type: number | null
 *                description: The id of the account that made the most recent comment, or null
 *              lastUpdate:
 *                type: Date | null
 *                description: The date the ticket last had a comment attached to it
 *              firstComment:
 *                type: string | null
 *                description: The first comment that was attached to the ticket
 *              title:
 *                type: string
 *                description: The title of the ticket
 *       400:
 *          description: Fields missing in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
supportRouter.get("/", verifyToken, (req, res) => {
  if (
    req.user &&
    (req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.admin)
  ) {
    const { customerId } = req.query;
    if (Number.isNaN(Number(customerId))) {
      return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
    }
    return getAllTicketsForCustomer(Number(customerId))
      .then((tickets) => res.json(tickets))
      .catch((err) => {
        console.error(err);
        return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }

  if (req.user && req.user.accountType === EAccountTypes.customer) {
    return getAllTicketsForCustomer(req.user.accountTypeId)
      .then((tickets) => res.json(tickets))
      .catch((err) => {
        console.error(err);
        return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }

  return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
});

/**
 * @swagger
 * /support/{ticketId}/close:
 *   post:
 *     tags: [Support]
 *     summary: Set a ticket to be closed
 *     parameters:
 *       - in: query
 *         name: ticketId
 *         required: true
 *         description: The id of the ticket to close
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: The ticket was closed
 *       400:
 *          description: Fields missing in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
supportRouter.post("/:ticketId/close", verifyToken, (req, res) => {
  const { ticketId } = req.params;
  const ticketIdAsNumber = Number(ticketId);
  if (Number.isNaN(ticketIdAsNumber)) {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  }

  if (
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.customer)
  ) {
    const customerId =
      req.user.accountType === EAccountTypes.customer
        ? req.user.accountTypeId
        : undefined;
    return markTicketAsClosed(ticketIdAsNumber, customerId)
      .then((databaseResponse) => {
        switch (databaseResponse) {
          case EDatabaseResponses.OK:
            return res.sendStatus(200);
          case EDatabaseResponses.DOES_NOT_EXIST:
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

  return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
});

/**
 * @swagger
 * /support/{ticketId}/comment:
 *   post:
 *     tags: [Support]
 *     summary: Comment on an open ticket
 *     parameters:
 *       - in: query
 *         name: ticketId
 *         required: true
 *         description: The id of the ticket
 *         schema:
 *           type: number
 *       - in: body
 *         name: comment
 *         required: true
 *         description: The comment for the ticket
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The ticket was commented on
 *       400:
 *          description: Fields missing in request or ticket is closed
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
supportRouter.post("/:ticketId/comment", verifyToken, (req, res) => {
  if (
    req.user &&
    (req.user.accountType === EAccountTypes.customer ||
      req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.admin)
  ) {
    const accountId = req.user.user_id;
    const { comment } = req.body;
    const { ticketId } = req.params;
    if (
      typeof comment !== "string" ||
      comment.trim().length === 0 ||
      Number.isNaN(Number(ticketId))
    ) {
      return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
    } else {
      return addCommentToTicket(Number(ticketId), accountId, comment.trim())
        .then((databaseResponse) => {
          switch (databaseResponse) {
            case EDatabaseResponses.OK:
              return res.sendStatus(200);
            case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
            case EDatabaseResponses.DOES_NOT_EXIST:
              return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
            default:
              return res.sendStatus(
                EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
              );
          }
        })
        .catch((err) => {
          console.error(err);
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
        });
    }
  }
  return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
});

/**
 * @swagger
 * /{ticketId}/comments:
 *   get:
 *     tags: [Support]
 *     summary: Get all comments associated with a ticket
 *     parameters:
 *       - in: params
 *         name: ticketId
 *         required: true
 *         description: The id of the ticket
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of comments associated to the ticket
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              id:
 *                type: number
 *                description: The id of the comment
 *              authorId:
 *                type: number
 *                description: The id of the account that commented on the ticket
 *              createdOn:
 *                type: Date
 *                description: The datetime stamp the comment was created
 *              comment:
 *                type: string
 *                description: The details of the comment
 *       400:
 *          description: Fields missing in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
supportRouter.get("/:ticketId/comments", verifyToken, (req, res) => {
  if (
    req.user &&
    (req.user.accountType === EAccountTypes.customer ||
      req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.support)
  ) {
    const customerId =
      req.user.accountType === EAccountTypes.customer
        ? req.user.accountTypeId
        : undefined;
    const { ticketId } = req.params;
    const ticketIdAsNumber = Number(ticketId);
    if (Number.isNaN(ticketIdAsNumber)) {
      return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
    }
    getAllCommentsForTicket(ticketIdAsNumber, customerId)
      .then((comments) => res.json(comments))
      .catch((err) => {
        console.error(err);
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  } else {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
});

/**
 * @swagger
 * /{ticketId}/assign:
 *   put:
 *     tags: [Support]
 *     summary: Assign a support account to a ticket
 *     parameters:
 *       - in: params
 *         name: ticketId
 *         required: true
 *         description: The id of the ticket
 *         schema:
 *           type: number
 *       - in: body
 *         name: supportAccountId
 *         required: false
 *         description: The id of the support account
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Account assigned to ticket
 *       400:
 *          description: Fields missing in request, ticket doesn't exist, or support account doesn't exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
supportRouter.put("/:ticketId/assign", verifyToken, (req, res) => {
  if (
    req.user &&
    (req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.admin)
  ) {
    const ticketId = Number(req.params["ticketId"]);
    const supportAccountId =
      req.user.accountType === EAccountTypes.support
        ? req.user.accountTypeId
        : Number(req.body["supportAccountId"]);
    if (Number.isNaN(supportAccountId) || Number.isNaN(ticketId)) {
      return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
    }
    assignSupportAccountToTicket(ticketId, supportAccountId)
      .then((databaseResponse) => {
        switch (databaseResponse) {
          case EDatabaseResponses.OK:
            return res.sendStatus(200);
          case EDatabaseResponses.DOES_NOT_EXIST:
            return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
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
  } else {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
});

/**
 * @swagger
 * /{ticketId}/assign:
 *   delete:
 *     tags: [Support]
 *     summary: Unassign a support account from a ticket
 *     parameters:
 *       - in: params
 *         name: ticketId
 *         required: true
 *         description: The id of the ticket
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Unassigned account from ticket
 *       400:
 *          description: Fields missing in request, ticket doesn't exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
supportRouter.delete("/:ticketId/assign", verifyToken, (req, res) => {
  const ticketId = Number(req.params["ticketId"]);
  if (Number.isNaN(ticketId)) {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  }
  if (req.user && req.user.accountType === EAccountTypes.admin) {
    assignSupportAccountToTicket(ticketId, null).then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.sendStatus(200);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    });
  } else if (req.user && req.user.accountType === EAccountTypes.support) {
    unassignSelfFromTicket(ticketId, req.user.accountTypeId).then(
      (databaseResponse) => {
        switch (databaseResponse) {
          case EDatabaseResponses.OK:
            return res.sendStatus(200);
          case EDatabaseResponses.DOES_NOT_EXIST:
            return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
          default:
            return res.sendStatus(
              EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
            );
        }
      }
    );
  } else {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
});

export default supportRouter;
