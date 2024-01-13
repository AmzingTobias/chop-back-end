import pool from "../data/data";

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
