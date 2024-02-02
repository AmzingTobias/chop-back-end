import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../../data/data";

/**
 * Add a product to the customers view history
 * @param customerId The id of the customer
 * @param productId The id of the product
 * @returns EDatabaseResponses.OK if the product is added,
 * EDatabaseResponses.UNIQUE_CONSTRAINT_FAILED if the product has already been added,
 * EDatabaseResponses.FOREIGN_KEY_CONSTRAINT if the product or customer does not exist.
 * Rejects on database errors
 */
export const addProductToViewHistory = (
  customerId: number,
  productId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO product_view_history(product_id, customer_id) VALUES($1, $2)",
      [productId, customerId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(err);
            reject(err);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};

/**
 * Remove a product from a customer's view history
 * @param customerId The id of the customer
 * @param productId The id of the product
 * @returns EDatabaseResponses.OK if the product is removed,
 * EDatabaseResponses.DOES_NOT_EXIST if the product is not in the view history.
 * Rejects on database errors
 */
export const removeProductFromViewHistory = (
  customerId: number,
  productId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM product_view_history WHERE product_id = $1 AND customer_id = $2",
      [productId, customerId],
      (err, res) => {
        if (err) {
          console.error(err);
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

type TCustomerViewHistory = {
  productId: number;
  date: Date;
};

/**
 * Get the customer's view history
 * @param customerId The id of the customer
 * @param limit The max number of entries in the history to get
 * @returns A list of the customer's view history. Rejects on database errors
 */
export const getCustomerViewHistory = (
  customerId: number,
  limit: number
): Promise<TCustomerViewHistory[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT product_id AS "productId", date_viewed AS "date"
    FROM (
        SELECT
            product_id,
            date_viewed,
            ROW_NUMBER() OVER (PARTITION BY customer_id, product_id ORDER BY date_viewed DESC) AS rnk
        FROM product_view_history
        WHERE customer_id = $1
    ) AS ranked_view
    WHERE rnk = 1
    ORDER BY date_viewed desc
    LIMIT $2
    `,
      [customerId, limit],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};

/**
 * Check if a customer has viewed a product today
 * @param customerId The id of the customer
 * @param productId The id of the product
 * @returns True if the customer has viewed the product today, false otherwise
 */
export const hasProductBeenViewedToday = (
  customerId: number,
  productId: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT id FROM product_view_history WHERE customer_id = $1 AND product_id = $2 AND date_viewed = CURRENT_DATE",
      [customerId, productId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rowCount > 0);
        }
      }
    );
  });
};
