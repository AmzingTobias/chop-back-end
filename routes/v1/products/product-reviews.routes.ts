import { Router } from "express";
import {
  createProductReview,
  deleteProductReview,
  getAllReviewsForProduct,
  updateProductReview,
} from "../../../models/products/product-reviews.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import { EAccountTypes, verifyToken } from "../../../security/security";
import { EDatabaseResponses } from "../../../data/data";
import { getLastPurchaseDateForProduct } from "../../../models/orders.models";

const productReviewsRouter = Router();

/**
 * @swagger
 * /products/reviews/:
 *   post:
 *     tags: [Product reviews]
 *     summary: Post a new review
 *     description: Post a new review regarding a product
 *     parameters:
 *       - in: body
 *         name: productId
 *         required: true
 *         description: The id of the product the review is for
 *         schema:
 *           type: number
 *       - in: body
 *         name: rating
 *         required: true
 *         description: The review between 0 and 10 for the product
 *         schema:
 *           type: number
 *       - in: body
 *         name: review
 *         required: true
 *         description: Text to accompany the rating
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Review was posted
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       409:
 *          description: Customer has already reviewed product
 *       500:
 *          description: Internal server error
 */
productReviewsRouter.post("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { productId, rating, review } = req.body;
  if (
    typeof productId !== "number" ||
    typeof rating !== "number" ||
    rating > 10 ||
    rating < 0 ||
    typeof review !== "string"
  ) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  // Check that the customer has bought this product before
  const customerId = req.user.accountTypeId;
  getLastPurchaseDateForProduct(customerId, productId)
    .then((datePurchased) => {
      if (datePurchased !== null) {
        createProductReview(customerId, productId, Math.floor(rating), review)
          .then((databaseResponse) => {
            switch (databaseResponse) {
              case EDatabaseResponses.OK:
                return res
                  .status(EResponseStatusCodes.CREATED_CODE)
                  .send(ETextResponse.PRODUCT_REVIEW_CREATED);
              case EDatabaseResponses.CONFLICT:
                return res
                  .status(EResponseStatusCodes.CONFLICT_CODE)
                  .send(ETextResponse.PRODUCT_REVIEWED_ALREADY);
              case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
                return res
                  .status(EResponseStatusCodes.BAD_REQUEST_CODE)
                  .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
              default:
                return res.sendStatus(
                  EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
                );
            }
          })
          .catch((_) => {
            return res.sendStatus(
              EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
            );
          });
      } else {
        return res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(ETextResponse.PRODUCT_REVIEW_NOT_PURCHASED);
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/reviews/{id}:
 *   put:
 *     tags: [Product reviews]
 *     summary: Update an existing review
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the review to update
 *         schema:
 *           type: number
 *       - in: body
 *         name: rating
 *         required: true
 *         description: The updated review between 0 and 10 for the product
 *         schema:
 *           type: number
 *       - in: body
 *         name: review
 *         required: true
 *         description: Updated text to accompany the rating
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Review was updated
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productReviewsRouter.put("/:id", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  const { rating, review } = req.body;
  if (
    isNaN(Number(id)) ||
    typeof rating !== "number" ||
    rating > 10 ||
    rating < 0 ||
    typeof review !== "string"
  ) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  updateProductReview(
    Number(id),
    req.user.accountTypeId,
    Math.floor(rating),
    review
  )
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_REVIEW_UPDATED);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_REVIEW_ID_NOT_EXIST);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/reviews/{id}:
 *   delete:
 *     tags: [Product reviews]
 *     summary: Delete an existing review
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the review to delete
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *          description: Review was deleted
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productReviewsRouter.delete("/:id", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { id } = req.params;

  deleteProductReview(req.user.accountTypeId, Number(id))
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_REVIEW_DELETE);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_REVIEW_ID_NOT_EXIST);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /products/reviews/:
 *   get:
 *     tags: [Product reviews]
 *     summary: Get all reviews for a product
 *     parameters:
 *       - in: query
 *         name: product
 *         required: true
 *         description: The id of the product to get the reviews for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of reviews
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the review
 *               customerId:
 *                 type: number
 *                 description: The id of the customer who left the review
 *               createdOn:
 *                 type: date
 *                 description: The date the review was posted
 *               updatedOn:
 *                 type: date | null
 *                 description: The date the review was updated, or null if never updated
 *               rating:
 *                 type: number
 *                 description: The rating between 0 and 10 that was left for the product
 *               review:
 *                 type: string
 *                 description: Additional information about the rating
 *       500:
 *          description: Internal server error
 */
productReviewsRouter.get("/", async (req, res) => {
  const { product } = req.query;
  if (!Number.isNaN(Number(product))) {
    try {
      const reviews = await getAllReviewsForProduct(Number(product));
      return res.json(reviews);
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
  }
});

export default productReviewsRouter;
