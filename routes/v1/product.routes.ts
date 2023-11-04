import { Router } from "express";
import {
  assignProductTypes,
  createNewProduct,
  deleteAssignedProductTypes,
  setPriceForProduct,
  updateBrandId,
  updateProductDescription,
  updateProductName,
} from "../../models/product.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import { EDatabaseResponses } from "../../data/data";
import { EAccountTypes, verifyToken } from "../../security/security";
import { isArrayOfNumbers } from "../../common/validation";

export const productRouter = Router();

/**
 * @swagger
 * /products/{id}/name:
 *   put:
 *     tags: [Products]
 *     summary: Update a product's name
 *     description: Update an existing products' name
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: name
 *         required: true
 *         description: The new name for the prduct
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Product's name updated
 *       400:
 *          description: Product does not exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productRouter.put("/:id/name", verifyToken, async (req, res) => {
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
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    const { name } = req.body;
    if (typeof name === "string") {
      try {
        const updated = await updateProductName(Number(id), name.trim());
        switch (updated) {
          case EDatabaseResponses.OK:
            res.send(ETextResponse.PRODUCT_UPDATED);
            break;
          case EDatabaseResponses.DOES_NOT_EXIST:
            res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
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
 * /products/{id}/description:
 *   put:
 *     tags: [Products]
 *     summary: Update a product's description
 *     description: Update an existing products' description
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: description
 *         required: true
 *         description: The new description for the prduct
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Product's description updated
 *       400:
 *          description: Product does not exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productRouter.put("/:id/description", verifyToken, async (req, res) => {
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
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    const { description } = req.body;
    if (typeof description === "string") {
      try {
        const updated = await updateProductDescription(
          Number(id),
          description.trim()
        );
        switch (updated) {
          case EDatabaseResponses.OK:
            res.send(ETextResponse.PRODUCT_UPDATED);
            break;
          case EDatabaseResponses.DOES_NOT_EXIST:
            res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
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
 * /products/{id}/description:
 *   delete:
 *     tags: [Products]
 *     summary: Remvoe a product's description
 *     description: Remove an existing product's description
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to update
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *          description: Product's description removed
 *       400:
 *          description: Product does not exist
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productRouter.delete("/:id/description", verifyToken, async (req, res) => {
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
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    try {
      const updated = await updateProductDescription(Number(id), null);
      switch (updated) {
        case EDatabaseResponses.OK:
          res.send(ETextResponse.PRODUCT_UPDATED);
          break;
        case EDatabaseResponses.DOES_NOT_EXIST:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
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
  }
});

/**
 * @swagger
 * /products/{id}/brand:
 *   put:
 *     tags: [Products, Brands]
 *     summary: Update a product's brand
 *     description: Update an existing products brand
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to update
 *         schema:
 *           type: integer
 *       - in: body
 *         name: brand-id
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
productRouter.put("/:id/brand", verifyToken, async (req, res) => {
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
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    const { "brand-id": brandId } = req.body;
    if (typeof brandId === "number") {
      try {
        const updated = await updateBrandId(Number(id), brandId);
        switch (updated) {
          case EDatabaseResponses.OK:
            res.send(ETextResponse.PRODUCT_UPDATED);
            break;
          case EDatabaseResponses.DOES_NOT_EXIST:
            res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
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
 * /products/{id}/brand:
 *   delete:
 *     tags: [Products, Brands]
 *     summary: Remvoe a product's brand
 *     description: Remove an existing products brand
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to update
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
productRouter.delete("/:id/brand", verifyToken, async (req, res) => {
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
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  } else {
    try {
      const deleted = await updateBrandId(Number(id), null);
      switch (deleted) {
        case EDatabaseResponses.OK:
          res.send(ETextResponse.BRAND_DELETED);
          break;
        case EDatabaseResponses.DOES_NOT_EXIST:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
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
  }
});

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: Create a new product for the store
 *     parameters:
 *       - in: body
 *         name: name
 *         required: true
 *         description: The name of the product
 *         schema:
 *           type: string
 *       - in: body
 *         name: price
 *         required: true
 *         description: The price to list the product with
 *         schema:
 *           type: number
 *       - in: body
 *         name: product-type-ids
 *         required: false
 *         description: The list of categories this product falls under
 *         schema:
 *           type: array
 *           items:
 *            type:
 *              number
 *       - in: body
 *         name: brand-id
 *         required: false
 *         description: The id of the brand that created this product
 *         schema:
 *           type: number
 *       - in: body
 *         name: description
 *         required: false
 *         description: The list of categories this product falls under
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Product was created
 *       400:
 *          description: Missing fields in request body, or the brand ids / product ids supplied are invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productRouter.post("/", verifyToken, async (req, res) => {
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    if (
      !req.user ||
      (req.user.accountType !== EAccountTypes.admin &&
        req.user.accountType !== EAccountTypes.sales)
    ) {
      return res
        .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
        .send(ETextResponse.UNAUTHORIZED_REQUEST);
    }
  }

  const {
    name,
    price,
    "product-type-ids": productTypeIds,
    "brand-id": brandId,
    description,
  } = req.body;
  if (
    typeof name === "string" &&
    typeof price === "number" &&
    (typeof (brandId === "number") ||
      brandId === undefined ||
      brandId === null) &&
    (typeof description === "string" ||
      description === undefined ||
      description === null) &&
    isArrayOfNumbers(productTypeIds)
  ) {
    try {
      const created = await createNewProduct(
        name,
        productTypeIds,
        price,
        brandId,
        description
      );
      switch (created) {
        case EDatabaseResponses.OK:
          res
            .status(EResponseStatusCodes.CREATED_CODE)
            .send(ETextResponse.PRODUCT_CREATED);
          break;
        case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
          res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(
              `${ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST} or ${ETextResponse.BRAND_ID_NOT_EXIST}`
            );
          break;
        default:
          res
            .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
            .send(ETextResponse.INTERNAL_ERROR);
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
});

/**
 * @swagger
 * /products/{id}/price:
 *   post:
 *     tags: [Products]
 *     summary: Set a new price for the product
 *     description: Set a new price for an existing product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The product id to set the price for
 *         schema:
 *           type: number
 *       - in: body
 *         name: price
 *         required: true
 *         description: The price for the product
 *         schema:
 *           type: number
 *     responses:
 *       201:
 *          description: Product price was set
 *       400:
 *          description: Missing fields in request body, or the product id was invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productRouter.post("/:id/price", verifyToken, async (req, res) => {
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
  const { price } = req.body;
  if (typeof price !== "number") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  try {
    const priceSet = await setPriceForProduct(Number(id), price);
    switch (priceSet) {
      case EDatabaseResponses.OK:
        return res
          .status(EResponseStatusCodes.CREATED_CODE)
          .send(ETextResponse.PRODUCT_PRICE_SET);
      case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
        return res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
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
 * /products/{id}/product-types:
 *   post:
 *     tags: [Products, Product types]
 *     summary: Assign new product types to a product
 *     description: Assign multiple new product types to an existing product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The product id to assign the product types to
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
productRouter.post("/:id/product-types", verifyToken, async (req, res) => {
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
    const assigned = await assignProductTypes(Number(id), productTypeIds);
    switch (assigned) {
      case EDatabaseResponses.OK:
        return res
          .status(EResponseStatusCodes.CREATED_CODE)
          .send(ETextResponse.PRODUCT_TYPE_ASSIGNED);
      case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
        return res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(
            `${ETextResponse.PRODUCT_ID_NOT_EXISTS} or ${ETextResponse.PRODUCT_TYPE_ID_NOT_EXIST}`
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
 * /products/{id}/product-types:
 *   delete:
 *     tags: [Products, Product types]
 *     summary: Unassign product types from a product
 *     description: Unassign multiple product types from an existing product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The product id to remove the product types from
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
productRouter.delete("/:id/product-types", verifyToken, async (req, res) => {
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
    const deleted = await deleteAssignedProductTypes(
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
});
