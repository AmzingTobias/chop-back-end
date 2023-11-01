import pool from "../data/data";

type TProductTypeEntry = {
  type: string;
};

/**
 * Get a list of all the product types
 * @returns A list of all the product types in the database. Rejects on database error
 */
export const getAllProductTypes = (): Promise<TProductTypeEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT type FROM product_types", (err, res) => {
      if (!err) {
        resolve(res.rows as TProductTypeEntry[]);
      } else {
        reject(err.message);
      }
    });
  });
};
