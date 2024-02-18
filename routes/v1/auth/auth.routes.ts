import { Router } from "express";
import {
  EAccountTypeTables,
  getAllAccounts,
  get_account_details,
  update_account_password,
} from "../../../models/auth/auth.models";
import {
  COOKIE_OPTIONS,
  create_account_controller,
  login_to_account_controller,
} from "../../../controllers/auth.controllers";
import {
  EAccountTypes,
  hashPassword,
  verifyToken,
} from "../../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import { EDatabaseResponses } from "../../../data/data";

export const authRouter = Router();

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Accounts]
 *     summary: Logout of an account
 *     responses:
 *       200:
 *          description: Logout succesful
 */
authRouter.post("/logout", (_, res) => {
  res.clearCookie("auth");
  res.send(ETextResponse.LOGOUT_SUCCESFUL);
});

/**
 * @swagger
 * /auth/accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: Get all accounts on the site
 *     responses:
 *       200:
 *          description: List of accounts
 *          schema:
 *            type: array
 *            items:
 *              type: object
 *              properties:
 *                id:
 *                  type: integer
 *                  description: The id of the account
 *                email:
 *                  type: string
 *                  description: The email attached to the account
 *                type:
 *                  type: string
 *                  description: Number representing the type the account belongs to
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
authRouter.get("/accounts", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }

  getAllAccounts()
    .then((allAccounts) => res.json(allAccounts))
    .catch((err) => {
      console.error(err);
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /auth/:
 *   get:
 *     tags: [Accounts]
 *     summary: Get the details of an account
 *     description: Get the details of an account, based on the credentials supplied
 *     responses:
 *       200:
 *          description: Customer account details
 *          schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email for the account
 *       401:
 *          description: Account details invalid
 *       500:
 *          description: Internal server error
 */
