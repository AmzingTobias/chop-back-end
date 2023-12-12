import pool, { ICustomError } from "../../data/data";

type TProductFilterCategories = {
  id: number;
  name: string;
};

/**
 * Get all filter categories available
 * @returns A list of all filter categories that are available.
 * Rejects on database errors
 */
export const getAllProductFilterCategories = (): Promise<
  TProductFilterCategories[]
> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT id, name FROM filter_categories",
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err);
        } else {
          resolve(res.rows as TProductFilterCategories[]);
        }
      }
    );
  });
};
