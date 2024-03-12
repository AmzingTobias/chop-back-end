import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  EOrderPlaceStatus,
  getDiscountsUsedForOrder,
  getLastPurchaseDateForProduct,
  getOrderDetails,
  getOrdersForCustomer,
  getPossibleOrderStatuses,
  getProductsInOrder,
  placeOrder,
  updateOrderStatus,
} from "../../models/orders.models";
import { sendBasketContentsToAllCustomerClients } from "./basket.routes";
import { isArrayOfStrings } from "../../common/validation";
import {
  TDiscountCodeValidation,
  validateDiscountCode,
} from "../../models/discount.models";
import { EDatabaseResponses } from "../../data/data";
import { sendOrderEmail } from "../../controllers/order.controller";
import { EOrderEmailTypes } from "../../email/EmailClient";

export const orderRouter = Router();

/**
 * @swagger
 * /orders/last-purchase/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get the last time a customer ordered a product
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the product
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: The date the product was last purchased or null
 *         schema:
 *          type: object
 *          properties:
 *            id:
 *              type: date
 *              description: The date the product was last purchased, or null
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.get("/last-purchase/:id", verifyToken, async (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { id } = req.params;
  if (!Number.isNaN(Number(id))) {
    try {
      const dateLastPurchased = await getLastPurchaseDateForProduct(
        req.user.accountTypeId,
        Number(id)
      );
      return res.json({ date: dateLastPurchased });
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
  }
});

/**
 * @swagger
 * /orders/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Place an order, using the products found in the customer's basket
 *     parameters:
 *       - in: body
 *         name: shippingId
 *         required: true
 *         description: The id of the shipping address to use for the order
 *         schema:
 *           type: number
 *       - in: body
 *         name: discountCodes
 *         required: true
 *         description: A list of discount codes to apply to the order
 *         schema:
 *           type: Array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: Order confirmed
 *       400:
 *          description: Fields missing in request, or basket contained products no longer available
 *       401:
 *          description: Account lacks required permissions, or shipping address used is not customer's
 *       500:
 *          description: Internal server error
 */
