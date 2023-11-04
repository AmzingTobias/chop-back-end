import { Router } from "express";
import {
  createNewBrand as createBrand,
  deleteBrand,
  getAllBrands,
  updateBrand,
} from "../../models/brands.models";
import {
  ETextResponse,
  EResponseStatusCodes,
} from "../../common/response-types";
import { EDatabaseResponses } from "../../data/data";
import { EAccountTypes, verifyToken } from "../../security/security";

export const brandRouter = Router();

/**
 * @swagger
 * /brands:
 *   get:
 *     tags: [Brands]
 *     summary: Retrieve a lsit of brands
 *     description: Retrieve a list of brands.
 *     responses:
 *       200:
 *         description: A list of brands.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the brand.
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: The name of the brand.
 *                 example: AMD
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
 * /brands:
 *   post:
 *     tags: [Brands]
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
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
brandRouter.post("/", verifyToken, async (req, res) => {
  if (
    !req.user ||
    req.user.accountTypeId !== EAccountTypes.sales ||
    req.user.accountType !== EAccountTypes.admin
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

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
 * /brands/{id}:
 *   put:
 *     tags: [Brands]
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
 *         description: The new unique brand name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Brand updated
 *       409:
 *          description: New brand name already exists
 *       400:
 *          description: Brand Id was invalid, or fields missing from request body
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
brandRouter.put("/:id", verifyToken, async (req, res) => {
  if (
    !req.user ||
    req.user.accountTypeId !== EAccountTypes.sales ||
    req.user.accountType !== EAccountTypes.admin
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

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

/**
 * @swagger
 * /brands/{id}:
 *   delete:
 *     tags: [Brands]
 *     summary: Delete a brand
 *     description: Delete a brand using its id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the brand to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: Brand deleted
 *       400:
 *          description: Brand Id was invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
brandRouter.delete("/:id", verifyToken, async (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { id } = req.params;
  if (!Number.isNaN(Number(id))) {
    try {
      const deleted = await deleteBrand(Number(id));
      switch (deleted) {
        case EDatabaseResponses.OK:
          res.send(ETextResponse.BRAND_DELETED);
          break;
        case EDatabaseResponses.DOES_NOT_EXIST:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.BRAND_ID_NOT_EXIST);
          break;
        default:
          res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
          break;
      }
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
});
