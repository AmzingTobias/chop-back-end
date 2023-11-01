import pool, { ICustomError } from "../data/data";

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
