import pool, { EDatabaseResponses, ICustomError } from "../data/data";

/**
 * Type used when validating a discount code
 */
type TDiscountCodeValidation = {
  // If the discount code is currently valid
  valid: boolean;
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
