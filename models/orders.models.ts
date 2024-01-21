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

export enum EOrderPlaceStatus {
  // The order was placed
  OK,
  // Basket contained products not currently available, or the basket was empty
  BASKET_INVALID,
  // Shipping address id does not belong to customer
  SHIPPING_ADDRESS_INVALID,
}

/**
 * Place a customer's order, using the contents of their basket
 * @param customerId The id of the customer
 * @param shippingAddressId The id for the shipping address
 * @returns EOrderPlaceStatus
 */
export const placeOrder = (
  customerId: number,
  shippingAddressId: number
): Promise<EOrderPlaceStatus> => {
  return new Promise(async (resolve, reject) => {
    try {
      let transactionStatus = EOrderPlaceStatus.OK;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Validate shipping address is customer's
        const shippingAddressValidate = await client.query(
          "SELECT id FROM shipping_addresses WHERE customer_id = $1 AND id = $2",
          [customerId, shippingAddressId]
        );
        if (shippingAddressValidate.rowCount > 0) {
          // Get a list of products in the basket, with a column to say if they're available for order
          const validateProducts = await client.query(
            `
        SELECT 
          products_in_basket.product_id, 
          products_in_basket.quantity,
          (products_in_basket.quantity <= product_view.stock_count and product_view.available) as "available", 
          product_view.price::money::numeric::float8 AS "pricePerItem" FROM products_in_basket
        LEFT JOIN product_view ON products_in_basket.product_id = product_view.id
        WHERE customer_id = $1
        `,
            [customerId]
          );
          const productsInBasket: {
            product_id: number;
            quantity: number;
            available: boolean;
            pricePerItem: number;
          }[] = validateProducts.rows;
          // Filter to products that are only invalid
          const productsInvalidInBasket = productsInBasket.filter(
            (product) => product.available === false
          );
          if (
            productsInvalidInBasket.length > 0 ||
            productsInBasket.length <= 0
          ) {
            // Remove invalid products from customer's basket
            await Promise.all(
              productsInvalidInBasket.map(async (product) => {
                await client.query(
                  "DELETE FROM products_in_basket WHERE product_id = $1",
                  [product.product_id]
                );
              })
            );
            transactionStatus = EOrderPlaceStatus.BASKET_INVALID;
          } else {
            // Create the initial order
            const baseOrderCreatedResponse = await client.query(
              "INSERT INTO orders(customer_id, shipping_address_id) VALUES ($1, $2) RETURNING id",
              [customerId, shippingAddressId]
            );
            // Insert each product into the order
            await Promise.all(
              productsInBasket.map(async (product) => {
                await client.query(
                  "INSERT INTO product_orders(order_id, product_id, quantity, item_price_at_purchase) VALUES ($1, $2, $3, $4)",
                  [
                    baseOrderCreatedResponse.rows[0].id,
                    product.product_id,
                    product.quantity,
                    product.pricePerItem,
                  ]
                );
              })
            );
            // Update stock count for all products that are involved in the order
            await Promise.all(
              productsInBasket.map(async (product) => {
                await client.query(
                  "UPDATE product_stock_levels SET amount = amount - $1 WHERE product_id = $2",
                  [product.quantity, product.product_id]
                );
              })
            );
            // Clear customer's basket
            await client.query(
              "DELETE FROM products_in_basket WHERE customer_id = $1",
              [customerId]
            );
          }
        } else {
          transactionStatus = EOrderPlaceStatus.SHIPPING_ADDRESS_INVALID;
        }
        // Commit transaction
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
      } finally {
        client.release();
        resolve(transactionStatus);
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

type TOrderStatus = {
  id: number;
  status: string;
};

/**
 * Get all the possible statuses an order can be
 * @returns A list of all possible statuses an order can be
 */
export const getPossibleOrderStatuses = (): Promise<TOrderStatus[]> => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT id, status FROM order_statuses", (err, res) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(res.rows);
      }
    });
  });
};

/**
 * Update an order's status
 * @param orderId The id of the order
 * @param orderStatusId The id of the new status
 * @returns EDatabaseResponses.OK if the order is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if no order exists to update,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the status id is invalid
 */
export const updateOrderStatus = (
  orderId: number,
  orderStatusId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE FROM orders SET status_id = $1 WHERE id = $2",
      [orderId, orderStatusId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(err);
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
