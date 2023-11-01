import { Router } from "express";
import {
  createProductType,
  deleteProductType,
  getAllProductTypes,
  updateProductType,
} from "../../models/product-types.models";
import { EDatabaseResponses } from "../../data/data";
import {
  ETextResponse,
  EResponseStatusCodes,
} from "../../common/response-types";

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
 *                   id:
 *                     type: integer
 *                     description: The id of the product type.
 *                     example: 1
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
    res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});

/**
 * @swagger
 * /v1/product-types:
 *   post:
 *     summary: Create a new product type
 *     description: Create a new unique product type with a supplied product type name
 *     parameters:
 *       - in: body
 *         name: product-type-name
 *         required: true
 *         description: The unique product type name
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Product type was created
 *       409:
 *          description: Product type name already in use
 *       400:
 *          description: Product type name missing
 *       500:
 *          description: Internal server error
 */
productTypeRouter.post("/", async (req, res) => {
  const suppliedProductTypeName: string | undefined =
    req.body["product-type-name"];
  if (typeof suppliedProductTypeName === "string") {
    const cleanedProductTypeName = suppliedProductTypeName.trim();
    try {
      const created = await createProductType(cleanedProductTypeName);
      if (created) {
        res
          .status(EResponseStatusCodes.CREATED_CODE)
          .send(ETextResponse.PRODUCT_TYPE_CREATED);
      } else {
        res
          .status(EResponseStatusCodes.CONFLICT_CODE)
          .send(ETextResponse.PRODUCT_TYPE_ALREADY_EXISTS);
      }
    } catch (e) {
      console.error(e);
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
 * /v1/product-types/{id}:
 *   put:
 *     summary: Update a product type
 *     description: Update an existing product type name using the product type id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product type to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: product-type-name
 *         required: true
 *         description: The new uniue product type name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Product type updated
 *       409:
 *          description: New product type name already exists
 *       400:
 *          description: Product type Id was invalid, or fields missing from request body
 *       500:
 *          description: Internal server error
 */
productTypeRouter.put("/:id", async (req, res) => {
  const newSuppliedProductTypeName = req.body["product-type-name"];
  const { id } = req.params;
  if (
    typeof newSuppliedProductTypeName === "string" &&
    !Number.isNaN(Number(id))
  ) {
    const trimmedProductTypeName = newSuppliedProductTypeName.trim();
    const productTypeId = Number(id);
    try {
      const updated = await updateProductType(
        productTypeId,
        trimmedProductTypeName
      );
      switch (updated) {
        case EDatabaseResponses.OK:
          res.send(ETextResponse.PRODUCT_TYPE_UPDATED);
          break;
        case EDatabaseResponses.CONFLICT:
          res
            .status(EResponseStatusCodes.CONFLICT_CODE)
            .send(ETextResponse.PRODUCT_TYPE_ALREADY_EXISTS);
          break;
        case EDatabaseResponses.DOES_NOT_EXIST:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST);
          break;
        default:
          res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
          break;
      }
    } catch (e) {
      console.error(e);
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else if (newSuppliedProductTypeName === undefined) {
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
 * /v1/product-types/{id}:
 *   delete:
 *     summary: Delete a product type
 *     description: Delete a product type using its id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product type to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: Product type deleted
 *       400:
 *          description: Product type Id was invalid
 *       500:
 *          description: Internal server error
 */
productTypeRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!Number.isNaN(Number(id))) {
    try {
      const deleted = await deleteProductType(Number(id));
      switch (deleted) {
        case EDatabaseResponses.OK:
          res.send(ETextResponse.PRODUCT_TYPE_DELETED);
          break;
        case EDatabaseResponses.DOES_NOT_EXIST:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST);
          break;
        default:
          res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
          break;
      }
    } catch (e) {
      console.error(e);
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
