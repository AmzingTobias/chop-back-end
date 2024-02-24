import pool from "../data/data";

export type TPurchaseAmountPerDate = {
  totalProductsSold: number;
  totalAmount: number;
  placedOn: Date;
};

/**
 * Get purchase amount per date
 * @returns List of TPurchaseAmountPerDate
 */
export const getPurchaseAmountPerDate = (): Promise<
  TPurchaseAmountPerDate[]
> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT SUM(quantity) AS "totalProductsSold",
    SUM(price_paid)::money::numeric::float8 AS "totalAmount",
    orders.placed_on AS "placedOn"
    FROM product_orders
    LEFT JOIN orders on product_orders.order_id = orders.id
    GROUP BY orders.placed_on
    `,
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};
