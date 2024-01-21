import { FOREIGN_KEY_VIOLATION } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

/**
 * Find the last date that a customer purchased a product
 * @param customerId The id of the customer
 * @param productId The id of the product to check
 * @returns A date if the customer has purchased the object. Null if they haven't.
 * Rejects on database errors
 */
export const getLastPurchaseDateForProduct = (
  customerId: number,
  productId: number
): Promise<Date | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT order_placed_on FROM orders_with_products_view WHERE customer_id = $1 AND product_id = $2",
      [customerId, productId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          if (res.rowCount > 0) {
            // Should already be in order of date
            resolve(res.rows[0].order_placed_on);
          } else {
            resolve(null);
          }
        }
      }
    );
  });
};

type TOrderEntry = {
  id: number;
  status: string;
  product_count: number;
  total: number;
  placed_on: Date;
};

/**
 * Get a list of orders that a customer has placed
 * @param customerId The id of the customer
 * @returns A list of orders placed by the customer
 */
export const getOrdersForCustomer = (
  customerId: number
): Promise<TOrderEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      orders.id, 
      order_statuses.status, 
      COUNT(product_id) AS "product_count", 
      sum(PRODUCT_ORDERS.item_price_at_purchase * product_orders.quantity) AS "total",
      orders.placed_on FROM orders
    LEFT JOIN order_statuses ON orders.status_id = order_statuses.id
    LEFT JOIN product_orders ON orders.id = product_orders.order_id
    JOIN shipping_addresses ON orders.shipping_address_id = shipping_addresses.id
    GROUP BY order_statuses.status, orders.id, orders.placed_on
    ORDER BY orders.placed_on DESC
    WHERE orders.customer_id = $1
    `,
      [customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};

type TProductInOrder = {
  productId: number;
  quantity: number;
  price: number;
};

/**
 * Get a list of products that were included in the customer's order
 * @param orderId The order Id to get the products for
 * @param customerId Id of the customer who placed the order
 * @returns A list of products with the quantity and price at purchase
 */
export const getProductsInOrder = (
  orderId: number,
  customerId: number
): Promise<TProductInOrder[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT
      product_id AS "productId",
      quantity,
      item_price_at_purchase AS "price"
    FROM orders_with_products_view
    WHERE order_id = $1 AND customer_id = $2
    `,
      [orderId, customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};
