import { UNIQUE_CONSTRAINT_FAILED } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

type TBrandEntry = {
  id: number;
  name: string;
};

/**
 * Get all brands
 * @returns A list of all brands in the database. Rejects on database errors
 */
export const getAllBrands = (): Promise<TBrandEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT id, name FROM brands", (err: ICustomError, res) => {
      if (err) {
        console.error(`${err.code}: ${err.message}`);
        reject(err);
      } else {
        resolve(res.rows as TBrandEntry[]);
      }
    });
  });
};

/**
 * Create a new unique brand name
 * @param brandName Unique brand name
 * @returns EDatabaseResponses.OK if the brand is created,
 * EDatabaseResponses.CONFLICT if the brand name is already in use.
 * Rejects on database errors
 */
export const createNewBrand = (
  brandName: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO brands(name) VALUES($1)",
      [brandName],
      (err: ICustomError, _) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else {
            console.error(`${err.code}: ${err.message}`);
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
 * Update a brand's name
 * @param brandId The id of the brand to update
 * @param newBrandName The new name for the brand
 * @returns EDatabaseResponses.OK if the brand name is updated,
 * EDatabaseResponses.CONFLIC if the brand name is already in use,
 * EDatabaseResponses.DOES_NOT_EXIST if the brand Id is not valid.
 * Rejects on database errors
 */
export const updateBrand = (
  brandId: number,
  newBrandName: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE Brands SET name = $1 WHERE id = $2",
      [newBrandName, brandId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
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

/**
 * Delete a brand using an Id
 * @param productTypeId The Id of the brand to remove
 * @returns EDatabaseResponses.OK if the brand is deleted,
 * EDatabaseResponses.DOES_NOT_EXIST if the Id does not relate to a brand.
 * Rejects on database errors
 */
export const deleteBrand = (brandId: number): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM brands WHERE id = $1",
      [brandId],
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
