import { Router } from "express";
import {
  EAccountTypeTables,
  createCustomerAccount,
  getUserWithEmail,
  isAccountOfType,
} from "../../models/auth.models";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  EUserAccounts,
  createJWTForUser,
  hashPassword,
  validateAccountPassword,
} from "../../security/security";
import { EDatabaseResponses } from "../../data/data";

export const authRouter = Router();

/**
 * @swagger
 * /customer/create:
 *   post:
 *     tags: [Customers, Accounts]
 *     summary: Create a new customer account
 *     description: Create a new customer account with an email and password
 *     parameters:
 *       - in: body
 *         name: email
 *         required: true
 *         description: The unique email for the account
 *         schema:
 *           type: string
 *       - in: body
 *         name: password
 *         required: true
 *         description: The password for the account
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Customer account created
 *       409:
 *          description: Email already exists to another account
 *       400:
 *          description: Email or password missing in request body
 *       500:
 *          description: Internal server error
 */
authRouter.post("/customer/create/", (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  hashPassword(password)
    .then(async (hashedPassword) => {
      try {
        const created = await createCustomerAccount(
          email.trim(),
          hashedPassword
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
});

/**
 * @swagger
 * /customer/login:
 *   post:
 *     tags: [Customers, Accounts]
 *     summary: Login to a customer account
 *     description: Login to an existing customer account and receive the auth token for the account
 *     parameters:
 *       - in: body
 *         name: email
 *         required: true
 *         description: The email for the account
 *         schema:
 *           type: string
 *       - in: body
 *         name: password
 *         required: true
 *         description: The password for the account
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Customer account detailed valid
 *          schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: string
 *                 description: The auth token for the account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Customer details invalid or account is not a customer
 *       500:
 *          description: Internal server error
 */
authRouter.post("/customer/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email === "string" && typeof password === "string") {
    try {
      const account = await getUserWithEmail(email);
      if (account !== null) {
        validateAccountPassword(password, account.password)
          .then((validated) => {
            if (validated) {
              isAccountOfType(EAccountTypeTables.customer, account.id)
                .then((customerAccount) => {
                  if (customerAccount.isAccountType) {
                    res.json({
                      token: createJWTForUser(
                        account.id,
                        EUserAccounts.customer,
                        customerAccount.accountTypeId
                      ),
                    });
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
});

authRouter.post("/staff/login", (req, res) => {
  const { email, password } = req.body;
});

authRouter.post("/warehouse/login", (req, res) => {
  const { email, password } = req.body;
});
