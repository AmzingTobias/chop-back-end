import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../../data/data";

/**
 * Mark a product as favourite
 * @param customerId The id of the customer who marked the product as favourite
 * @param productId The id of the product
 * @returns EDatabaseResponses.OK if the product is made favourite,
 * EDatabaseResponses.CONFLICT if the product is already made favourite,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if either the product or customer does not exist.
 * Rejects on database errors
 */
export const setProductAsFavourite = (
  customerId: number,
  productId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO customer_favourite_products(customer_id, product_id) VALUES ($1, $2)",
      [customerId, productId],
      (err: ICustomError, _) => {
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
 * Remove a product from being a favourite
 * @param customerId The id of the customer
 * @param productId The id of the product to remove
 * @returns EDatabaseResponses.OK if the product is no longer favourited,
 * EDatabaseResponses.DOES_NOT_EXIST if the product was never favourited.
 * Rejects on database errors
 */
export const removeProductAsFavourite = (
  customerId: number,
  productId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM customer_favourite_products WHERE customer_id = $1 AND product_id = $2",
      [customerId, productId],
      (err: ICustomError, res) => {
        if (err) {
          {
            console.error(err);
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
 * Check if a product has been favourited by a customer
 * @param customerId The id of the customer
 * @param productId The id of the product
 * @returns True if the product has been favourited, false otherwise. Rejects on database errors
 */
export const hasProductBeenFavourited = (
  customerId: number,
  productId: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT id FROM customer_favourite_products WHERE customer_id = $1 AND product_id = $2",
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

/**
 * Get all the products a customer has marked as favourite
 * @param customerId The id of the customer
 * @returns A list of productIds that the customer has marked as favourite
 */
export const getAllProductsMarkedAsFavourite = (
  customerId: number
): Promise<{ productId: number }[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT product_id AS productId FROM customer_favourite_products WHERE customer_id = $1`,
      [customerId],
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
