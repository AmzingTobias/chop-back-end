import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  EOrderPlaceStatus,
  getLastPurchaseDateForProduct,
  getOrderDetails,
  getOrdersForCustomer,
  getPossibleOrderStatuses,
  placeOrder,
} from "../../models/orders.models";
import { sendBasketContentsToAllCustomerClients } from "./basket.routes";

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
orderRouter.post("/checkout", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { shippingId } = req.body;
  if (typeof shippingId !== "number") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  const customerId = req.user.accountTypeId;
  placeOrder(customerId, shippingId)
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
          console.log(`Unhandled status: ${status}`);
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
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const customerId = req.user.accountTypeId;
  const { orderId } = req.params;
  if (Number.isNaN(Number(orderId))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }

  getOrderDetails(customerId, Number(orderId))
    .then((order) => {
      res.json({ order: order });
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});
