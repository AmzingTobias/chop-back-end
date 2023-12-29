// Models needed
// Remove shipping address
// Update existing shipping address
// Get a list of all shipping addresses
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

/**
 * Create a new shipping address for a customer
 * @param customerId The id of the customer
 * @param areaCode The area code for the address
 * @param firstAddressLine The first line of the address
 * @param countryState The state the address is in for the country
 * @param countryId The id of the country the address is in
 * @param secondAddressLine The second line of the address, if it exists
 * @returns A promise for an EDatabaseResponses. OK if the address is created, or
 * FOREIGN_KEY_VIOLATION if the countryId is not valid. Rejects on database
 * errors
 */
export const createNewShippingAddress = (
  customerId: number | string,
  areaCode: string,
  firstAddressLine: string,
  countryState: string,
  countryId: number,
  secondAddressLine?: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO shipping_addresses(customer_id, area_code, first_address_line, second_address_line, state, country_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        customerId,
        areaCode,
        firstAddressLine,
        secondAddressLine,
        countryState,
        countryId,
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
