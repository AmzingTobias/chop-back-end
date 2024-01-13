import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../../security/security";
import {
  addProductToViewHistory,
  getCustomerViewHistory,
  hasProductBeenViewedToday,
  removeProductFromViewHistory,
} from "../../../models/products/product-view-history.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import { EDatabaseResponses } from "../../../data/data";

const productViewHistoryRouter = Router();

export default productViewHistoryRouter;

const MAX_VIEW_HISTORY_LIMIT = 20;

/**
 * @swagger
 * /products/history/:
 *   get:
 *     tags: [Product view history]
 *     summary: Get a customer's view history
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: The maximum number of entries to have in the view history. Max is 20
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: The customer's view history
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: The id of the product
 *               customerId:
 *                 type: number
 *                 description: The most recent date the product was viewed
 *       401:
 *          description: Account lacks permissions
 *       500:
 *          description: Internal server error
 */
productViewHistoryRouter.get("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }

  const { limit } = req.query;
  let limitToUse = MAX_VIEW_HISTORY_LIMIT;
  if (typeof limit === "string") {
    const limitAsNumber = Number(limit);
    if (!Number.isNaN(limitAsNumber)) {
      limitToUse =
        limitAsNumber <= MAX_VIEW_HISTORY_LIMIT
          ? limitAsNumber
          : MAX_VIEW_HISTORY_LIMIT;
    }
  }
  getCustomerViewHistory(req.user.accountTypeId, limitToUse)
    .then((viewHistory) => {
      res.json(viewHistory);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/history/{id}:
 *   post:
 *     tags: [Product view history]
 *     summary: Add a product to a customer's product view history
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         description: The id of the product to add
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Product added to view history
 *       400:
 *          description: Product does not exist
 *       401:
 *          description: Account lacks permissions
 *       409:
 *          description: Product already in view history for today
 *       500:
 *          description: Internal server error
 */
productViewHistoryRouter.post("/:id", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const productId = Number(req.params.id);
  if (Number.isNaN(productId)) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
  }
  const customerId = req.user.accountTypeId;
  hasProductBeenViewedToday(customerId, productId)
    .then((viewed) => {
      if (viewed) {
        res.sendStatus(200);
      } else {
        addProductToViewHistory(customerId, productId)
          .then((databaseResponse) => {
            switch (databaseResponse) {
              case EDatabaseResponses.OK:
                return res.sendStatus(200);
              case EDatabaseResponses.CONFLICT:
                return res.sendStatus(EResponseStatusCodes.CONFLICT_CODE);
              case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
                return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
              default:
                return res.sendStatus(
                  EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
                );
            }
          })
          .catch((_) => {
            return res.sendStatus(
              EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
            );
          });
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/history/{id}:
 *   delete:
 *     tags: [Product view history]
 *     summary: Remove a product from a customer's product view history
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         description: The id of the product to remove
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Product removed from view history
 *       400:
 *          description: Product wasn't in history to remove
 *       401:
 *          description: Account lacks permissions
 *       500:
 *          description: Internal server error
 */
productViewHistoryRouter.delete("/:id", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const productId = Number(req.params.id);
  if (Number.isNaN(productId)) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
  }
  const customerId = req.user.accountTypeId;
  removeProductFromViewHistory(customerId, productId)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.sendStatus(200);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_NOT_IN_HISTORY);
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
