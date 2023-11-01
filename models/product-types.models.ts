import { UNIQUE_CONSTRAINT_FAILED } from "../common/postgresql-error-codes";
import pool, { ICustomError } from "../data/data";

type TProductTypeEntry = {
  type: string;
};

/**
 * Get a list of all the product types
 * @returns A list of all the product types in the database. Rejects on database error
 */
export const getAllProductTypes = (): Promise<TProductTypeEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT type FROM product_types", (err: ICustomError, res) => {
      if (!err) {
        resolve(res.rows as TProductTypeEntry[]);
      } else {
        reject(`${err.code}: ${err.message}`);
      }
    });
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
