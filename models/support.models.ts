import { FOREIGN_KEY_VIOLATION } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";
import { EAccountTypes } from "../security/security";

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

interface ITicketInfoEntry {
  id: number;
  createdOn: Date;
  closedOn: Date | null;
  mostRecentAuthorId: number | null;
  lastUpdate: Date | null;
  firstComment: string | null;
  title: string;
}

interface ITicketInfoEntryStaff extends ITicketInfoEntry {
  assignedSupportId: number | null;
}

/**
 * Get all support tickets that exist
 * @returns A list of ITicketInfoEntryStaff
 */
export const getAllTickets = (
  supportStaffId?: number
): Promise<ITicketInfoEntryStaff[]> => {
  return new Promise((resolve, reject) => {
    const parameters = supportStaffId === undefined ? [] : [supportStaffId];
    pool.query(
      `
    SELECT DISTINCT
      support_tickets.id,
      support_tickets.created_on AS "createdOn",
      support_tickets.closed_on AS "closedOn",
      support_tickets.support_id AS "assignedSupportId",
      (SELECT author_id FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on DESC LIMIT 1) AS "mostRecentAuthorId",
      (SELECT support_ticket_comments.created_on FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on DESC LIMIT 1) AS "lastUpdate",
      (SELECT support_ticket_comments.comment FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on LIMIT 1) AS "firstComment",
      support_tickets.title
    FROM support_tickets
    LEFT JOIN support_ticket_comments on support_tickets.id = support_ticket_comments.ticket_id
    ${
      supportStaffId === undefined
        ? ""
        : "WHERE support_tickets.support_id is NULL OR support_tickets.support_id = $1"
    }
    ORDER BY "lastUpdate" DESC
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
 * Get all tickets for a customer
 * @param customerId The id of the customer
 * @returns A list of ticket information
 */
export const getAllTicketsForCustomer = (
  customerId: number
): Promise<ITicketInfoEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT DISTINCT
      support_tickets.id,
      support_tickets.created_on AS "createdOn",
      support_tickets.closed_on AS "closedOn",
      (SELECT author_id FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on DESC LIMIT 1) AS "mostRecentAuthorId",
      (SELECT support_ticket_comments.created_on FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on DESC LIMIT 1) AS "lastUpdate",
      (SELECT support_ticket_comments.comment FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on LIMIT 1) AS "firstComment",
      support_tickets.title
    FROM support_tickets
    LEFT JOIN support_ticket_comments on support_tickets.id = support_ticket_comments.ticket_id
    WHERE customer_id = $1
    ORDER BY "lastUpdate" DESC
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

/**
 * Get a specific ticket with an Id
 * @param ticketId The id of the ticket
 * @param customerId The id of the customer for auth check
 * @returns A TTicketInfoEntry if the ticket exists, or null if not
 */
export const getTicketWithId = (
  ticketId: number,
  customerId?: number
): Promise<ITicketInfoEntry | null> => {
  return new Promise((resolve, reject) => {
    const parameters =
      customerId === undefined ? [ticketId] : [ticketId, customerId];
    pool.query(
      `
    SELECT DISTINCT
      support_tickets.id,
      support_tickets.created_on AS "createdOn",
      support_tickets.closed_on AS "closedOn",
      (SELECT author_id FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on DESC LIMIT 1) AS "mostRecentAuthorId",
      (SELECT support_ticket_comments.created_on FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on DESC LIMIT 1) AS "lastUpdate",
      (SELECT support_ticket_comments.comment FROM support_ticket_comments WHERE ticket_id = support_tickets.id ORDER BY created_on LIMIT 1) AS "firstComment",
      support_tickets.title
    FROM support_tickets
    LEFT JOIN support_ticket_comments on support_tickets.id = support_ticket_comments.ticket_id
    WHERE support_tickets.id = $1 ${
      customerId === undefined ? "" : "AND customer_id = $2"
    }
    ORDER BY "lastUpdate" DESC
    `,
      parameters,
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rowCount > 0 ? res.rows[0] : null);
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
      UPDATE support_tickets SET closed_on = CURRENT_TIMESTAMP(0)
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
          "SELECT id FROM support_tickets WHERE id = $1 AND closed_on IS NULL",
          [ticketId],
          (err, res) => {
            if (err) {
              client.release();
              reject(err);
            } else {
              if (res.rowCount > 0) {
                client.query(
                  `
              INSERT INTO support_ticket_comments(ticket_id, author_id, comment) VALUES ($1, $2, $3)
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
  authorAccountType: EAccountTypes;
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
      (SELECT
        CASE
            WHEN customer_accounts.account_id IS NOT NULL THEN 0
            WHEN sale_accounts.account_id IS NOT NULL THEN 1
            WHEN support_accounts.account_id IS NOT NULL THEN 2
            WHEN admin_accounts.account_id IS NOT NULL THEN 3
            WHEN warehouse_accounts.account_id IS NOT NULL THEN 4
        END AS assigned_table
      FROM
          accounts
      LEFT JOIN
          admin_accounts ON accounts.id = admin_accounts.account_id
      LEFT JOIN
          customer_accounts ON accounts.id = customer_accounts.account_id
      LEFT JOIN
          support_accounts ON accounts.id = support_accounts.account_id
      LEFT JOIN
          warehouse_accounts ON accounts.id = warehouse_accounts.account_id
      LEFT JOIN
          sale_accounts ON accounts.id = sale_accounts.account_id
      WHERE accounts.id = support_ticket_comments.author_id) AS "authorAccountType",
      support_ticket_comments.created_on AS "createdOn",
      support_ticket_comments.comment
    FROM support_ticket_comments
    LEFT JOIN support_tickets ON support_ticket_comments.ticket_id = support_tickets.id
    WHERE support_ticket_comments.ticket_id = $1 ${
      customerId === undefined ? "" : "AND support_tickets.customer_id = $2"
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

type TSupportAccount = {
  supportId: number;
  email: string;
};

/**
 * Get the id of the assigned support staff for a ticket
 * @param ticketId The ticket id
 * @returns A TSupportAccount if there's a support staff assigned, null otherwise
 */
export const getAssignedSupportStaffIdForTicket = (
  ticketId: number
): Promise<TSupportAccount | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
      SELECT support_id AS "supportId", email
      FROM support_tickets
          LEFT JOIN support_accounts on support_tickets.support_id = support_accounts.id
          LEFT JOIN accounts ON support_accounts.account_id = accounts.id
      WHERE support_tickets.id = $1 AND support_id IS NOT NULL
    `,
      [ticketId],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rowCount > 0 ? res.rows[0] : null);
        }
      }
    );
  });
};

interface ISupportStaffWithAssigned extends TSupportAccount {
  ticketCount: number;
}

/**
 * Get all the support staff available for being assigned to a ticket
 * @returns A list of support staff with a count for the number of tickets they're already assigned to
 */
export const getAllSupportStaffWithAssignedCount = (): Promise<
  ISupportStaffWithAssigned[]
> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      support_accounts.id AS "supportId",
      email,
      COUNT(support_tickets.id) AS "ticketCount"
    FROM support_accounts
    LEFT JOIN support_tickets ON support_accounts.id = support_tickets.support_id
    LEFT JOIN accounts ON support_accounts.account_id = accounts.id
    WHERE support_tickets.closed_on is NULL
    GROUP BY support_accounts.id, email
    `,
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
 * Get the customer that created
 * @param ticketId The id of the ticket
 * @returns The id of the customer or null if the ticket id is invalid
 */
export const getCustomerIdFromTicket = (
  ticketId: number
): Promise<number | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT customer_id FROM support_tickets WHERE id = $1
    `,
      [ticketId],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rowCount > 0 ? res.rows[0].customer_id : null);
        }
      }
    );
  });
};
