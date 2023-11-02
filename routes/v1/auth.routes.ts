import { Router } from "express";
import { EAccountTypeTables } from "../../models/auth.models";
import {
  create_account_controller,
  login_to_account_controller,
} from "../../controllers/auth.controllers";

export const authRouter = Router();

/**
 * @swagger
 * /customer/create:
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
 * /customer/login:
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
 * /sales/create:
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
 *       500:
 *          description: Internal server error
 */
authRouter.post("/sales/create", (req, res) => {
  create_account_controller(req, res, EAccountTypeTables.sale_accounts);
});

/**
 * @swagger
 * /sales/login:
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
 * /admin/create:
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
 *       500:
 *          description: Internal server error
 */
authRouter.post("/admin/create", (req, res) => {
  create_account_controller(req, res, EAccountTypeTables.admin);
});

/**
 * @swagger
 * /admin/login:
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
 * /support/create:
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
 *       500:
 *          description: Internal server error
 */
authRouter.post("/support/create", (req, res) => {
  create_account_controller(req, res, EAccountTypeTables.support_accounts);
});

/**
 * @swagger
 * /support/login:
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
 * /warehouse/create:
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
 *       500:
 *          description: Internal server error
 */
authRouter.post("/warehouse/create", (req, res) => {
  create_account_controller(req, res, EAccountTypeTables.warehouse_accounts);
});

/**
 * @swagger
 * /warehouse/login:
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
