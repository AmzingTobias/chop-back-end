import { Router } from "express";
import { getAllBrands } from "../../models/brands.models";
import { ERequestCodes } from "../../common/request-codes";
import { ERequestTextResponses } from "../../common/request-text-response";

export const brandRouter = Router();

/**
 * @swagger
 * /v1/brands/:
 *   get:
 *     summary: Retrieve a lsit of brands
 *     description: Retrieve a list of brands.
 *     responses:
 *       200:
 *         description: A list of brands.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: The id of the brand.
 *                     example: 1
 *                   name:
 *                     type: string
 *                     description: The name of the brand.
 *                     example: AMD
 *       500:
 *          description: Internal server error
 */
brandRouter.get("/", async (_, res) => {
  try {
    const brands = await getAllBrands();
    res.json(brands);
  } catch (e) {
    console.error(e);
    res
      .status(ERequestCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ERequestTextResponses.INTERNAL_ERROR);
  }
});
