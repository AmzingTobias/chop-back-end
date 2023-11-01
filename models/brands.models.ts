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
        reject(`${err.code}: ${err.message}`);
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
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else {
            reject(`${err.code}: ${err.message}`);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};
