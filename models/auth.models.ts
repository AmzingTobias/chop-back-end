import { UNIQUE_CONSTRAINT_FAILED } from "../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../data/data";

// Type representing an entry found in the accounts table
type TAccountEntry = {
  id: number;
  email: string;
  password: string;
};

// Different tables for accounts
export const enum EAccountTypeTables {
  customer = "customer_accounts",
  admin = "admin_accounts",
  sale_accounts = "sale_accounts",
  support_accounts = "support_accounts",
  warehouse_accounts = "warehouse_accounts",
}

/**
 * Get an account with an email
 * @param email The email to get the account for
 * @returns An account entry, or null if the account does not exist.
 * Rejects on database errors
 */
export const getUserWithEmail = (
  email: string
): Promise<TAccountEntry | null> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT id, email, password FROM accounts WHERE email = $1",
      [email],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err.message);
        } else {
          resolve(res.rowCount > 0 ? res.rows[0] : null);
        }
      }
    );
  });
};

/**
 * Check if the account belongs to the valid type
 * @param accountTable The account type to check against
 * @param accountId The Id of the account to find out the type it is
 * @returns \{isAccountType: True if the account is of type, false otherwise,
 * accountTypeId: The id found in the account type table if true, NaN if false\}.
 * Rejects on database errors
 */
export const isAccountOfType = (
  accountTable: EAccountTypeTables,
  accountId: number
): Promise<{ isAccountType: boolean; accountTypeId: number }> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT id FROM ${accountTable} WHERE account_id = $1`,
      [accountId],
      (err: ICustomError, res) => {
        if (err) {
          console.error(`${err.code}: ${err.message}`);
          reject(err.message);
        } else {
          resolve({
            isAccountType: res.rowCount > 0,
            accountTypeId: res.rowCount > 0 ? res.rows[0].id : NaN,
          });
        }
      }
    );
  });
};

/**
 * Create a new customer account
 * @param email The email to use for the account
 * @param hashedPassword A hashed password to use for the account
 * @returns EDatabaseResponses.OK if the account is created,
 * EDatabaseResponses.CONFLICT if the email is already in use.
 * Rejects on database errors
 */
export const createCustomerAccount = (
  email: string,
  hashedPassword: string
): Promise<EDatabaseResponses> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pool.connect();
      let transactionStatus: EDatabaseResponses | undefined = undefined;
      try {
        await client.query("BEGIN");
        const createAccountText =
          "INSERT INTO accounts(email, password) VALUES($1, $2) RETURNING id";
        const res = await client.query(createAccountText, [
          email,
          hashedPassword,
        ]);
        const insertCustomerAccountText =
          "INSERT INTO customer_accounts(account_id) VALUES ($1)";
        await client.query(insertCustomerAccountText, [res.rows[0].id]);
        await client.query("COMMIT");
        transactionStatus = EDatabaseResponses.OK;
      } catch (err) {
        if ((err as ICustomError).code === UNIQUE_CONSTRAINT_FAILED) {
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
