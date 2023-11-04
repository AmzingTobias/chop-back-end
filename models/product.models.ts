import { QueryConfig } from "pg";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";
import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../common/postgresql-error-codes";

// Type describing the product entry that exists in the database
export type TProductEntry = {
  // The name of the product
  name: string;
  // If the product is available
  available?: boolean;
  // The date the product was created on
  created_on?: Date;
  // The Id of the brand (if exists) the product is tied to
  brand_id: number | null;
  // The description of the product, if one exists
  description: string | null;
};

/**
 * Update a product's name
 * @param productId The Id of the product to update
 * @param newName The new name for the product
 * @returns EDatabaseResponses.OK if the name is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * Rejects on database errors
 */
export const updateProductName = (
  productId: number,
  newName: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products SET name = $1 WHERE id = $2",
      [newName, productId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
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
 * Update a product's description
 * @param productId The Id of the product to update
 * @param newDescription The new description for the product
 * @returns EDatabaseResponses.OK if the description is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * Rejects on database errors
 */
export const updateProductDescription = (
  productId: number,
  newDescription: string | null
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products SET description = $1 WHERE id = $2",
      [newDescription, productId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
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
 * Update a product's brand id
 * @param productId The Id of the product to update
 * @param newBrandId The new brand id for the product
 * @returns EDatabaseResponses.OK if the brand id is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * EDatabaseResponse.FOREIGN_KEY_VIOLATION if the brand id is not valid
 * Rejects on database errors
 */
export const updateBrandId = (
  productId: number,
  newBrandId: number | null
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE products SET brand_id = $1 WHERE id = $2",
      [newBrandId, productId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(`${err.code}: ${err.message}`);
            reject(err);
          }
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
 * Create a new product
 * @param productName The name of the products
 * @param productTypeIds The list of category ids this product falls under
 * @param price The price to list the product for
 * @param brandId The id of the brand this product is for
 * @param description A description of the product
 * @returns EDatabaseResponses.OK if the product is created,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the entries for the product
 * type ids or brand ids are invalid.
 * Rejects on database errors
 */
export const createNewProduct = (
  productName: string,
  productTypeIds: number[],
  price: number,
  brandId?: number,
  description?: string
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        const createProductQuery =
          "INSERT INTO products(name, brand_id, description) VALUES ($1, $2, $3) RETURNING id";
        const res = await client.query(createProductQuery, [
          productName,
          brandId,
          description,
        ]);
        const createProductStockLevelQuery =
          "INSERT INTO product_stock_levels(product_id) VALUES($1)";
        await client.query(createProductStockLevelQuery, [res.rows[0].id]);
        const createProductPriceQuery =
          "INSERT INTO product_prices(product_id, price) VALUES($1, $2)";
        await client.query(createProductPriceQuery, [
          res.rows[0].id,
          price.toFixed(2),
        ]);
        for await (const productTypeId of productTypeIds) {
          await client.query(
            "INSERT INTO assigned_product_type(product_id, type_id) VALUES($1, $2)",
            [res.rows[0].id, productTypeId]
          );
        }
        await client.query("COMMIT");
        transactionStatus = EDatabaseResponses.OK;
      } catch (err) {
        if ((err as ICustomError).code === FOREIGN_KEY_VIOLATION) {
          transactionStatus = EDatabaseResponses.FOREIGN_KEY_VIOLATION;
        } else {
          console.error(
            `${(err as ICustomError).code}: ${(err as ICustomError).message}`
          );
        }
        await client.query("ROLLBACK");
      } finally {
        client.release();
        if (transactionStatus === undefined) {
          reject();
        } else {
          resolve(transactionStatus);
        }
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

/**
 * Set a new price for a product, or update the price for the current day
 * @param productId The id of the proudct to set the price for
 * @param price The price for the product
 * @returns EDatabaseResponses.OK if the price is inserted / updated succesfully,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the product id does not exist,
 * EDatabaseResponses.DOES_NOT_EXIST shouldn't be returned. Rejects on database errors
 */
export const setPriceForProduct = (
  productId: number,
  price: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    const setPriceQuery =
      "INSERT INTO product_prices(product_id, price) VALUES ($1, $2) ON CONFLICT (product_id, date_active_from) DO UPDATE SET price=excluded.price";
    pool.query(
      setPriceQuery,
      [productId, price.toFixed(2)],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(`${err.code}: ${err.message}`);
            reject(err);
          }
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
 * Assign product types for a specific product
 * @param productId The id of the product to assign the types for
 * @param product_type_ids_to_delete A list of type ids to assign to the product
 * @returns EDatabaseResponses.OK if transaction completes.
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if either the product id or product type id does not exist,
 * EDatabaseResponses.CONFLICT if the relationship between the product id and product type already exists.
 * Rejects on database errors
 */
export const assignProductTypes = (
  productId: number,
  productTypeIdsToAssign: number[]
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    const assignedProductTypeQuery =
      "INSERT INTO assigned_product_type(product_id, type_id) VALUES($1, $2)";
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        for await (const type_id of productTypeIdsToAssign) {
          await client.query(assignedProductTypeQuery, [productId, type_id]);
        }
        await client.query("COMMIT");
        transactionStatus = EDatabaseResponses.OK;
      } catch (err) {
        if ((err as ICustomError).code === FOREIGN_KEY_VIOLATION) {
          transactionStatus = EDatabaseResponses.FOREIGN_KEY_VIOLATION;
        } else if ((err as ICustomError).code === UNIQUE_CONSTRAINT_FAILED) {
          transactionStatus = EDatabaseResponses.CONFLICT;
        } else {
          console.error(
            `${(err as ICustomError).code}: ${(err as ICustomError).message}`
          );
        }
        await client.query("ROLLBACK");
      } finally {
        client.release();
        if (transactionStatus === undefined) {
          reject();
        } else {
          resolve(transactionStatus);
        }
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

/**
 * Delete assigned product types for a specific product
 * @param productId The id of the product to delete the types for
 * @param productTypeIdsToDelete A list of type ids to delete for the product
 * @returns EDatabaseResponses.OK if transaction completes. Rejects on database errors
 */
export const deleteAssignedProductTypes = (
  productId: number,
  productTypeIdsToDelete: number[]
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    const removeAssignedProductTypeQuery =
      "DELETE FROM assigned_product_type WHERE product_id = $1 AND type_id = $2";
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        for await (const type_id of productTypeIdsToDelete) {
          await client.query(removeAssignedProductTypeQuery, [
            productId,
            type_id,
          ]);
        }
        await client.query("COMMIT");
        transactionStatus = EDatabaseResponses.OK;
      } catch (err) {
        console.error(
          `${(err as ICustomError).code}: ${(err as ICustomError).message}`
        );
        await client.query("ROLLBACK");
      } finally {
        client.release();
        if (transactionStatus === undefined) {
          reject();
        } else {
          resolve(transactionStatus);
        }
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};
