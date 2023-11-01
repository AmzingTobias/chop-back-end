import { UNIQUE_CONSTRAINT_FAILED } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

type TProductTypeEntry = {
  id: number;
  type: string;
};

/**
 * Get a list of all the product types
 * @returns A list of all the product types in the database. Rejects on database error
 */
export const getAllProductTypes = (): Promise<TProductTypeEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT id, type FROM product_types",
      (err: ICustomError, res) => {
        if (!err) {
          resolve(res.rows as TProductTypeEntry[]);
        } else {
          reject(`${err.code}: ${err.message}`);
        }
      }
    );
  });
};

/**
 * Create a new product type
 * @param productTypeName The name of the product type to create
 * @returns True if the product type is created, False if the product type already exists. Rejects on database errors
 */
export const createProductType = (
  productTypeName: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO product_types(type) VALUES($1)",
      [productTypeName],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(false);
          } else {
            reject(`${err.code}: ${err.message}`);
          }
        } else {
          resolve(res.rowCount > 0);
        }
      }
    );
  });
};

/**
 * Update a product type
 * @param productTypeId The Id of the product type to update
 * @param newProductTypeName The new name for the product type
 * @returns EDatabaseResponses.OK if the product type is updated, EDatabaseResponses.DOES_NOT_EXIST if
 * the product type doesn't exist or already exists. EDatabaseResponses.CONFLICT if the new product type
 * name already exists. Rejects on database error
 */
export const updateProductType = (
  productTypeId: number,
  newProductTypeName: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE product_types SET type = $1 WHERE id = $2",
      [newProductTypeName, productTypeId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else {
            reject(`${err.code}: ${err.message}`);
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
 * Delete a product type using an Id
 * @param productTypeId The Id of the product type to remove
 * @returns EDatabaseResponses.OK if the product type is deleted,
 * EDatabaseResponses.DOES_NOT_EXIST if the Id does not relate to a product type.
 * Rejects on database errors
 */
export const deleteProductType = (
  productTypeId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM product_types WHERE id = $1",
      [productTypeId],
      (err: ICustomError, res) => {
        if (err) {
          reject(`${err.code}: ${err.message}`);
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
