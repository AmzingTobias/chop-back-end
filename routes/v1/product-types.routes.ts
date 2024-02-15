import { Router } from "express";
import {
  createProductType,
  deleteProductType,
  getAllProductTypes,
  getProductType,
  updateProductType,
} from "../../models/product-types.models";
import { EDatabaseResponses } from "../../data/data";
import {
  ETextResponse,
  EResponseStatusCodes,
} from "../../common/response-types";
import { EAccountTypes, verifyToken } from "../../security/security";
import { getProductsByType } from "../../models/products/product.models";
import { getBaseProductsWithProductType } from "../../models/products/base-product.models";

export const productTypeRouter = Router();

/**
 * @swagger
 * /product-types:
 *   get:
 *     tags: [Product types]
 *     summary: Retrieve a lsit of product types
 *     description: Retrieve a list of product types.
 *     responses:
 *       200:
 *         description: A list of product types.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the product type.
 *                 example: 1
 *               type:
 *                 type: string
 *                 description: The name of the product type.
 *                 example: Technology
 *               productCount:
 *                 type: number
 *                 description: The number of products assigned to the type.
 *                 example: 1
 *       500:
 *          description: Internal server error
 */
productTypeRouter.get("/", async (_, res) => {
  try {
    const result = await getAllProductTypes();
    res.json(result);
  } catch (_) {
    res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});

/**
 * @swagger
 * /product-types:
 *   post:
 *     tags: [Product types]
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
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productTypeRouter.post("/", verifyToken, async (req, res) => {
  if (
    !req.user ||
    req.user.accountTypeId !== EAccountTypes.sales ||
    req.user.accountType !== EAccountTypes.admin
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

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
 * /product-types/{id}/base-products:
 *   get:
 *     tags: [Base Products, Product types]
 *     summary: Get all base products assinged to a product type
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product type
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: List of base products
 *          schema:
 *            type: array
 *            items:
 *              type: object
 *              properties:
 *                id:
 *                  type: integer
 *                  description: The id of the base product
 *                brandName:
 *                  type: string
 *                  description: The brand name of the base product if it exists
 *                description:
 *                  type: string
 *                  description: Description for the base product
 *                productCount:
 *                  type: integer
 *                  description: The number of products that use this base product
 *       400:
 *          description: Id invalid in request
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productTypeRouter.get("/:id/base-products", verifyToken, (req, res) => {
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
  if (Number.isNaN(Number(id))) {
    return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
  } else {
    getBaseProductsWithProductType(Number(id))
      .then((baseProducts) => res.json(baseProducts))
      .catch((err) => {
        console.error(err);
        res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
      });
  }
});

/**
 * @swagger
 * /product-types/{id}:
 *   put:
 *     tags: [Product types]
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
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productTypeRouter.put("/:id", verifyToken, async (req, res) => {
  if (
    !req.user ||
    req.user.accountTypeId !== EAccountTypes.sales ||
    req.user.accountType !== EAccountTypes.admin
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

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
    } catch (_) {
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
 * /product-types/{id}:
 *   delete:
 *     tags: [Product types]
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
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productTypeRouter.delete("/:id", verifyToken, async (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

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

/**
 * @swagger
 * /product-types/{id}:
 *   get:
 *     tags: [Product types]
 *     summary: Get details about a product type
 *     description: Get details about a product type
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product type
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of products.
 *         schema:
 *          type: object
 *          properties:
 *            id:
 *              type: integer
 *              description: The id of the product type.
 *              example: 1
 *            type:
 *              type: string
 *              description: The name of the product type.
 *              example: Technology
 *       400:
 *          description: Product type does not exist
 *       500:
 *          description: Internal server error
 */
productTypeRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!Number.isNaN(Number(id))) {
    try {
      const productType = await getProductType(Number(id));
      if (productType === null) {
        res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST);
      } else {
        res.json(productType);
      }
    } catch (_) {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    }
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST);
  }
});

/**
 * @swagger
 * /product-types/{id}/products:
 *   get:
 *     tags: [Product types, Products]
 *     summary: Retrieve a list of products from a product type
 *     description: Retrieve a list of products from a given product type.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product type to get the products for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of products.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the product.
 *               name:
 *                 type: string
 *                 description: The name of the product.
 *               description:
 *                 type: string
 *                 description: The description of the product
 *               available:
 *                 type: boolean
 *                 description: If the product is available to be purchased.
 *               stock_count:
 *                 type: number
 *                 description: The stock count for the product.
 *               price:
 *                 type: number
 *                 description: The price for the product.
 *       500:
 *          description: Internal server error
 */
productTypeRouter.get("/:id/products", async (req, res) => {
  const { id } = req.params;
  if (!Number.isNaN(Number(id))) {
    try {
      const products = await getProductsByType(Number(id));
      return res.json(products);
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  }
});
