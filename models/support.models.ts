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
