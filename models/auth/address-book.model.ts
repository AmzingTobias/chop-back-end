// Models needed
// Remove shipping address
// Set a default shipping address
// Remove a default shipping address
// Set a new default shipping address
// Get default shipping address

import { FOREIGN_KEY_VIOLATION } from "../../common/postgresql-error-codes";
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
