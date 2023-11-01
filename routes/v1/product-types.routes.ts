import { Router, Request, Response } from "express";
import { getAllProductTypes } from "../../models/product-types.models";
import { INTERNAL_SERVER_ERROR } from "../../common/constants";

export const productTypeRouter = Router();

/**
 * @swagger
 * /v1/product-types:
 *   get:
 *     summary: Retrieve a lsit of product types
 *     description: Retrieve a list of product types.
 *     responses:
 *       200:
 *         description: A list of product types.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     description: The name of the product type.
 *                     example: Technology
 *       500:
 *          description: Internal server error
 */
productTypeRouter.get("/", async (_, res) => {
  try {
    const result = await getAllProductTypes();
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(INTERNAL_SERVER_ERROR).send("Internal error");
  }
});
