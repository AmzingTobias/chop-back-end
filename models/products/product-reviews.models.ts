import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../../data/data";

/**
 * Create a new review for a product
 * @param customerId The id of the customer leaving the review
 * @param productId The id of the product
 * @param rating The rating given in the review
 * @param review The contents of the review itself
 * @returns EDatabaseResponses.OK if the review is created,
 * EDatabaseResponses.CONFLICT if the customer has already left a review for the product,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the customer or product does not exist.
 * Rejects on database errors
 */
export const createProductReview = (
  customerId: number,
  productId: number,
  rating: number,
  review: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO customer_product_reviews(customer_id, product_id, rating, text) VALUES ($1, $2, $3, $4)",
      [customerId, productId, rating, review],
      (err: ICustomError, _) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else {
            console.error(err);
            reject(err);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};

/**
 * Allow a customer to update an existing review
 * @param reviewId The Id of the review being left
 * @param customerId The id of the customer who left the review
 * @param updatedRating The new rating for the review
 * @param updatedReview The new updated version of the review
 * @returns EDatabaseResponses.OK if the review is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the reivew does not exist to update
 */
export const updateProductReview = (
  reviewId: number,
  customerId: number,
  updatedRating: number,
  updatedReview: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE customer_product_reviews SET updated_on=CURRENT_DATE, rating = $1, text = $2 WHERE id = $3 AND customer_id = $4",
      [updatedRating, updatedReview, reviewId, customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(
            res.rowCount > 0
              ? EDatabaseResponses.OK
              : EDatabaseResponses.DOES_NOT_EXIST
          );
        }
      }
    );
  });
};

/**
 * Delete an existing product review
 * @param customerId The id of the customer who left the review
 * @param reviewId The id of the review to delete
 * @returns EDatabaseResponses.OK if the review is deleted,
 * EDatabaseResponses.OK.DOES_NOT_EXIST if the review doesn't exist to delete.
 * Rejects on database errors
 */
export const deleteProductReview = (
  customerId: number,
  reviewId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM customer_product_reviews WHERE id = $1 AND customer_id = $2",
      [reviewId, customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(
            res.rowCount > 0
              ? EDatabaseResponses.OK
              : EDatabaseResponses.DOES_NOT_EXIST
          );
        }
      }
    );
  });
};

type TProductReview = {
  id: number;
  customerId: number;
  createdOn: Date;
  updatedOn: Date | null;
  rating: number;
  review: string;
};

/**
 * Get a list of all review for a product
 * @param productId The id of the product to get the reviews for
 * @returns A list of TProductReview. Rejects on database errors
 */
export const getAllReviewsForProduct = (
  productId: number
): Promise<TProductReview[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT id, customer_id AS "customerId", created_on AS "createdOn", updated_on AS "updatedOn", rating, text AS "review" 
      FROM customer_product_reviews 
      WHERE product_id = $1`,
      [productId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};
