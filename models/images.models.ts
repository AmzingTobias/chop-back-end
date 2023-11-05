import path from "path";
import { deleteSavedFile } from "../common/image";
import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

interface IImageEntry {
  id: number;
  fileName: string;
}

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

/**
 * Delete an image from the image products table
 * @param imageId The id of the image to delete
 * @returns EDatabaseResponse.OK if the image is deleted from the database, and should be deleted locally as well,
 * EDatabaseResponse.DOES_NOT_EXIST if the image doesn't exist to delete.
 * Rejects on database errors
 */
export const deleteImageForProduct = (
  imageId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM product_images WHERE id = $1 RETURNING source, product_id",
      [imageId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err);
        } else {
          if (res.rowCount > 0) {
            deleteSavedFile(
              path.join(
                __dirname,
                `../product-images/${res.rows[0].product_id}/${res.rows[0].source}`
              )
            )
              .then(() => {
                resolve(EDatabaseResponses.OK);
              })
              .catch(() => {
                console.error(
                  `Image: ${res.rows[0].source} deleted on server but not locally`
                );
                resolve(EDatabaseResponses.OK);
              });
          } else {
            resolve(EDatabaseResponses.DOES_NOT_EXIST);
          }
        }
      }
    );
  });
};

/**
 * Get all the images for a product, sorted by their sort position
 * @param productId The Id of the product to get the images for
 * @returns A list of images for the product. Rejects on database errors
 */
export const getImagesForProduct = (
  productId: number
): Promise<IImageEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT id, source AS "fileName" FROM product_images WHERE product_id = $1 ORDER BY sort_position`,
      [productId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err);
        } else {
          resolve(res.rows as IImageEntry[]);
        }
      }
    );
  });
};
