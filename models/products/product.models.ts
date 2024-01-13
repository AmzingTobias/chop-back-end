import pool, { EDatabaseResponses, ICustomError } from "../../data/data";
import { FOREIGN_KEY_VIOLATION } from "../../common/postgresql-error-codes";

export interface IBaseProductEntry {
  id: number;
  name: string;
  description?: string;
  available: boolean;
  stock_count: number;
  price: number;
}

export interface IProductEntry extends IBaseProductEntry {
  brandName: string;
  brandId: number;
  description: string;
}

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
 * Create a new product
 * @param baseProductId The id of the base product variation
 * @param productName The name of the products
 * @param price The price to list the product for
 * @param description A description of the product
 * @returns EDatabaseResponses.OK if the product is created,
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the entries for the product
 * type ids or brand ids are invalid.
 * Rejects on database errors
 */
export const createNewProductVariant = (
  baseProductId: number,
  productName: string,
  price: number,
  description?: string
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        const createProductQuery =
          "INSERT INTO products(name, base_product_id, description) VALUES ($1, $2, $3) RETURNING id";
        const res = await client.query(createProductQuery, [
          productName,
          baseProductId,
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
 * Get a detailed list of all products that are of a certain type
 * @param productTypeId The id of the type to get all the products for
 * @returns A list of TProductForProductTypeEntry. Rejects on database errors
 */
export const getProductsByType = (
  productTypeId: number
): Promise<IBaseProductEntry[]> => {
  return new Promise((resolve, reject) => {
    const getProductsForTypeQuery = `
    SELECT
      id, 
      name, 
      description,
      "brandId",
      "brandName",
      available, 
      stock_count, 
      price::money::numeric::float8
    FROM product_view
    JOIN assigned_product_type ON base_product_id = assigned_product_type.product_id
    WHERE assigned_product_type.type_id = $1
    `;
    pool.query(
      getProductsForTypeQuery,
      [productTypeId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err);
        } else {
          resolve(res.rows as IBaseProductEntry[]);
        }
      }
    );
  });
};

/**
 * Get all products for a specific brand
 * @param brandId The id of the brand to get the products for
 * @returns A list of IBaseProductEntry. Rejects on database errors
 */
export const getProductsByBrand = (
  brandId: number
): Promise<IBaseProductEntry[]> => {
  return new Promise((resolve, reject) => {
    const getProductsForTypeQuery = `
    SELECT 
      id, 
      name, 
      description,
      "brandId",
      "brandName",
      available, 
      stock_count, 
      price::money::numeric::float8
    FROM product_view
    WHERE "brandId" = $1
    `;
    pool.query(getProductsForTypeQuery, [brandId], (err: ICustomError, res) => {
      if (err) {
        console.error(`${err.code}: ${err.message}`);
        reject(err);
      } else {
        resolve(res.rows as IBaseProductEntry[]);
      }
    });
  });
};

/**
 * Get a detailed list of all products that are of a certain type
 * @param productId The id of the product to get the info for
 * @returns A list of TDetailedProductEntry. Rejects on database errors
 */
export const getDetailedProductInfo = (
  productId: number
): Promise<IProductEntry[]> => {
  return new Promise((resolve, reject) => {
    const getProductsForTypeQuery = `
    SELECT 
      id, 
      name, 
      available, 
      "brandName",
      "brandId",
      stock_count, 
      price::money::numeric::float8,
      description
    FROM product_view
    WHERE id = $1
    `;
    pool.query(
      getProductsForTypeQuery,
      [productId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err);
        } else {
          resolve(res.rows as IProductEntry[]);
        }
      }
    );
  });
};

/**
 * Get a random number of products
 * @param numberOfProductsToGet The number of random products to get
 * @returns A list of product entries that were randomly picked
 */
export const getRandomNumberOfProducts = (
  numberOfProductsToGet: number
): Promise<IBaseProductEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
      SELECT 
        id, 
        name, 
        available, 
        stock_count, 
        price::money::numeric::float8
      FROM product_view
      ORDER BY RANDOM()
      LIMIT $1
    `,
      [numberOfProductsToGet],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err);
        } else {
          resolve(res.rows as IBaseProductEntry[]);
        }
      }
    );
  });
};

/**
 * Get a list of products based on their name, using a search query
 * @param searchQuery The search query to use to get a list of products
 * @returns A promise of a list of prooduct entries. Rejects on database errors
 */
export const getProductsByName = (
  searchQuery: string
): Promise<IProductEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      id, 
      name, 
      available, 
      "brandName",
      "brandId",
      stock_count, 
      price::money::numeric::float8,
      description
    FROM product_view
    WHERE to_tsvector(name) @@ websearch_to_tsquery($1) ORDER BY ts_rank(to_tsvector(name),  websearch_to_tsquery($1)) desc
    `,
      [searchQuery],
      (err, res) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        resolve(res.rows as IProductEntry[]);
      }
    );
  });
};

/**
 * Get a list of all product ids
 * @returns A promise with a list of all product ids. Rejects on database errors
 */
export const getAllProductIds = (): Promise<{ id: number }[]> => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT id FROM products", (err, res) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(res.rows as { id: number }[]);
      }
    });
  });
};

/**
 * Using a product Id, find all products that share the same base id as that product id
 * @param productId The Id of the product to find all similar styles of products for
 * @returns A promise for a list of products that are different variants of the product Id. Rejects on database errors
 */
export const getProductsOfSameStyle = (
  productId: number
): Promise<IProductEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT 
      id, 
      name, 
      available, 
      stock_count, 
      price::money::numeric::float8
      FROM product_view
      WHERE base_product_id = (SELECT base_product_id FROM products WHERE products.id = $1)`,
      [productId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rows as IProductEntry[]);
        }
      }
    );
  });
};
