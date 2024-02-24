import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../../security/security";
import {
  assignProductTypesToBaseProduct,
  createNewBaseProduct,
  deleteBaseProduct,
  getAllBaseProducts,
  getProductIdsWithBaseId,
  getProductTypesWithBaseId,
  unassignProductTypesFromBaseProduct,
  updateBaseProductBrand,
  updateBaseProductDescription,
} from "../../../models/products/base-product.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import { EDatabaseResponses } from "../../../data/data";
import { isArrayOfNumbers } from "../../../common/validation";

export const baseProductRouter = Router();

/**
 * @swagger
 * /products/base:
 *   post:
 *     tags: [Base Products]
 *     summary: Create a new base product
 *     description: Create a new base product, that can then have variations made of it
 *     parameters:
 *       - in: body
 *         name: description
 *         required: true
 *         description: A brief description of what the base product is representing
 *         schema:
 *           type: string
 *       - in: body
 *         name: product-type-ids
 *         required: true
 *         description: A list of product types to assign to the base product
 *         schema:
 *           type: array
 *           items:
 *            type:
 *              number
 *       - in: body
 *         name: brand-id
 *         required: false
 *         description: A brand id to associate with the base product
 *         schema:
 *           type: number
 *     responses:
 *       201:
 *          description: Product base created
 *       400:
 *          description: Missing fields in request body, or the brand / product type id(s) were invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.post("/", verifyToken, (req, res) => {
  // Auth check, user must be sales or admin
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const {
    description,
    "brand-id": brandId,
    "product-type-ids": productTypeIds,
  } = req.body;
  // Check all data that is expected is there
  if (
    typeof description === "string" &&
    (typeof brandId === "undefined" || typeof brandId === "number") &&
    isArrayOfNumbers(productTypeIds)
  ) {
    createNewBaseProduct(description, productTypeIds, brandId)
      .then((response) => {
        switch (response) {
          case EDatabaseResponses.OK:
            return res
              .status(EResponseStatusCodes.CREATED_CODE)
              .send(ETextResponse.BASE_PRODUCT_CREATED);
          case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
            return res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(
                `${ETextResponse.BRAND_ID_NOT_EXIST} OR ${ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST}`
              );
          default:
            return res
              .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
              .send(ETextResponse.INTERNAL_ERROR);
        }
      })
      .catch((_) => {
        return res
          .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
          .send(ETextResponse.INTERNAL_ERROR);
      });
  } else {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(`${ETextResponse.MISSING_FIELD_IN_REQ_BODY}`);
  }
});

/**
 * @swagger
 * /products/base:
 *   get:
 *     tags: [Base Products]
 *     summary: Get all base products
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
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.get("/", verifyToken, (req, res) => {
  // Auth check, user must be sales, admin, or warehouse
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales &&
      req.user.accountType !== EAccountTypes.warehouse)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  getAllBaseProducts()
    .then((products) => res.json(products))
    .catch((err) => {
      console.error(err);
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/base/{id}:
 *   get:
 *     tags: [Base Products]
 *     summary: Get all products that are childs of a base product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the base product to get the product list for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: List of  products tied to the base product
 *          schema:
 *            type: array
 *            items:
 *              type: object
 *              properties:
 *                id:
 *                  type: integer
 *                  description: The id of the product
 *       400:
 *          description: Request was invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.get("/:id", verifyToken, (req, res) => {
  // Auth check, user must be sales, admin, or warehouse
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales &&
      req.user.accountType !== EAccountTypes.warehouse)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  getProductIdsWithBaseId(Number(id))
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/base/{id}:
 *   put:
 *     tags: [Base Products]
 *     summary: Update a base product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the base product to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: description
 *         required: true
 *         description: The new description for the base product
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Base product updated
 *       400:
 *          description: Base product does not exist to update
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.put("/:id", verifyToken, (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  const { description } = req.body;
  if (Number.isNaN(Number(id)) || typeof description !== "string") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  updateBaseProductDescription(Number(id), description)
    .then((updated) => {
      switch (updated) {
        case EDatabaseResponses.OK:
          return res.sendStatus(200);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.BASE_PRODUCT_ID_NOT_EXIST);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/base/{id}:
 *   delete:
 *     tags: [Base Products, Products]
 *     summary: Delete a base product
 *     description: Delete an existing base product using its id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the base product to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: Base product deleted
 *       400:
 *          description: Base product does not exist to delete
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.delete("/:id", verifyToken, (req, res) => {
  // Auth check, user must be sales or admin
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    deleteBaseProduct(Number(id))
      .then((response) => {
        switch (response) {
          case EDatabaseResponses.OK:
            return res.send(ETextResponse.BASE_PRODUCT_DELETED);
          case EDatabaseResponses.DOES_NOT_EXIST:
            return res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.BASE_PRODUCT_ID_NOT_EXIST);
          default:
            return res
              .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
              .send(ETextResponse.INTERNAL_ERROR);
        }
      })
      .catch((_) => {
        return res
          .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
          .send(ETextResponse.INTERNAL_ERROR);
      });
  }
});

/**
 * @swagger
 * /products/base/{id}/brand:
 *   put:
 *     tags: [Base Products, Products, Brands]
 *     summary: Update a base product's brand
 *     description: Update an existing base products brand
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the base product to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: brandId
 *         required: true
 *         description: The new brand id for the prduct
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *          description: Product's brand updated
 *       400:
 *          description: Product or brand does not exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.put("/:id/brand", verifyToken, async (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    const { brandId } = req.body;
    if (typeof brandId === "number") {
      try {
        const updated = await updateBaseProductBrand(Number(id), brandId);
        switch (updated) {
          case EDatabaseResponses.OK:
            res.send(ETextResponse.BASE_PRODUCT_UPDATED);
            break;
          case EDatabaseResponses.DOES_NOT_EXIST:
            res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.BASE_PRODUCT_ID_NOT_EXIST);
            break;
          case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
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
        .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
    }
  }
});

/**
 * @swagger
 * /products/base/{id}/brand:
 *   delete:
 *     tags: [Base Products, Products, Brands]
 *     summary: Remvoe a base product's brand
 *     description: Remove an existing base products brand
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the base product to update
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: Product's brand removed
 *       400:
 *          description: Product does not exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.delete("/:id/brand", verifyToken, async (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    try {
      const deleted = await updateBaseProductBrand(Number(id));
      switch (deleted) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.BRAND_DELETED);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.BASE_PRODUCT_ID_NOT_EXIST);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    } catch (_) {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  }
});

/**
 * @swagger
 * /products/base/{id}/product-types:
 *   get:
 *     tags: [Base Products, Products, Product types]
 *     summary: Get product types assigned to a base product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the base product
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of product types
 *         schema:
 *            type: array
 *            items:
 *              type: object
 *              properties:
 *               id:
 *                 type: integer
 *                 description: The id of the product type.
 *                 example: 1
 *               type:
 *                 type: string
 *                 description: The name of the product type.
 *                 example: Technology
 *       400:
 *          description: Base product id missing
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.get("/:id/product-types", verifyToken, (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  getProductTypesWithBaseId(Number(id))
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/base/{id}/product-types:
 *   post:
 *     tags: [Base Products, Products, Product types]
 *     summary: Assign new product types to a base product
 *     description: Assign multiple new product types to an existing base product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The base product id to assign the product types to
 *         schema:
 *           type: number
 *       - in: body
 *         name: product-type-ids
 *         required: true
 *         description: A list of product types to assign to the product
 *         schema:
 *           type: array
 *           items:
 *            type:
 *              number
 *     responses:
 *       201:
 *          description: Product types were assigned
 *       400:
 *          description: Missing fields in request body, or the product id / type id was invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.post("/:id/product-types", verifyToken, async (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  const { "product-type-ids": productTypeIds } = req.body;
  if (!isArrayOfNumbers(productTypeIds)) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  try {
    const assigned = await assignProductTypesToBaseProduct(
      Number(id),
      productTypeIds
    );
    switch (assigned) {
      case EDatabaseResponses.OK:
        return res
          .status(EResponseStatusCodes.CREATED_CODE)
          .send(ETextResponse.PRODUCT_TYPE_ASSIGNED);
      case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
        return res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(
            `${ETextResponse.BASE_PRODUCT_ID_NOT_EXIST} or ${ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST}`
          );
      case EDatabaseResponses.CONFLICT:
        return res
          .status(EResponseStatusCodes.CONFLICT_CODE)
          .send(ETextResponse.PRODUCT_TYPE_ALREADY_ASSIGNED);
      default:
        return res
          .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
          .send(ETextResponse.INTERNAL_ERROR);
    }
  } catch (_) {
    return res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});

/**
 * @swagger
 * /products/base/{id}/product-types:
 *   delete:
 *     tags: [Base Products, Products, Product types]
 *     summary: Unassign product types from a base product
 *     description: Unassign multiple product types from an existing base product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The base product id to remove the product types from
 *         schema:
 *           type: number
 *       - in: body
 *         name: product-type-ids
 *         required: true
 *         description: A list of product types to remove from the product
 *         schema:
 *           type: array
 *           items:
 *            type:
 *              number
 *     responses:
 *       201:
 *          description: Product types were removed
 *       400:
 *          description: Missing fields in request body, or the product id was invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
baseProductRouter.delete(
  "/:id/product-types",
  verifyToken,
  async (req, res) => {
    if (
      !req.user ||
      (req.user.accountType !== EAccountTypes.admin &&
        req.user.accountType !== EAccountTypes.sales)
    ) {
      return res
        .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
        .send(ETextResponse.UNAUTHORIZED_REQUEST);
    }
    const { id } = req.params;
    if (Number.isNaN(Number(id))) {
      return res
        .status(EResponseStatusCodes.BAD_REQUEST_CODE)
        .send(ETextResponse.ID_INVALID_IN_REQ);
    }
    const { "product-type-ids": productTypeIds } = req.body;
    if (!isArrayOfNumbers(productTypeIds)) {
      return res
        .status(EResponseStatusCodes.BAD_REQUEST_CODE)
        .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
    }
    try {
      const deleted = await unassignProductTypesFromBaseProduct(
        Number(id),
        productTypeIds
      );
      switch (deleted) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_TYPE_REMOVED_FROM_PRODUCT);
        default:
          return res
            .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
            .send(ETextResponse.INTERNAL_ERROR);
      }
    } catch (_) {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  }
);
