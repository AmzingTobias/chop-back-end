import pool, { EDatabaseResponses, ICustomError } from "../data/data";

/**
 * Type used when validating a discount code
 */
export type TDiscountCodeValidation = {
  // The id of the discount code
  id: number;
  // The code that was validated
  code: string;
  // If the discount code is currently valid
  valid: boolean;
  // The amount the discount code applies to the total order
  percent: number;
  // If the discount can be used in conjunction with other offers
  stackable: boolean;
};

export type TDiscountCodeEntry = {
  // The id of the discount code
  id: number;
  // The code that was validated
  code: string;
  // The date the code was created
  createdOn: Date;
  // The number of uses left on the code
  remainingUses: number;
  // If the discount code is currently valid
  active: boolean;
  // The amount the discount code applies to the total order
  percent: number;
  // If the discount can be used in conjunction with other offers
  stackable: boolean;
};

/**
 * Validate that a discount code exists
 * @param code The code to validate
 * @returns A TDiscountCodeValidation
 */
export const validateDiscountCode = (
  code: string
): Promise<TDiscountCodeValidation | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      id,
      code,
      (number_of_uses != 0 AND active) as "valid", 
      percent_off AS "percent", 
      stackable 
    FROM discount_codes
    WHERE code = $1
`,
      [code],
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

/**
 * Get a list of all the discount codes available
 * @returns A list of the discount codes
 */
export const getAllDiscountCodes = (): Promise<TDiscountCodeEntry[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT 
      id,
      code,
      created_on AS "createdOn",
      number_of_uses AS "remainingUses",
      active, 
      percent_off AS "percent", 
      stackable 
    FROM discount_codes
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
 * Toggle a discount code being active
 * @param codeId The id of the code
 * @param active True if the code is to be made active, false otherwise
 * @returns EDatabaseResponses.OK if the code was updated,
 * EDatabaseResponses.DOES_NOT_EXIST If the code does not exist to update
 */
export const toggleDiscountCodeActive = (
  codeId: number,
  active: boolean
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE discount_codes SET active = $1 WHERE id = $2",
      [active, codeId],
      (err, res) => {
        if (err) {
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
 * Toggle a discount code being stackable
 * @param codeId The id of the code
 * @param stackable True if the code is stackable with other codes, false otherwise
 * @returns EDatabaseResponses.OK if the code was updated,
 * EDatabaseResponses.DOES_NOT_EXIST If the code does not exist to update
 */
export const toggleDiscountCodeStackable = (
  codeId: number,
  stackable: boolean
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE discount_codes SET stackable = $1 WHERE id = $2",
      [stackable, codeId],
      (err, res) => {
        if (err) {
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
 * Set a new percentage value for a discount code
 * @param codeId The id of the code
 * @param percent The new percent value for the code
 * @returns EDatabaseResponses.OK if the code was updated,
 * EDatabaseResponses.DOES_NOT_EXIST If the code does not exist to update
 */
export const updateDiscountCodePercent = (
  codeId: number,
  percent: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE discount_codes SET percent_off = $1 WHERE id = $2",
      [percent, codeId],
      (err, res) => {
        if (err) {
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
 * Set the number of remaining uses for a code
 * @param codeId The id of the code
 * @param remainingUses The number of remaining uses left for a code. -1 if the code is
 * infinite
 * @returns EDatabaseResponses.OK if the code was updated,
 * EDatabaseResponses.DOES_NOT_EXIST If the code does not exist to update
 */
export const updateDiscountCodeRemainingUses = (
  codeId: number,
  remainingUses: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE discount_codes SET number_of_uses = $1 WHERE id = $2",
      [remainingUses, codeId],
      (err, res) => {
        if (err) {
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
