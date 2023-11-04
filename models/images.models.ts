import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

/**
 * Add a new image for a product
 * @param productId The product to add the image for
 * @param imagePath The file name that is stored locally
 * @returns EDatabaseResponses.OK if the image is created for the product succesfully,
 * EDatabaseResponses.CONFLICT if the image file name already exists,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the product id does not match a product.
 * Rejects on database errors
 */
export const addImageForProduct = (productId: number, imagePath: string) => {
  return new Promise<EDatabaseResponses>((resolve, reject) => {
    pool.query(
      "INSERT INTO product_images(product_id, source) VALUES($1, $2)",
      [productId, imagePath],
      (err: ICustomError, _) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(`${err.code}: ${err.message}`);
            reject(err);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};
