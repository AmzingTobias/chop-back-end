import { QueryConfig } from "pg";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";
import { FOREIGN_KEY_VIOLATION } from "../common/postgresql-error-codes";

// Type describing the product entry that exists in the database
export type TProductEntry = {
  // The name of the product
  name: string;
  // If the product is available
  available?: boolean;
  // The date the product was created on
  created_on?: Date;
  // The Id of the brand (if exists) the product is tied to
  brand_id: number | null;
  // The description of the product, if one exists
  description: string | null;
};

/**
 * Update a product's name
 * @param productId The Id of the product to update
 * @param newName The new name for the product
 * @returns EDatabaseResponses.OK if the name is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * Rejects on database errors
 */
export const updateProductName = (
  productId: number,
  newName: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products SET name = $1 WHERE id = $2",
      [newName, productId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
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
 * Update a product's description
 * @param productId The Id of the product to update
 * @param newDescription The new description for the product
 * @returns EDatabaseResponses.OK if the description is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * Rejects on database errors
 */
export const updateProductDescription = (
  productId: number,
  newDescription: string | null
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products SET description = $1 WHERE id = $2",
      [newDescription, productId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
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
 * Update a product's brand id
 * @param productId The Id of the product to update
 * @param newBrandId The new brand id for the product
 * @returns EDatabaseResponses.OK if the brand id is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * EDatabaseResponse.FOREIGN_KEY_VIOLATION if the brand id is not valid
 * Rejects on database errors
 */
export const updateBrandId = (
  productId: number,
  newBrandId: number | null
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products SET brand_id = $1 WHERE id = $2",
      [newBrandId, productId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(`${err.code}: ${err.message}`);
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