authRouter.get("/", verifyToken, (req, res) => {
  if (!req.user) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  get_account_details(req.user.user_id)
    .then((accountDetails) => {
      if (accountDetails !== null) {
        res.json(accountDetails);
      } else {
        res.status(EResponseStatusCodes.UNAUTHORIZED_CODE);
      }
    })
    .catch(() => {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /auth/customer/create:
 *   post:
 *     tags: [Customer, Accounts]
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
  create_account_controller(req, res, EAccountTypeTables.customer);
});

/**
 * @swagger
 * /auth/customer/login:
 *   post:
 *     tags: [Customer, Accounts]
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
 *          description: Customer account details valid
 *          schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: string
 *                 description: The auth token for the account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account details invalid or account is not a customer account
 *       500:
 *          description: Internal server error
 */
authRouter.post("/customer/login", async (req, res) => {
  login_to_account_controller(req, res, EAccountTypeTables.customer);
});

/**
 * @swagger
 * /auth/sales/create:
 *   post:
 *     tags: [Sales, Accounts]
 *     summary: Create a new sales account
 *     description: Create a new sales account with an email and password
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
 *          description: Sales account created
 *       409:
 *          description: Email already exists to another account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
authRouter.post("/sales/create", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  create_account_controller(req, res, EAccountTypeTables.sale_accounts);
});

/**
 * @swagger
 * /auth/sales/login:
 *   post:
 *     tags: [Sales, Accounts]
 *     summary: Login to a sales account
 *     description: Login to an existing sales account and receive the auth token for the account
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
 *          description: Sales account details valid
 *          schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: string
 *                 description: The auth token for the account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account details invalid or account is not a sales account
 *       500:
 *          description: Internal server error
 */
authRouter.post("/sales/login", (req, res) => {
  login_to_account_controller(req, res, EAccountTypeTables.sale_accounts);
});

/**
 * @swagger
 * /auth/admin/create:
 *   post:
 *     tags: [Admin, Accounts]
 *     summary: Create a new admin account
 *     description: Create a new admin account with an email and password
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
 *          description: Admin account created
 *       409:
 *          description: Email already exists to another account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
authRouter.post("/admin/create", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  create_account_controller(req, res, EAccountTypeTables.admin);
});

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     tags: [Admin, Accounts]
 *     summary: Login to an admin account
 *     description: Login to an existing admin account and receive the auth token for the account
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
 *          description: Admin account details valid
 *          schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: string
 *                 description: The auth token for the account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account details invalid or account is not an admin account
 *       500:
 *          description: Internal server error
 */
authRouter.post("/admin/login", (req, res) => {
  login_to_account_controller(req, res, EAccountTypeTables.admin);
});

/**
 * @swagger
 * /auth/support/create:
 *   post:
 *     tags: [Support, Accounts]
 *     summary: Create a new support account
 *     description: Create a new support account with an email and password
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
 *          description: Support account created
 *       409:
 *          description: Email already exists to another account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
authRouter.post("/support/create", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  create_account_controller(req, res, EAccountTypeTables.support_accounts);
});

/**
 * @swagger
 * /auth/support/login:
 *   post:
 *     tags: [Support, Accounts]
 *     summary: Login to a support account
 *     description: Login to an existing support account and receive the auth token for the account
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
 *          description: Support account details valid
 *          schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: string
 *                 description: The auth token for the account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account details invalid or account is not a support account
 *       500:
 *          description: Internal server error
 */
authRouter.post("/support/login", (req, res) => {
  login_to_account_controller(req, res, EAccountTypeTables.support_accounts);
});

/**
 * @swagger
 * /auth/warehouse/create:
 *   post:
 *     tags: [Warehouse, Accounts]
 *     summary: Create a new warehouse account
 *     description: Create a new warehouse account with an email and password
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
 *          description: Warehouse account created
 *       409:
 *          description: Email already exists to another account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
authRouter.post("/warehouse/create", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  create_account_controller(req, res, EAccountTypeTables.warehouse_accounts);
});

/**
 * @swagger
 * /auth/warehouse/login:
 *   post:
 *     tags: [Warehouse, Accounts]
 *     summary: Login to a warehouse account
 *     description: Login to an existing warehouse account and receive the auth token for the account
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
 *          description: Warehouse account details valid
 *          schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: string
 *                 description: The auth token for the account
 *       400:
 *          description: Email or password missing in request body
 *       401:
 *          description: Account details invalid or account is not a warehouse account
 *       500:
 *          description: Internal server error
 */
authRouter.post("/warehouse/login", (req, res) => {
  login_to_account_controller(req, res, EAccountTypeTables.warehouse_accounts);
});

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     tags: [Accounts]
 *     summary: Update an account's password
 *     description: Update an account's password. The account to update is taken from the credentials
 *     parameters:
 *       - in: body
 *         name: new-password
 *         required: true
 *         description: The new password for the account
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Password updated for the account
 *       400:
 *          description: Password missing from request body
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
authRouter.put("/change-password", verifyToken, (req, res) => {
  const { "new-password": newPassword } = req.body;
  if (typeof newPassword === "string") {
    // Ensure only the user can update their own password
    if (req.user) {
      const accountIdToUpdate = req.user.user_id;
      hashPassword(newPassword)
        .then(async (hashedPassword) => {
          try {
            const updated = await update_account_password(
              accountIdToUpdate,
              hashedPassword
            );
            switch (updated) {
              case EDatabaseResponses.OK:
                res.send(ETextResponse.ACCOUNT_PASS_UPDATED);
                break;
              case EDatabaseResponses.DOES_NOT_EXIST:
                res
                  .status(EResponseStatusCodes.BAD_REQUEST_CODE)
                  .send(ETextResponse.ACCOUNT_DETAILS_INVALID);
                break;
              default:
                res
                  .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
                  .send(ETextResponse.INTERNAL_ERROR);
                break;
            }
          } catch (_) {
            res
              .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
              .send(ETextResponse.INTERNAL_ERROR);
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
        .send(ETextResponse.UNAUTHORIZED_REQUEST);
    }
  } else {
    res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
});
