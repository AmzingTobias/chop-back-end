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
    orders.placed_on::date AS "placedOn"
    FROM product_orders
    LEFT JOIN orders on product_orders.order_id = orders.id
    GROUP BY orders.placed_on::date
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

type TViewHistoryAnalytics = {
  productId: number;
  name: string;
  viewCount: number;
};

/**
 * Get view history per product between two dates
 * @param startDate The start date for the range
 * @param endDate The end date for the range
 * @returns A list of TViewHistoryAnalytics
 */
export const getViewHistoryAnalytics = (
  startDate: Date,
  endDate: Date
): Promise<TViewHistoryAnalytics[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      product_id AS "productId", 
      products.name,
      COUNT(*) AS "viewCount"
    FROM product_view_history
    LEFT JOIN products on product_view_history.product_id = products.id
    WHERE date_viewed::date BETWEEN $1 AND $2
    GROUP BY product_id, products.name
    ORDER BY COUNT(*) DESC
  `,
      [startDate, endDate],
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

type TPurchasePerProductType = {
  productType: string;
  total: number;
};

/**
 * Get the purchases made in a given date period by product type
 * @param startDate The start date for the range
 * @param endDate The end date for the range
 * @returns A list of TPurchasePerProductType
 */
export const getPurchasesPerProductType = (
  startDate: Date,
  endDate: Date
): Promise<TPurchasePerProductType[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
      SELECT
        product_types.type AS "productType",
        SUM(product_orders.quantity) AS total
      FROM product_types
      LEFT JOIN assigned_product_type ON product_types.id = assigned_product_type.type_id
      LEFT JOIN base_products ON base_products.id = assigned_product_type.product_id
      LEFT JOIN products ON base_products.id = products.base_product_id
      LEFT JOIN product_orders ON products.id = product_orders.product_id
      LEFT JOIN orders ON product_orders.order_id = orders.id
      WHERE orders.placed_on::date BETWEEN $1 AND $2
      GROUP BY product_types.type
      `,
      [startDate, endDate],
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
