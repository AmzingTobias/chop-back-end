import { Router } from "express";
import {
  updateBrandId,
  updateProductDescription,
  updateProductName,
} from "../../models/product.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import { EDatabaseResponses } from "../../data/data";

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
 *       500:
 *          description: Internal server error
 */
productRouter.put("/:id/name", async (req, res) => {
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
 *       500:
 *          description: Internal server error
 */
productRouter.put("/:id/description", async (req, res) => {
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
 *       500:
 *          description: Internal server error
 */
productRouter.delete("/:id/description", async (req, res) => {
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
 *       500:
 *          description: Internal server error
 */
productRouter.put("/:id/brand", async (req, res) => {
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
 *       500:
 *          description: Internal server error
 */
productRouter.delete("/:id/brand", async (req, res) => {
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