orderRouter.post("/checkout", verifyToken, async (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { shippingId, discountCodes: discountCodesInput } = req.body;

  // Validate the type that was supplied for discount codes
  if (typeof shippingId !== "number" || !isArrayOfStrings(discountCodesInput)) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  const discountCodes: string[] = discountCodesInput;

  // Remove duplicates to prevent users from stacking the same discount multiple times
  const uniqueDiscountCodes: string[] = [...new Set(discountCodes)];

  // Validate discount codes
  const validatedDiscountCodesWithNull = await Promise.all(
    uniqueDiscountCodes.map(async (code) => {
      try {
        return await validateDiscountCode(code);
      } catch {
        return null;
      }
    })
  );

  // Remove null codes
  const validatedDiscountCodes = validatedDiscountCodesWithNull.filter(
    (validation) => validation !== null
  ) as TDiscountCodeValidation[];

  // Check that all codes in the list are allowed to stack
  const discountListValid =
    validatedDiscountCodes.length > 1
      ? validatedDiscountCodes.every((code) => code.stackable === true)
      : true;

  if (
    validatedDiscountCodes.length !== discountCodes.length ||
    !discountListValid
  ) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.DISCOUNT_CODE_NOT_EXIST);
  }

  // Now discount codes have been validated, they can be used with place order
  const customerId = req.user.accountTypeId;
  placeOrder(customerId, shippingId, validatedDiscountCodes)
    .then((status) => {
      sendBasketContentsToAllCustomerClients(customerId);
      switch (status) {
        case EOrderPlaceStatus.OK:
          return res.send(ETextResponse.ORDER_CONFIRMED);
        case EOrderPlaceStatus.BASKET_INVALID:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.BASKET_INVALID_FOR_ORDER);
        case EOrderPlaceStatus.SHIPPING_ADDRESS_INVALID:
          return res
            .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
            .send(ETextResponse.ADDRESS_ID_NOT_EXIST);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((err) => {
      console.error(err);
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /orders/status:
 *   get:
 *     tags: [Orders]
 *     summary: Get all possible order statuses for an order
 *     responses:
 *       200:
 *         description: A list of all statuses an order can be
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              id:
 *                type: number
 *                description: The id of the status
 *              status:
 *                type: string
 *                description: The name of the status
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.get("/status", (req, res) => {
  getPossibleOrderStatuses()
    .then((allStatuses) => {
      res.json(allStatuses);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /orders/:
 *   get:
 *     tags: [Orders]
 *     summary: Get all possible orders that a customer has placed
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: false
 *         description: The id of the customer to get orders for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of all orders a customer has placed
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              id:
 *                type: number
 *                description: The id of the order
 *              status:
 *                type: string
 *                description: The name of the status
 *              product_count:
 *                type: number
 *                description: The number of products in the order
 *              total:
 *                type: number
 *                description: The total price of the order
 *              placed_on:
 *                type: date
 *                description: The time and date the order was placed
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.get("/", verifyToken, (req, res) => {
  const customerIdFromQuery = Number(req.query["customerId"]);
  if (
    !Number.isNaN(customerIdFromQuery) &&
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user?.accountType === EAccountTypes.support)
  ) {
    return getOrdersForCustomer(customerIdFromQuery)
      .then((orders) => {
        res.json(orders);
      })
      .catch((_) => {
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }

  if (
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.warehouse)
  ) {
    return getOrdersForCustomer()
      .then((orders) => {
        res.json(orders);
      })
      .catch((_) => {
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }

  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const customerId = req.user.accountTypeId;

  getOrdersForCustomer(customerId)
    .then((orders) => {
      res.json(orders);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get all possible orders that a customer has placed
 *     parameters:
 *       - in: params
 *         name: orderId
 *         required: true
 *         description: The id of the order to get the information for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: The order that was placed
 *         schema:
 *           type: object
 *           properties:
 *            order:
 *             type: object
 *             properties:
 *              id:
 *                type: integer
 *                description: The id of the order
 *              status:
 *                type: string
 *                description: The name of the status
 *              product_count:
 *                type: number
 *                description: The number of products in the order
 *              total:
 *                type: number
 *                description: The total price of the order
 *              placed_on:
 *                type: date
 *                description: The time and date the order was placed
 *       400:
 *          description: Fields missing in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.get("/:orderId", verifyToken, (req, res) => {
  const { orderId } = req.params;
  if (Number.isNaN(Number(orderId))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  if (
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.warehouse)
  ) {
    return getOrderDetails(Number(orderId))
      .then((order) => {
        res.json({ order: order });
      })
      .catch((_) => {
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const customerId = req.user.accountTypeId;

  getOrderDetails(Number(orderId), customerId)
    .then((order) => {
      res.json({ order: order });
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /orders/{orderId}/products:
 *   get:
 *     tags: [Orders]
 *     summary: Get all products found in an order
 *     parameters:
 *       - in: params
 *         name: orderId
 *         required: true
 *         description: The id of the order to get the products for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of products
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              productId:
 *                type: number
 *                description: The id of the product ordered
 *              quantity:
 *                type: number
 *                description: The amount of that product ordered
 *              price:
 *                type: number
 *                description: The item price for each product
 *       400:
 *          description: Fields missing in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.get("/:orderId/products", verifyToken, (req, res) => {
  const { orderId } = req.params;
  if (Number.isNaN(Number(orderId))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }

  if (
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.warehouse)
  ) {
    return getProductsInOrder(Number(orderId))
      .then((products) => {
        res.json(products);
      })
      .catch((_) => {
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }

  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const customerId = req.user.accountTypeId;

  getProductsInOrder(Number(orderId), customerId)
    .then((products) => {
      res.json(products);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /orders/{orderId}/discounts:
 *   get:
 *     tags: [Orders]
 *     summary: Get all discount codes used for an order
 *     parameters:
 *       - in: params
 *         name: orderId
 *         required: true
 *         description: The id of the order to get the codes for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of codes used for the order
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       400:
 *          description: Fields missing in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.get("/:orderId/discounts", verifyToken, (req, res) => {
  const { orderId } = req.params;
  if (Number.isNaN(Number(orderId))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }

  if (
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.warehouse)
  ) {
    return getDiscountsUsedForOrder(Number(orderId))
      .then((codes) => {
        res.json(codes);
      })
      .catch((_) => {
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }

  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const customerId = req.user.accountTypeId;

  getDiscountsUsedForOrder(Number(orderId), customerId)
    .then((codes) => {
      res.json(codes);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /orders/{orderId}/status}:
 *   post:
 *     tags: [Orders]
 *     summary: Update an order's status
 *     parameters:
 *       - in: params
 *         name: orderId
 *         required: true
 *         description: The id of the order to update
 *         schema:
 *           type: number
 *       - in: body
 *         name: orderStatusId
 *         required: true
 *         description: The order status to set for the order
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *          description: Fields missing in request, or order id does not exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
orderRouter.post("/:orderId/status", verifyToken, (req, res) => {
  const { orderId } = req.params;
  if (Number.isNaN(Number(orderId))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  const { orderStatusId } = req.body;
  if (typeof orderStatusId !== "number") {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  }
  if (
    req.user &&
    (req.user.accountType === EAccountTypes.admin ||
      req.user.accountType === EAccountTypes.support ||
      req.user.accountType === EAccountTypes.warehouse)
  ) {
    return updateOrderStatus(Number(orderId), orderStatusId)
      .then((databaseResponse) => {
        switch (databaseResponse) {
          case EDatabaseResponses.OK:
            sendOrderEmail(Number(orderId), EOrderEmailTypes.STATUS_UPDATED);
            return res.sendStatus(200);
          case EDatabaseResponses.DOES_NOT_EXIST:
            return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
          case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
            return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
          default:
            return res.sendStatus(
              EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
            );
        }
      })
      .catch((_) => {
        return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  } else {
    res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
});
