import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../../data/data";

type TShippingCountries = {
  id: number;
  name: string;
};

/**
 * Get a list of all countries that can be shipped to
 * @returns A promise for a list of all countries that can be shipped to.
 * Rejects on database errors
 */
export const getCountriesAvailableForShipping = (): Promise<
  TShippingCountries[]
> => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT id, name FROM shipping_countries", (err, res) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(res.rows);
      }
    });
  });
};

type TCustomerAddress = {
  // The id of the addres
  id?: number;
  // The area code for the address
  areaCode: string;
  // The first line of the address
  firstAddressLine: string;
  // The state the address is in for the country
  countryState: string;
  // The id of the country the address is in
  countryId: number;
  // The name of the country
  countryName?: string;
  // The second line of the address, if it exists
  secondAddressLine?: string;
};

/**
 * Create a new shipping address for a customer
 * @param customerId The id of the customer
 * @returns A promise for an EDatabaseResponses. OK if the address is created, or
 * FOREIGN_KEY_VIOLATION if the countryId is not valid. Rejects on database
 * errors
 */
export const createNewShippingAddress = (
  customerId: number | string,
  newAddress: TCustomerAddress
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO shipping_addresses(customer_id, area_code, first_address_line, second_address_line, state, country_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        customerId,
        newAddress.areaCode,
        newAddress.firstAddressLine,
        newAddress.secondAddressLine,
        newAddress.countryState,
        newAddress.countryId,
      ],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
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

export const getAllAddressesForCustomer = (
  customerId: number | string
): Promise<TCustomerAddress[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
    shipping_addresses.id, 
    area_code AS "areaCode", 
    first_address_line AS "firstAddressLine", 
    second_address_line AS "secondAddressLine", 
    state AS "countryState", 
    country_id AS "countryId", 
    shipping_countries.name AS "countryName"
    FROM shipping_addresses 
    LEFT JOIN shipping_countries on shipping_countries.id = shipping_addresses.country_id
    WHERE customer_id = $1`,
      [customerId],
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

/**
 * Set default shipping address for customer
 * @param customerId The id of the customer
 * @param addressId The Id of the address to set as default
 * @returns EDatabaseResponses.OK if the default address is set.
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the address or customer does not exist. #
 * EDatabaseResponses.CONFLICT if the default address is already set (USE Update instead)
 * Rejects on database errors
 */
export const setDefaultShippingAddress = (
  customerId: number,
  addressId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO default_shipping_address(shipping_address_id, customer_id) VALUES ($1, $2)",
      [addressId, customerId],
      (err: ICustomError, res) => {
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
 * Update a default shipping address for a customer
 * @param customerId The id of the customer to update their default
 * shipping address for
 * @param addressId The id of the default shipping address to set as the new
 * default shipping address
 * @returns A promise with EDatabaseResponses. OK if the default address is
 * updated. FOREIGN_KEY_VIOLATION if the addressId supplied is invalid and
 * DOES_NOT_EXIST if no default address exists to udpate. Rejects on database
 * errors.
 */
export const updateDefaultShippingAddress = (
  customerId: number,
  addressId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE default_shipping_address SET shipping_address_id = $1 WHERE customer_id = $2",
      [addressId, customerId],
      (err: ICustomError, res) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(err);
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
 * Get the default shipping address for a customer
 * @param customerId The id of the customer account to get the default address for
 * @returns A promise of a customer address or null if no default address is set.
 * Rejects on database errors
 */
export const getDefaultShippingAddress = (
  customerId: number
): Promise<TCustomerAddress | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      shipping_addresses.id, 
      area_code AS "areaCode", 
      first_address_line AS "firstAddressLine", 
      second_address_line AS "secondAddressLine", 
      state AS "countryState", 
      country_id AS "countryId", 
      shipping_countries.name AS "countryName"
    FROM default_shipping_address
    LEFT JOIN shipping_addresses on shipping_addresses.id = default_shipping_address.shipping_address_id
    LEFT JOIN shipping_countries on shipping_countries.id = shipping_addresses.country_id
    WHERE default_shipping_address.customer_id = $1
    `,
      [customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rowCount > 0 ? (res.rows[0] as TCustomerAddress) : null);
        }
      }
    );
  });
};

/**
 * Delete a default shipping address
 * @param customerId The Id of the customer to remove the default address for
 * @returns A promise of a boolean. True if the default address is deleted.
 * False if the default address never existed to delete.
 * Rejects on database errors
 */
export const deleteDefaultShippingAddress = (
  customerId: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM default_shipping_address WHERE customer_id = $1",
      [customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rowCount > 0);
        }
      }
    );
  });
};

/**
 * Delete a shipping address
 * @param customerId The Id of the customer the address belongs to
 * @param addressId The id of the address to delete
 * @returns A promise of a boolean. True if the address is deleted.
 * False if the address never existed to delete. Rejects on database error
 */
export const deleteShippingAddress = (
  customerId: number,
  addressId: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Using both the customer Id and addressId, it can be ensured that
    // a customer can delete their addresses only, and not another address
    pool.query(
      "DELETE FROM shipping_addresses WHERE id = $1 AND customer_id = $2",
      [addressId, customerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rowCount > 0);
        }
      }
    );
  });
};

/**
 * Get an address using an address id
 * @param addressId The id of the address
 * @returns TCustomerAddress if the address exists, null if it does not
 */
export const getAddressWithId = (
  addressId: number
): Promise<TCustomerAddress | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
      SELECT 
        shipping_addresses.id, 
        area_code AS "areaCode", 
        first_address_line AS "firstAddressLine", 
        second_address_line AS "secondAddressLine", 
        state AS "countryState", 
        country_id AS "countryId", 
        shipping_countries.name AS "countryName"
      FROM shipping_addresses 
      LEFT JOIN shipping_countries on shipping_countries.id = shipping_addresses.country_id
      WHERE shipping_addresses.id = $1
    `,
      [addressId],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.rowCount > 0 ? res.rows[0] : null);
        }
      }
    );
  });
};
