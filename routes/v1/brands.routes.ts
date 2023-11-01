import { Router } from "express";
import {
  createNewBrand as createBrand,
  getAllBrands,
} from "../../models/brands.models";
import { ERequestCodes } from "../../common/request-codes";
import { ERequestTextResponses } from "../../common/request-text-response";
import { EDatabaseResponses } from "../../data/data";

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

/**
 * @swagger
 * /v1/brands/:
 *   post:
 *     summary: Create a new brand
 *     description: Create a new unique brand with a supplied brand name
 *     parameters:
 *       - in: body
 *         name: name
 *         required: true
 *         description: The unique brand name
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Brand was created
 *       409:
 *          description: Brand name already in use
 *       400:
 *          description: Brand name missing
 *       500:
 *          description: Internal server error
 */
brandRouter.post("/", async (req, res) => {
  const { name } = req.body;
  if (typeof name === "string") {
    const brandName = name.trim();
    try {
      const created = await createBrand(brandName);
      switch (created) {
        case EDatabaseResponses.OK:
          res
            .status(ERequestCodes.CREATED_CODE)
            .send(ERequestTextResponses.BRAND_CREATED);
          break;
        case EDatabaseResponses.CONFLICT:
          res
            .status(ERequestCodes.CONFLICT_CODE)
            .send(ERequestTextResponses.BRAND_ALREADY_EXISTS);
          break;
        default:
          res.status(ERequestCodes.INTERNAL_SERVER_ERROR_CODE);
      }
    } catch (e) {
      console.error(e);
      res
        .status(ERequestCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ERequestTextResponses.INTERNAL_ERROR);
    }
  } else {
    res
      .status(ERequestCodes.BAD_REQUEST_CODE)
      .send(ERequestTextResponses.MISSING_FIELD_IN_REQ_BODY);
  }
});
