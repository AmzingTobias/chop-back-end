import { Router } from "express";
import {
  createNewBrand as createBrand,
  getAllBrands,
  updateBrand,
} from "../../models/brands.models";
import {
  ETextResponse,
  EResponseStatusCodes,
} from "../../common/response-types";
import { EDatabaseResponses } from "../../data/data";

export const brandRouter = Router();

/**
 * @swagger
 * /v1/brands:
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
  } catch (_) {
    res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});

/**
 * @swagger
 * /v1/brands:
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
            .status(EResponseStatusCodes.CREATED_CODE)
            .send(ETextResponse.BRAND_CREATED);
          break;
        case EDatabaseResponses.CONFLICT:
          res
            .status(EResponseStatusCodes.CONFLICT_CODE)
            .send(ETextResponse.BRAND_ALREADY_EXISTS);
          break;
        default:
          res.status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      }
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
});

/**
 * @swagger
 * /v1/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     description: Update an existing brand name using the brand id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the brand to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: name
 *         required: true
 *         description: The new uniue brand name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Brand updated
 *       409:
 *          description: New brand name already exists
 *       400:
 *          description: Brand Id was invalid, or fields missing from request body
 *       500:
 *          description: Internal server error
 */
brandRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!Number.isNaN(Number(id)) && typeof name === "string") {
    const newBrandName = name.trim();
    try {
      const brandUpdated = await updateBrand(Number(id), newBrandName);
      switch (brandUpdated) {
        case EDatabaseResponses.OK:
          res.send(ETextResponse.BRAND_UPDATED);
          break;
        case EDatabaseResponses.CONFLICT:
          res
            .status(EResponseStatusCodes.CONFLICT_CODE)
            .send(ETextResponse.BRAND_ALREADY_EXISTS);
          break;
        case EDatabaseResponses.DOES_NOT_EXIST:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.BRAND_ID_NOT_EXIST);
          break;
        default:
          res.status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
          break;
      }
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else if (name === undefined) {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
});
