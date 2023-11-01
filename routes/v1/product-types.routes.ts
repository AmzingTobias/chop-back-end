import { Router, Request, Response } from "express";
import {
  createProductType,
  deleteProductType,
  getAllProductTypes,
  updateProductType,
} from "../../models/product-types.models";
import {
  BAD_REQUEST_CODE,
  CONFLICT_CODE,
  CREATED_CODE,
  INTERNAL_SERVER_ERROR_CODE,
} from "../../common/request-codes";
import { EDatabaseResponses } from "../../data/data";

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
    res.status(INTERNAL_SERVER_ERROR_CODE).send("Internal error");
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
        res.status(CREATED_CODE).send("Product type created");
      } else {
        res.status(CONFLICT_CODE).send("Product type already exists");
      }
    } catch (e) {
      console.error(e);
      res.status(INTERNAL_SERVER_ERROR_CODE).send("Internal error");
    }
  } else {
    res.status(BAD_REQUEST_CODE).send("Product type name missing");
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
  const { id } = req.query;
  if (typeof newSuppliedProductTypeName === "string" && !Number.isNaN(id)) {
    const trimmedProductTypeName = newSuppliedProductTypeName.trim();
    const productTypeId = Number(id);
    try {
      const updated = await updateProductType(
        productTypeId,
        trimmedProductTypeName
      );
      switch (updated) {
        case EDatabaseResponses.OK:
          res.send("Product type updated");

        case EDatabaseResponses.CONFLICT:
          res.status(CONFLICT_CODE).send("Product type name already exists");

        case EDatabaseResponses.DOES_NOT_EXIST:
          res.status(BAD_REQUEST_CODE).send("Product type id does not exist");

        default:
          res.sendStatus(INTERNAL_SERVER_ERROR_CODE);
      }
    } catch (e) {
      console.error(e);
      res.status(INTERNAL_SERVER_ERROR_CODE).send("Internal error");
    }
  } else if (newSuppliedProductTypeName === undefined) {
    res.status(BAD_REQUEST_CODE).send("Product type name missing");
  } else {
    res.status(BAD_REQUEST_CODE).send("Invalid product type id");
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
  if (!Number.isNaN(id)) {
    try {
      const deleted = await deleteProductType(Number(id));
      switch (deleted) {
        case EDatabaseResponses.OK:
          res.send("Product type removed");
        case EDatabaseResponses.DOES_NOT_EXIST:
          res.status(BAD_REQUEST_CODE).send("Product type does not exist");
        default:
          res.sendStatus(INTERNAL_SERVER_ERROR_CODE);
      }
    } catch (e) {
      console.error(e);
      res.status(INTERNAL_SERVER_ERROR_CODE).send("Internal error");
    }
  }
});
