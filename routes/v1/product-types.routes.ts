import { Router, Request, Response } from "express";
import {
  createProductType,
  getAllProductTypes,
} from "../../models/product-types.models";
import {
  BAD_REQUEST_CODE,
  CONFLICT_CODE,
  CREATED_CODE,
  INTERNAL_SERVER_ERROR_CODE,
} from "../../common/request-codes";

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
 *       - in: path
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
