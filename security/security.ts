import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { EResponseStatusCodes, ETextResponse } from "../common/response-types";

// Order should not be changed as it will interfere with existing tokens
export const enum EUserAccounts {
  customer = 0,
  sales = 1,
  support = 2,
  admin = 3,
  warehouse = 4,
}

// The type found inside the jwt token
export type TAccountAuth = {
  user_id: number;
  accountType: EUserAccounts;
  accountTypeId: number;
};

// Tell express that a user should exist in each request because of middleware
declare global {
  namespace Express {
    interface Request {
      user?: TAccountAuth;
    }
  }
}

/**
 * Hash a password
 * @param unhashedPassword The raw password to hash
 * @returns A hashed password. Rejects on errors
 */
export const hashPassword = (unhashedPassword: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const saltRounds = Number(process.env.PASSWORD_SALT_ROUNDS);
    bcrypt
      .hash(unhashedPassword, saltRounds)
      .then((hashedPassword) => resolve(hashedPassword))
      .catch((err) => {
        console.error(err);
        reject();
      });
  });
};

/**
 * Validate the password for an account
 * @param password The raw password supplied by the user
 * @param hashedPassword The possible hashed version of the password
 * @returns True if the passwords match, false otherwise. Rejects on errors
 */
export const validateAccountPassword = (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      resolve(await bcrypt.compare(password, hashedPassword));
    } catch (err) {
      console.error(err);
      reject();
    }
  });
};

/**
 * Create a JWT token to give back to a user
 * @param user_id The id of the user
 * @param accountType The type of account the user is
 * @param accountTypeId The id of the account type
 * @returns A string representing the JWT
 */
export const createJWTForUser = (
  user_id: number,
  accountType: EUserAccounts,
  accountTypeId: number
): string => {
  return jwt.sign(
    {
      user_id: user_id,
      accountType: accountType,
      accountTypeId: accountTypeId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

/**
 * Check the JWT token that was found in the request cookies
 * @param req The express request object
 * @param res The express response object. Unauthorized if a token is missing
 * @param next The next function to run after checks are performed
 */
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (typeof req.cookies["auth"] === "string") {
    jwt.verify(
      req.cookies["auth"],
      process.env.JWT_SECRET as string,
      (err, decode) => {
        if (err) {
          req.user = undefined;
          return res
            .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
            .send(ETextResponse.INVALID_AUTH_TOKEN);
        }
        req.user = decode as TAccountAuth;
        next();
      }
    );
  } else {
    req.user = undefined;
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.INVALID_AUTH_TOKEN);
  }
};
