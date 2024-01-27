import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import { validateDiscountCode } from "../../models/discount.models";

export const discountRouter = Router();

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

export default discountRouter;
