import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  getPurchaseAmountPerDate,
  getPurchasesPerProductType,
  getViewHistoryAnalytics,
} from "../../models/analytics.models";
import { start } from "repl";

function isValidDateFormat(dateToTest: string) {
  // Regular expression for yyyy-mm-dd format
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

  return dateFormatRegex.test(dateToTest);
}

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

/**
 * @swagger
 * /analytics/product-view-history:
 *   get:
 *     tags: [Analytics]
 *     summary: Get a list of product's view history between two dates
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         description: The first date for the range
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         required: false
 *         description: The end date for the range
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of product's view history
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: The id of the product
 *               name:
 *                 type: string
 *                 description: The name of the product
 *               viewCount:
 *                 type: integer
 *                 description: The amount of times the product was viewed
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
analyticsRouter.get("/product-view-history", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { startDate: startDateStr, endDate: endDateStr } = req.query;
  const startDate =
    typeof startDateStr === "string" && isValidDateFormat(startDateStr)
      ? new Date(startDateStr)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate =
    typeof endDateStr === "string" && isValidDateFormat(endDateStr)
      ? new Date(endDateStr)
      : new Date();
  getViewHistoryAnalytics(startDate, endDate)
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /analytics/product-type:
 *   get:
 *     tags: [Analytics]
 *     summary: Get a list of the purchases made in a given date period by product type
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         description: The first date for the range
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         required: false
 *         description: The end date for the range
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of product's type purchase details
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productType:
 *                 type: string
 *                 description: The product type that has been purchased in the date range
 *               total:
 *                 type: integer
 *                 description: The amount of products purchased in the date range
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
analyticsRouter.get("/product-type", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { startDate: startDateStr, endDate: endDateStr } = req.query;
  const startDate =
    typeof startDateStr === "string" && isValidDateFormat(startDateStr)
      ? new Date(startDateStr)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate =
    typeof endDateStr === "string" && isValidDateFormat(endDateStr)
      ? new Date(endDateStr)
      : new Date();
  getPurchasesPerProductType(startDate, endDate)
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

export default analyticsRouter;
