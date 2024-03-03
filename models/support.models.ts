import { FOREIGN_KEY_VIOLATION } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

/**
 * Create a new support ticket
 * @param ticketTitle The title of the ticket
 * @param customerId The id of the customer who created the ticket
 * @returns EDatabaseResponses.OK if the ticket was created succesfully,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the customer Id does not exist
 * EDatabaseResponses.DOES_NOT_EXIST if the ticket was not inserted for another reason
 */
export const createNewSupportTicket = (
  ticketTitle: string,
  customerId: number
): Promise<{ status: EDatabaseResponses; ticketId?: number }> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
      INSERT INTO support_tickets(customer_id, title) VALUES ($1, $2) RETURNING id
    `,
      [customerId, ticketTitle],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            return resolve({
              status: EDatabaseResponses.FOREIGN_KEY_VIOLATION,
            });
          }
          return reject(err);
        }
        return resolve(
          res.rowCount > 0
            ? { status: EDatabaseResponses.OK, ticketId: res.rows[0].id }
            : { status: EDatabaseResponses.DOES_NOT_EXIST }
        );
      }
    );
  });
};

type TTicketInfoEntry = {
  createdOn: Date;
  closedOn: Date;
  title: string;
};
/**
 * Get all tickets for a customer
 * @param customerId The id of the customer
 * @returns A list of ticket information
 */
export const getAllTicketsForCustomer = (
  customerId: number
): Promise<TTicketInfoEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      created_on AS "createdOn",
      closed_on AS "closedOn",
      title
    FROM support_tickets
    WHERE customer_id = $1
    `,
      [customerId],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};

export const markTicketAsClosed = (
  ticketId: number,
  customerId?: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    const parameters =
      customerId === undefined ? [ticketId] : [ticketId, customerId];
    pool.query(
      `
      UPDATE support_tickets SET closed_on = CURRENT_DATE
      WHERE id = $1 ${customerId === undefined ? "" : "AND customer_id = $2"}
      `,
      parameters,
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            res.rowCount > 0
              ? EDatabaseResponses.OK
              : EDatabaseResponses.DOES_NOT_EXIST
          );
        }
      }
    );
  });
};

/**
 * Add a comment to a ticket
 * @param ticketId The id of the ticket to comment on
 * @param accountId The id of the account that commented on the ticket
 * @param comment The comment details for the ticket
 * @returns EDatabaseResponses.OK if the ticket was commented succesfully,
 * EDatabaseResponses.DOES_NOT_EXIST if the comment could not be added,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the ticket id or account id is invalid
 */
export const addCommentToTicket = (
  ticketId: number,
  accountId: number,
  comment: string
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pool.connect();
      try {
        // Check the ticket is closed before commenting on it
        client.query(
          "SELECT id FROM support_tickets WHERE id = $1 AND closed_on = null",
          [ticketId],
          (err, res) => {
            if (err) {
              client.release();
              reject(err);
            } else {
              if (res.rowCount > 0) {
                client.query(
                  `
              INSERT INTO support_tickets_comments(ticket_id, author_id, comment) VALUES ($1, $2, $3)
              `,
                  [ticketId, accountId, comment],
                  (err: ICustomError, res) => {
                    if (err) {
                      if (err.code === FOREIGN_KEY_VIOLATION) {
                        client.release();
                        resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
                      }
                      client.release();
                      return reject(err);
                    } else {
                      client.release();
                      resolve(
                        res.rowCount > 0
                          ? EDatabaseResponses.OK
                          : EDatabaseResponses.DOES_NOT_EXIST
                      );
                    }
                  }
                );
              } else {
                client.release();
                resolve(EDatabaseResponses.DOES_NOT_EXIST);
              }
            }
          }
        );
      } catch (err) {
        client.release();
        reject(err);
      }
    } catch (err) {
      reject(err);
    }
  });
};

type TTicketCommentEntry = {
  id: number;
  authorId: number;
  createdOn: Date;
  comment: string;
};

/**
 * Get all the comments associated with a ticket
 * @param ticketId The id of the ticket
 * @param customerId The id of the customer or undefined
 * @returns A list of comments for a ticket
 */
export const getAllCommentsForTicket = (
  ticketId: number,
  customerId?: number
): Promise<TTicketCommentEntry[]> => {
  return new Promise((resolve, reject) => {
    const parameters =
      customerId === undefined ? [ticketId] : [ticketId, customerId];
    pool.query(
      `  
    SELECT
      support_ticket_comments.id,
      support_ticket_comments.author_id AS "authorId",
      support_ticket_comments.created_on AS "createdOn",
      support_ticket_comments.comment
    FROM support_ticket_comments
    LEFT JOIN support_ticket ON support_ticket_comments.ticket_id = support_ticket.id
    WHERE support_ticket_comments.ticket_id = $1 ${
      customerId === undefined ? "" : "AND support_ticket.customer_id = $2"
    }
    ORDER BY support_ticket_comments.created_on DESC
    `,
      parameters,
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};

/**
 * Assign a support account to a ticket
 * @param ticketId The id of the ticket
 * @param supportAccountId The id of the support account
 * @returns EDatabaseResponses.OK if the support account id is assigned,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the support account id does not exist,
 * EDatabaseResponses.DOES_NOT_EXIST if the ticket does not exist
 */
export const assignSupportAccountToTicket = (
  ticketId: number,
  supportAccountId: number | null
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    UPDATE support_tickets SET support_id = $1 WHERE id = $2
    `,
      [supportAccountId, ticketId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            reject(err);
          }
        } else {
          resolve(
            res.rowCount > 0
              ? EDatabaseResponses.OK
              : EDatabaseResponses.DOES_NOT_EXIST
          );
        }
      }
    );
  });
};

/**
 * Unassign a support account from a ticket
 * @param ticketId The id of the ticket
 * @param supportAccountId The id of the support account to unassign from the ticket
 * @returns EDatabaseResponses.OK if the ticket is unassigned from the support account,
 * EDatabaseResponses.DOES_NOT_EXIST if the ticket does not exist, or the support
 * account is not assigned to the ticket
 */
export const unassignSelfFromTicket = (
  ticketId: number,
  supportAccountId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    UPDATE support_tickets SET support_id = null WHERE id = $1 AND support_id = $2
    `,
      [ticketId, supportAccountId],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            res.rowCount > 0
              ? EDatabaseResponses.OK
              : EDatabaseResponses.DOES_NOT_EXIST
          );
        }
      }
    );
  });
};
