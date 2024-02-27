import { CookieOptions, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  EAccountTypes,
  account_table_to_account_type,
  createJWTForUser,
  hashPassword,
  validateAccountPassword,
  validateEmail,
} from "../security/security";
import { EResponseStatusCodes, ETextResponse } from "../common/response-types";
import { EDatabaseResponses } from "../data/data";
import {
  createAccount,
  EAccountTypeTables,
  getUserWithEmail,
  isAccountOfType,
} from "../models/auth/auth.models";

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  domain: process.env.COOKIE_DOMAIN,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  // 400 days
  // maxAge: 34560000,
};

/**
 * Create an account
 * @param req The express request object
 * @param res The express response object
 * @param accountTableType The enum for the table the account is attempting to login to
 */
export const create_account_controller = (
  req: Request,
  res: Response,
  accountTableType: EAccountTypeTables
) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  if (!validateEmail(email)) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  hashPassword(password)
    .then(async (hashedPassword) => {
      try {
        const created = await createAccount(
          email.trim(),
          hashedPassword,
          accountTableType
        );
        switch (created) {
          case EDatabaseResponses.OK:
            res.send();
            break;
          case EDatabaseResponses.CONFLICT:
            res
              .status(EResponseStatusCodes.CONFLICT_CODE)
              .send(ETextResponse.ACCOUNT_ALREADY_EXISTS);
            break;
          default:
            res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
            break;
        }
      } catch (_) {
        res
          .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
          .send(ETextResponse.INTERNAL_ERROR);
      }
    })
    .catch(() => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
};

/**
 * Login to an account
 * @param req The request object
 * @param res The response object
 * @param accountTableType The enum for the table the account is attempting to login to
 */
export const login_to_account_controller = async (
  req: Request,
  res: Response,
  accountTableType: EAccountTypeTables
) => {
  const { email, password } = req.body;
  if (typeof email === "string" && typeof password === "string") {
    try {
      const account = await getUserWithEmail(email);
      if (account !== null) {
        validateAccountPassword(password, account.password)
          .then((validated) => {
            if (validated) {
              isAccountOfType(accountTableType, account.id)
                .then((accountOfType) => {
                  if (accountOfType.isAccountType) {
                    const accountType =
                      account_table_to_account_type(accountTableType);
                    if (accountType !== undefined) {
                      res.cookie(
                        "auth",
                        createJWTForUser(
                          account.id,
                          accountType,
                          accountOfType.accountTypeId
                        ),
                        {
                          expires: new Date(
                            new Date().setFullYear(new Date().getFullYear() + 1)
                          ),
                          ...COOKIE_OPTIONS,
                        }
                      );
                      console.log(COOKIE_OPTIONS);
                      const sessionId = uuidv4();
                      res.cookie("sessionId", sessionId, COOKIE_OPTIONS);
                      res.json({ success: true });
                    } else {
                      res
                        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
                        .send(ETextResponse.INTERNAL_ERROR);
                    }
                  } else {
                    res
                      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
                      .send(ETextResponse.ACCOUNT_TYPE_INVALID);
                  }
                })
                .catch(() => {
                  res
                    .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
                    .send(ETextResponse.INTERNAL_ERROR);
                });
            } else {
              res
                .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
                .send(ETextResponse.ACCOUNT_DETAILS_INVALID);
            }
          })
          .catch(() => {
            res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
          });
      } else {
        res
          .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
          .send(ETextResponse.ACCOUNT_DETAILS_INVALID);
      }
    } catch (_) {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    }
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
};
