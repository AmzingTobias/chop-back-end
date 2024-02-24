import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import { getPurchaseAmountPerDate } from "../../models/analytics.models";

const analyticsRouter = Router();

/**
 * @swagger
 * /analytics/purchases:
 *   get:
 *     tags: [Analytics]
 *     summary: Get a list of purchase analytics, grouped by date
 *     responses:
 *       200:
 *         description: A list of purchase analytics per date
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               totalProductsSold:
 *                 type: integer
 *                 description: The total number of products that were sold
 *               totalAmount:
 *                 type: integer
 *                 description: The total monetary value that was made on that day from purchases
 *               placed_on:
 *                 type: Date
 *                 description: The date containing order info
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
analyticsRouter.get("/purchases", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  getPurchaseAmountPerDate()
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

export default analyticsRouter;
