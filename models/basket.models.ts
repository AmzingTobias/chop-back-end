import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

type TCustomerBasketEntry = {
  productId: number;
  quantity: number;
};

/**
 * Get all products in a customer's basket
 * @param customerId Id of the customer
 * @returns A list of all items in the customer's basket.
 * Rejects on database errors
 */
export const getAllProductsInBasket = (
  customerId: number
): Promise<TCustomerBasketEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT product_id as "productId", quantity FROM products_in_basket WHERE customer_id = $1
    `,
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

/**
 * Add a new product to the basket
 * @param customerId The id of the customer
 * @param productId The id of the product in the basket
 * @param quantity The amount to add to the customer's basket
 * @returns EDatabaseResponses.OK if the product is added,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the product or customer does not exist,
 * EDatabaseResponses.CONFLICT if the product is already in the basket.
 * Rejects on database errors
 */
export const addProductToBasket = (
  customerId: number,
  productId: number,
  quantity: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO products_in_basket(customer_id, product_id, quantity) VALUES ($1, $2, $3)",
      [customerId, productId, quantity],
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
 * Remove a product from a customer's basket
 * @param customerId The id of the customer
 * @param productId The id of the product
 * @returns EDatabaseResponses.OK if product removed from basket,
 * EDatabaseResponses.DOES_NOT_EXIST if no products exist to remove, or customer
 * doesn't exist. Rejects on database errors
 */
export const removeProductFromBasket = (
  customerId: number,
  productId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM products_in_basket WHERE customer_id = $1 AND product_id = $2",
      [customerId, productId],
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

/**
 * Update the quantity of products in a customer's basket
 * @param customerId The id of the customer
 * @param productId The id of the product
 * @param newQuantity The new quantity to have of the product (> 1)
 * @returns EDatabaseResponses.OK if the product quantity is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product is not in the basket to update.
 * Rejects on database errors
 */
export const updateQuantityOfProductInBasket = (
  customerId: number,
  productId: number,
  newQuantity: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products_in_basket SET quantity = $1 WHERE customer_id = $2 AND product_id = $3",
      [newQuantity, customerId, productId],
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

/**
 * Remove all products from a customer's basket
 * @param customerId The id of the customer
 * @returns EDatabaseResponses.OK if all products are removed,
 * EDatabaseResponses.DOES_NOT_EXIST if no products exist to remove, or customer
 * doesn't exist. Rejects on database errors
 */
export const clearBasket = (
  customerId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM products_in_basket WHERE customer_id = $1",
      [customerId],
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
