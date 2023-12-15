import { Router } from "express";
import {
  createNewProductVariant,
  getDetailedProductInfo,
  getProductsByName,
  getRandomNumberOfProducts,
  setPriceForProduct,
  updateProductDescription,
  updateProductName,
} from "../../../models/products/product.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import { EDatabaseResponses } from "../../../data/data";
import { EAccountTypes, verifyToken } from "../../../security/security";

export const productRouter = Router();

/**
 * @swagger
 * /products/:
 *   get:
 *     tags: [Products]
 *     summary: Search for a product using a search query
 *     description: Retrieve detailed information regarding a specific product.
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         description: The search query to use. Must be greater than or equal to 3 characters
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of products that matched to the search
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *              id:
 *                type: integer
 *                description: The id of the product.
 *              name:
 *                type: string
 *                description: The name of the product.
 *              available:
 *                type: boolean
 *                description: If the product is available to be purchased.
 *              stock_count:
 *                type: number
 *                description: The stock count for the product.
 *              price:
 *                type: number
 *                description: The price for the product.
 *              brandName:
 *                type: string
 *                description: The name of the brand for the product, if one exists.
 *              brandId:
 *                type: number | null
 *                description: The id of the brand the product belongs to, null otherwise.
 *              description:
 *                type: string | null
 *                description: A description about the product if one exists, null otherwise.
 *       400:
 *          description: Request was invalid
 *       500:
 *          description: Internal server error
 */
productRouter.get("/", (req, res) => {
  const { search: searchQuery } = req.query;
  if (typeof searchQuery === "string") {
    if (searchQuery.length >= 2) {
      return getProductsByName(searchQuery.trim())
        .then((searchResult) => {
          return res.json(searchResult);
        })
        .catch(() => {
          return res
            .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
            .send(ETextResponse.INTERNAL_ERROR);
        });
    } else {
      return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
    }
  }
  return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
});

/**
 * @swagger
 * /products/random:
 *   get:
 *     tags: [Products]
 *     summary: Retrieve a list of random products
 *     description: Retrieve a custom amount of random products
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: false
 *         description: The number of random products to get
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
productRouter.get("/random", async (req, res) => {
  const { amount } = req.query;
  try {
    const products = await getRandomNumberOfProducts(
      Number.isNaN(Number(amount)) ? 1 : Number(amount)
    );
    res.json(products);
  } catch (err) {
    res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Retrieve information regarding a specific product
 *     description: Retrieve detailed information regarding a specific product.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to get the information for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: An object with details of the products.
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The id of the product.
 *             name:
 *               type: string
 *               description: The name of the product.
 *             available:
 *               type: boolean
 *               description: If the product is available to be purchased.
 *             stock_count:
 *               type: number
 *               description: The stock count for the product.
 *             price:
 *               type: number
 *               description: The price for the product.
 *             brandName:
 *               type: string
 *               description: The name of the brand for the product, if one exists.
 *             brandId:
 *               type: number | null
 *               description: The id of the brand the product belongs to, null otherwise.
 *             description:
 *               type: string | null
 *               description: A description about the product if one exists, null otherwise.
 *       500:
 *          description: Internal server error
 */
productRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!Number.isNaN(Number(id))) {
    try {
      const products = await getDetailedProductInfo(Number(id));
      return res.json(products);
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  }
});

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
 *         name: base-id
 *         required: true
 *         description: The id of the base product this is a variation of
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
 *          description: Missing fields in request body, or the base product id supplied are invalid
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

  const { name, price, "base-id": baseProductId, description } = req.body;
  if (
    typeof name === "string" &&
    typeof price === "number" &&
    typeof baseProductId === "number" &&
    (typeof description === "string" ||
      description === undefined ||
      description === null)
  ) {
    try {
      const created = await createNewProductVariant(
        baseProductId,
        name,
        price,
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
