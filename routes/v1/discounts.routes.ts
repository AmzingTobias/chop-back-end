import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  createNewDiscountCode,
  getAllDiscountCodes,
  toggleDiscountCodeActive,
  toggleDiscountCodeStackable,
  updateDiscountCodePercent,
  updateDiscountCodeRemainingUses,
  validateDiscountCode,
} from "../../models/discount.models";
import { EDatabaseResponses } from "../../data/data";

export const discountRouter = Router();

/**
 * @swagger
 * /discounts/:
 *   get:
 *     tags: [Discounts]
 *     summary: Get a list of discount codes
 *     responses:
 *       200:
 *         description: List of discount codes
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the code.
 *               name:
 *                 type: string
 *                 code: The code.
 *               createdOn:
 *                 type: Date
 *                 description: The date the code was created
 *               remainingUses:
 *                 type: number
 *                 description: The number of uses left on the code
 *               active:
 *                 type: boolean
 *                 description: If the code is currently active
 *               percent:
 *                 type: number
 *                 description: The percentage value of the code
 *               stackable:
 *                 type: boolean
 *                 description: If the code is stackable with other codes
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
discountRouter.get("/", verifyToken, (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  getAllDiscountCodes()
    .then((codes) => res.json(codes))
    .catch((err) => {
      console.error(err);
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /discounts/code:
 *   get:
 *     tags: [Discounts]
 *     summary: Validate a discount code
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         description: The code to validate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The discount code validation response
 *         schema:
 *           type: object
 *           properties:
 *             valid:
 *               type: boolean
 *               description: The discount code is valid.
 *               example: 1
 *             percent:
 *               type: number
 *               description: The percentage the code will take off from the order
 *             stackable:
 *               type: boolean
 *               description: If the code can be used in conjunction with other offers
 *       400:
 *          description: Request missing code or code invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
discountRouter.get("/code", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }

  // Discount code to validate
  const { query: discountCode } = req.query;
  if (typeof discountCode !== "string") {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  }

  validateDiscountCode(discountCode)
    .then((validation) => {
      if (validation !== null) {
        res.json(validation);
      } else {
        res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(ETextResponse.DISCOUNT_CODE_NOT_EXIST);
      }
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /discounts/code:
 *   get:
 *     tags: [Discounts]
 *     summary: Validate a discount code
 *     parameters:
 *       - in: body
 *         name: code
 *         required: true
 *         description: The code
 *         schema:
 *           type: string
 *       - in: body
 *         name: percent
 *         required: true
 *         description: The new percentage value for the code
 *         schema:
 *           type: integer
 *       - in: body
 *         name: active
 *         required: true
 *         description: If the code is active
 *         schema:
 *           type: boolean
 *       - in: body
 *         name: stackable
 *         required: true
 *         description: If the code can be used in conjunction with other codes
 *         schema:
 *           type: boolean
 *       - in: body
 *         name: uses
 *         required: true
 *         description: The new number of uses for the code
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Discount code created
 *       400:
 *          description: Request missing code or code invalid
 *       401:
 *          description: Account lacks required permissions
 *       409:
 *          description: The same code already exists
 *       500:
 *          description: Internal server error
 */
discountRouter.post("/code", verifyToken, (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }

  const { code, percent, uses, active, stackable } = req.body;

  if (
    typeof code !== "string" ||
    typeof percent !== "number" ||
    typeof uses !== "number" ||
    typeof active !== "boolean" ||
    typeof stackable !== "boolean" ||
    percent > 100 ||
    percent < 0 ||
    uses < -1
  ) {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  }

  createNewDiscountCode(code, percent, uses, active, stackable)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.sendStatus(EResponseStatusCodes.CREATED_CODE);
        case EDatabaseResponses.CONFLICT:
          return res.sendStatus(EResponseStatusCodes.CONFLICT_CODE);
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
 * /discounts/code/{id}:
 *   get:
 *     tags: [Discounts]
 *     summary: Update a discount code
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the code to edit
 *         schema:
 *           type: integer
 *       - in: body
 *         name: percent
 *         required: false
 *         description: The new percentage value for the code
 *         schema:
 *           type: integer
 *       - in: body
 *         name: active
 *         required: false
 *         description: The new active value for the code
 *         schema:
 *           type: boolean
 *       - in: body
 *         name: stackable
 *         required: false
 *         description: The new stackable value for the code
 *         schema:
 *           type: boolean
 *       - in: body
 *         name: remaining
 *         required: false
 *         description: The new remaining uses value for the code
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: The code was updated
 *       400:
 *          description: Code id invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
discountRouter.put("/code/:id", verifyToken, async (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }

  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  }

  const discountCodeId = Number(id);
  const { percent, stackable, active, remainingUses } = req.body;
  try {
    if (typeof percent === "number") {
      if (percent >= 0 && percent <= 100) {
        await updateDiscountCodePercent(discountCodeId, percent);
      }
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
  }

  try {
    if (typeof stackable === "boolean") {
      await toggleDiscountCodeStackable(discountCodeId, stackable);
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
  }

  try {
    if (typeof active === "boolean") {
      await toggleDiscountCodeActive(discountCodeId, active);
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
  }

  try {
    if (typeof remainingUses === "number") {
      if (remainingUses >= -1) {
        await updateDiscountCodeRemainingUses(discountCodeId, remainingUses);
      }
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
  }

  return res.sendStatus(200);
});

export default discountRouter;
