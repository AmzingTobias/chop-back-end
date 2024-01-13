import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import { getLastPurchaseDateForProduct } from "../../models/orders.models";

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
