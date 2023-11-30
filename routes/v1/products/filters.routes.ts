import { Router } from "express";
import { getAllProductFilterCategories } from "../../../models/products/product-filters.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";

export const productFilterRouter = Router();

/**
 * @swagger
 * /products/filters:
 *   get:
 *     tags: [Product filters]
 *     summary: Retrieve a lsit of all the filter categories
 *     description: Retrieve a list of all the filter categories
 *     responses:
 *       200:
 *         description: A list of filter categories
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the category
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: The name of the category
 *                 example: Colour
 *       500:
 *          description: Internal server error
 */
productFilterRouter.get("/", (_, res) => {
  getAllProductFilterCategories()
    .then((categories) => {
      res.json(categories);
    })
    .catch((_) => {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});
