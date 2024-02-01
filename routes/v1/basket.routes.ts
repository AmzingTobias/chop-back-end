import { Router } from "express";
import basketWebSockets from "../../data/websockets";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  addProductToBasket,
  getAllProductsInBasket,
  removeProductFromBasket,
  updateQuantityOfProductInBasket,
} from "../../models/basket.models";
import WebSocket from "ws";
import { EDatabaseResponses } from "../../data/data";

const basketRouter = Router();

// Create an express-ws instance for the router
require("express-ws")(basketRouter);

/**
 * Send a basket notification to all connected customer clients
 * @param customerId The id of the customer for the connection
 * @returns True if the message is sent, false otherwise
 */
export const sendBasketContentsToAllCustomerClients = (
  customerId: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    getAllProductsInBasket(customerId)
      .then((basketContents) => {
        const allCustomerSockets = basketWebSockets.get(customerId);
        if (allCustomerSockets !== undefined) {
          console.log(
            `Sending basket update to ${allCustomerSockets.size} connections for customer: ${customerId}`
          );
          allCustomerSockets.forEach((ws) => {
            ws.send(
              JSON.stringify({ type: "basketUpdate", basket: basketContents })
            );
          });
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * @swagger
 * /basket/:
 *   ws:
 *     tags: [Basket]
 *     summary: Open a websocket connection for basket updates
 */
basketRouter.ws("/updates", (ws, req) => {
  const sessionId: string | undefined = req.sessionId;
  if (
    req.user &&
    req.user.accountType === EAccountTypes.customer &&
    typeof sessionId === "string"
  ) {
    const customerId: number = req.user.accountTypeId;
    // Check if a customer already has a Map for their session ids
    console.log(`New (Customer: ${customerId}) connection`);
    if (!basketWebSockets.has(customerId)) {
      // If not, create one
      basketWebSockets.set(customerId, new Map<string, WebSocket>());
    }
    // Then add to the customer's map their current session id
    basketWebSockets.get(customerId)!.set(sessionId, ws);
    console.log(
      `(Customer: ${customerId}) has ${
        basketWebSockets.get(customerId)?.size
      } connection(s)`
    );
    ws.on("close", () => {
      basketWebSockets.get(customerId)!.delete(sessionId);
      console.log(
        `(Customer: ${customerId}) connection closing, ${
          basketWebSockets.get(customerId)?.size
        } connections left`
      );
      if (basketWebSockets.get(customerId)!.size <= 0) {
        console.log(`No (Customer: ${customerId}) connections left`);
        basketWebSockets.delete(customerId);
      }
    });
  }
});

/**
 * @swagger
 * /basket/:
 *   get:
 *     tags: [Basket]
 *     summary: Get all products in a customer's basket
 *     responses:
 *       200:
 *         description: Customer's basket contents
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              productId:
 *                type: integer
 *                description: The id of the product.
 *              quantity:
 *                type: number
 *                description: The quantity of the product in the basket.
 *       401:
 *          description: Account details invalid or account is not a customer account
 *       500:
 *          description: Internal server error
 */
basketRouter.get("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const customerId = req.user.accountTypeId;
  getAllProductsInBasket(customerId)
    .then((basketContents) => {
      return res.json(basketContents);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /basket/:
 *   post:
 *     tags: [Basket]
 *     summary: Add a new product to a customer's basket
 *     parameters:
 *       - in: body
 *         name: productId
 *         required: true
 *         description: The id of the product to add
 *         schema:
 *           type: integer
 *       - in: body
 *         name: quantity
 *         required: true
 *         description: The amount of the product to add
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product added to customer's basket
 *       400:
 *          description: Request fields missing or product does not exist
 *       401:
 *          description: Account details invalid or account is not a customer account
 *       409:
 *          description: Product already in basket
 *       500:
 *          description: Internal server error
 */
basketRouter.post("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const customerId = req.user.accountTypeId;
  const { productId, quantity } = req.body;
  if (
    typeof productId !== "number" ||
    typeof quantity !== "number" ||
    quantity <= 0
  ) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  addProductToBasket(customerId, productId, quantity)
    .then((response) => {
      switch (response) {
        case EDatabaseResponses.OK:
          sendBasketContentsToAllCustomerClients(customerId);
          return res.sendStatus(200);
        case EDatabaseResponses.CONFLICT:
          return res
            .status(EResponseStatusCodes.CONFLICT_CODE)
            .send(ETextResponse.PRODUCT_ALREADY_IN_BASKET);
        case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /basket/:
 *   put:
 *     tags: [Basket]
 *     summary: Update the quantity of the product in a basket
 *     parameters:
 *       - in: body
 *         name: productId
 *         required: true
 *         description: The id of the product to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: quantity
 *         required: true
 *         description: The amount of the product to update
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product quantity updated in customer's basket
 *       400:
 *          description: Request fields missing or product does not exist in basket
 *       401:
 *          description: Account details invalid or account is not a customer account
 *       500:
 *          description: Internal server error
 */
basketRouter.put("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const customerId = req.user.accountTypeId;
  const { productId, quantity } = req.body;
  if (
    typeof productId !== "number" ||
    typeof quantity !== "number" ||
    quantity <= 0
  ) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  updateQuantityOfProductInBasket(customerId, productId, quantity)
    .then((response) => {
      switch (response) {
        case EDatabaseResponses.OK:
          sendBasketContentsToAllCustomerClients(customerId);
          return res.sendStatus(200);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_NOT_IN_BASKET);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /basket/:
 *   delete:
 *     tags: [Basket]
 *     summary: Remove a product from a customer's basket
 *     parameters:
 *       - in: body
 *         name: productId
 *         required: true
 *         description: The id of the product to update
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product removed from basket
 *       400:
 *          description: Request fields missing or product does not exist in basket
 *       401:
 *          description: Account details invalid or account is not a customer account
 *       500:
 *          description: Internal server error
 */
basketRouter.delete("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const customerId = req.user.accountTypeId;
  const { productId } = req.body;
  if (typeof productId !== "number") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  removeProductFromBasket(customerId, productId)
    .then((response) => {
      switch (response) {
        case EDatabaseResponses.OK:
          sendBasketContentsToAllCustomerClients(customerId);
          return res.sendStatus(200);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_NOT_IN_BASKET);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

export default basketRouter;
