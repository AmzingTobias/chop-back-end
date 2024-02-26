import { FOREIGN_KEY_VIOLATION } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";
import { TDiscountCodeValidation } from "./discount.models";

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
  // The id of the order
  id: number;
  // The current status for the order
  status: string;
  // The number of products featured in the order
  product_count: number;
  // The total cost of the order
  total: number;
  // The amount that was paid for the order (includes discounts)
  pricePaid: number;
  // The date the order was placed
  placed_on: Date;
  // The id of the address this order was sent to
  shippingAddressId: number;
};

/**
 * Get a list of orders that a customer has placed
 * @param customerId The id of the customer
 * @returns A list of orders placed by the customer
 */
export const getOrdersForCustomer = (
  customerId?: number
): Promise<TOrderEntry[]> => {
  return new Promise((resolve, reject) => {
    const parameters = customerId === undefined ? [] : [customerId];
    pool.query(
      `
    SELECT 
      orders.id, 
      order_statuses.status, 
      orders.shipping_address_id AS "shippingAddressId",
      COUNT(product_id)::numeric::integer AS "product_count", 
      sum(PRODUCT_ORDERS.item_price_at_purchase * product_orders.quantity)::money::numeric::float8 AS "total",
      orders.price_paid::money::numeric::float8 AS "pricePaid",
      orders.placed_on 
    FROM orders
    LEFT JOIN order_statuses ON orders.status_id = order_statuses.id
    LEFT JOIN product_orders ON orders.id = product_orders.order_id
    JOIN shipping_addresses ON orders.shipping_address_id = shipping_addresses.id
    ${customerId ? "WHERE orders.customer_id = $1" : ""}
    GROUP BY order_statuses.status, orders.id, orders.placed_on
    ORDER BY orders.placed_on DESC
    `,
      parameters,
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
  productName: string;
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
  customerId?: number
): Promise<TProductInOrder[]> => {
  return new Promise((resolve, reject) => {
    const parameters =
      customerId === undefined ? [orderId] : [orderId, customerId];
    pool.query(
      `
    SELECT
      product_id AS "productId",
      product_view.name AS "productName",
      quantity,
      item_price_at_purchase::money::numeric::float8 AS "price"
    FROM orders_with_products_view
    LEFT JOIN product_view ON product_view.id = orders_with_products_view.product_id
    WHERE order_id = $1 ${
      customerId === undefined ? "" : "AND customer_id = $2"
    }
    `,
      parameters,
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
  // An unexpected error occured
  UNKNOWN_ERROR,
}

/**
 * Place a customer's order, using the contents of their basket
 * @param customerId The id of the customer
 * @param shippingAddressId The id for the shipping address
 * @param discountCodes A list of discount codes to apply, should have been validated for use already
 * @returns EOrderPlaceStatus
 */
export const placeOrder = (
  customerId: number,
  shippingAddressId: number,
  discountCodes: TDiscountCodeValidation[]
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
            // Calculate the discounted order total
            const totalOrderPrice = productsInBasket.reduce(
              (prevPrice, currentItem) =>
                prevPrice + currentItem.pricePerItem * currentItem.quantity,
              0
            );

            const discountedOrderTotal = discountCodes.reduce(
              (prev, current) =>
                prev - (current.percent / 100) * totalOrderPrice,
              totalOrderPrice
            );

            // Create the initial order
            const baseOrderCreatedResponse = await client.query(
              "INSERT INTO orders(customer_id, shipping_address_id, price_paid) VALUES ($1, $2, $3) RETURNING id",
              [customerId, shippingAddressId, discountedOrderTotal]
            );

            // Update the discount code amount, since they've been used
            await Promise.all(
              discountCodes.map(async (code) => {
                await client.query(
                  "UPDATE discount_codes SET number_of_uses = number_of_uses -1 WHERE number_of_uses > 0 AND code = $1",
                  [code.code]
                );
              })
            );

            // Insert the discount code linkage to the order
            await Promise.all(
              discountCodes.map(async (code) => {
                await client.query(
                  "INSERT INTO discount_codes_for_order(order_id, discount_code_id) VALUES ($1, $2)",
                  [baseOrderCreatedResponse.rows[0].id, code.id]
                );
              })
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
        transactionStatus = EOrderPlaceStatus.UNKNOWN_ERROR;
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
      "UPDATE orders SET status_id = $1 WHERE id = $2",
      [orderStatusId, orderId],
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

/**
 * Get specific details regarding a single order
 * @param customerId The id of the customer who placed the order
 * @param orderId The id of the order to check
 * @returns An order entry, or null if the order does not exist
 */
export const getOrderDetails = (
  orderId: number,
  customerId?: number
): Promise<TOrderEntry | null> => {
  return new Promise((resolve, reject) => {
    const parameters =
      customerId === undefined ? [orderId] : [orderId, customerId];
    pool.query(
      `
      SELECT 
        orders.id, 
        order_statuses.status, 
        orders.shipping_address_id AS "shippingAddressId",
        COUNT(product_id)::numeric::integer AS "product_count", 
        sum(PRODUCT_ORDERS.item_price_at_purchase * product_orders.quantity)::money::numeric::float8 AS "total",
        orders.price_paid::money::numeric::float8 AS "pricePaid",
        orders.placed_on 
      FROM orders
      LEFT JOIN order_statuses ON orders.status_id = order_statuses.id
      LEFT JOIN product_orders ON orders.id = product_orders.order_id
      JOIN shipping_addresses ON orders.shipping_address_id = shipping_addresses.id
      WHERE orders.id = $1 ${
        customerId === undefined ? "" : " AND orders.customer_id = $2"
      }
      GROUP BY order_statuses.status, orders.id, orders.placed_on
      ORDER BY orders.placed_on DESC
    `,
      parameters,
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rowCount > 0 ? res.rows[0] : null);
        }
      }
    );
  });
};

/**
 * Get the discount codes used for an order
 * @param orderId The id of the order to get the codes for
 * @param customerId The id of the customer the order belongs to
 * @returns A list of codes that were used for the order
 */
export const getDiscountsUsedForOrder = (
  orderId: number,
  customerId?: number
): Promise<{ code: string }[]> => {
  return new Promise((resolve, reject) => {
    const parameters =
      customerId === undefined ? [orderId] : [orderId, customerId];
    pool.query(
      `
    SELECT
      code
    FROM discount_codes_for_order
    LEFT JOIN discount_codes ON discount_codes_for_order.discount_code_id = discount_codes.id
    LEFT JOIN orders ON discount_codes_for_order.order_id = orders.id
    WHERE order_id = $1 ${
      customerId === undefined ? "" : " AND customer_id = $2"
    }
    `,
      parameters,
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
