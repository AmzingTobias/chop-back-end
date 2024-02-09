import pool, { EDatabaseResponses, ICustomError } from "../../data/data";
import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../../common/postgresql-error-codes";

/**
 * Create a new base product variation
 * @param description The description for the base product variant
 * @param brandId The brand id if one exists for the base product
 * @param productTypeIds A list of product type ids to assign to the base product
 * @returns EDatabaseResponses.OK if the base product is created,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the entries for the product
 * type ids or brand ids are invalid.
 * Rejects on database errors
 */
export const createNewBaseProduct = (
  description: string,
  productTypeIds: number[],
  brandId?: number
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        const createProductQuery =
          "INSERT INTO base_products(description, brand_id) VALUES ($1, $2) RETURNING id";
        const res = await client.query(createProductQuery, [
          description,
          brandId,
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
 * Delete a base product
 * @param baseProductId The id of the base product to delete
 * @returns EDatabaseResponse.OK if the base product is deleted,
 * EDatabaseResponse.DOES_NOT_EXIST if the base product was not deleted because it does not exist.
 * Rejects on database errors
 */
export const deleteBaseProduct = (
  baseProductId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM base_products WHERE id = $1",
      [baseProductId],
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
 * Update a base products description
 * @param baseProductId The base product id to update
 * @param description The new description to use
 * @returns EDatabaseResponses.OK if the description is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * Rejects on database errors
 */
export const updateBaseProductDescription = (
  baseProductId: number,
  description: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE base_products SET description = $1 WHERE id = $2",
      [description, baseProductId],
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
 * Update a base products assigned brand
 * @param baseProductId The Id of the base product to update
 * @param brandId THe new brandId to update
 * @returns EDatabaseResponses.OK if the brand id is updated,
 * EDatabaseResponses.DOES_NOT_EXIST if the product does not exist.
 * EDatabaseResponse.FOREIGN_KEY_VIOLATION if the brand id is not valid
 * Rejects on database errors
 */
export const updateBaseProductBrand = (
  baseProductId: number,
  brandId?: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE base_products SET brand_id = $1 WHERE id = $2",
      [brandId, baseProductId],
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
 * Assign a list of product types to the base product
 * @param baseProductId The id of the base product to assign types to
 * @param procuctTypeIds The list of types to assign to the base product
 * @returns EDatabaseResponses.OK if transaction completes.
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if either the product id or product type id does not exist,
 * EDatabaseResponses.CONFLICT if the relationship between the product id and product type already exists.
 * Rejects on database errors
 */
export const assignProductTypesToBaseProduct = (
  baseProductId: number,
  procuctTypeIds: number[]
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    const assignedProductTypeQuery =
      "INSERT INTO assigned_product_type(product_id, type_id) VALUES($1, $2)";
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        for await (const type_id of procuctTypeIds) {
          await client.query(assignedProductTypeQuery, [
            baseProductId,
            type_id,
          ]);
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
 * Unassign product types from a base product
 * @param baseProductId The id of the base product to unassign the types from
 * @param productTypeIds The id of the product types to unassign
 * @returns EDatabaseResponses.OK if transaction completes. Rejects on database errors
 */
export const unassignProductTypesFromBaseProduct = (
  baseProductId: number,
  productTypeIds: number[]
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    const removeAssignedProductTypeQuery =
      "DELETE FROM assigned_product_type WHERE product_id = $1 AND type_id = $2";
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        for await (const type_id of productTypeIds) {
          await client.query(removeAssignedProductTypeQuery, [
            baseProductId,
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

type TBaseProduct = {
  id: number;
  brandName: string;
  description: string;
  productCount: number;
};

/**
 * Get all the base products
 * @returns A list of the base products
 */
export const getAllBaseProducts = (): Promise<TBaseProduct[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT
      base_products.id,
      COALESCE(brands.name, ''::character varying) AS "brandName",
      base_products.description,
      COUNT(products.id) AS "productCount"
    FROM base_products
    LEFT JOIN brands ON base_products.brand_id = brands.id
    LEFT JOIN products ON base_products.id = products.base_product_id
    GROUP BY base_products.id, brands.name, base_products.description;
    `,
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};

/**
 * Get a list of all the product ids who have the base id provided
 * @param baseId The base id to get all the products with
 * @returns A list of products who all share the same base id
 */
export const getProductIdsWithBaseId = (
  baseId: number
): Promise<{ id: number }[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT id FROM products WHERE base_product_id = $1",
      [baseId],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};
