import { Router } from "express";
import {
  createNewShippingAddress,
  getCountriesAvailableForShipping,
} from "../../../models/auth/address-book.model";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import { EAccountTypes, verifyToken } from "../../../security/security";
import { EDatabaseResponses } from "../../../data/data";

export const addressBookRouter = Router();

/**
 * @swagger
 * /auth/address/available-countries:
 *   get:
 *     tags: [Address]
 *     summary: Get all countries available for shipping
 *     description: Get all countries that can be shipped to
 *     responses:
 *       200:
 *          description: A list of all countries that can be shipped to
 *          schema:
 *            type: array
 *            items:
 *              type: object
 *              properties:
 *                id:
 *                  type: integer
 *                  description: The id of the country.
 *                  example: 1
 *                name:
 *                  type: string
 *                  description: The name of the country.
 *                  example: United Kingdom
 *       500:
 *          description: Internal server error
 */
addressBookRouter.get("/available-countries", (_, res) => {
  getCountriesAvailableForShipping()
    .then((countriesForShipping) => {
      res.json(countriesForShipping);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

/**
 * @swagger
 * /auth/address/new:
 *   post:
 *     tags: [Address]
 *     summary: Create a new address for a customer
 *     description: Create a new address for a customer
 *     parameters:
 *       - in: body
 *         name: area-code
 *         required: true
 *         description: The area code for the address. E.g., a postcode
 *         schema:
 *           type: string
 *       - in: body
 *         name: first-address-line
 *         required: true
 *         description: The first line of the customer's address
 *         schema:
 *           type: string
 *       - in: body
 *         name: second-address-line
 *         required: false
 *         description: The second line of the customer's address, if needed
 *         schema:
 *           type: string
 *       - in: body
 *         name: state
 *         required: true
 *         description: The state the address exists in
 *         schema:
 *           type: string
 *       - in: body
 *         name: countryId
 *         required: true
 *         description: The id of the country the address exists in
 *         schema:
 *           type: number
 *     responses:
 *       201:
 *          description: Address was created
 *       400:
 *          description: Body fields missing
 *       401:
 *          description: Account is not a customer
 *       500:
 *          description: Internal server error
 */
addressBookRouter.post("/new", verifyToken, (req, res) => {
  // User must be a customer in order to manage their addresses
  if (
    req.user === undefined ||
    req.user.accountType !== EAccountTypes.customer
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const {
    "area-code": areaCode,
    "first-address-line": firstAddressLine,
    "second-address-line": secondAddressLine,
    state,
    "country-id": countryId,
  } = req.body;
  // Type check to ensure that all fields are present
  if (
    typeof areaCode === "string" &&
    typeof firstAddressLine === "string" &&
    (typeof secondAddressLine === "string" ||
      typeof secondAddressLine === "undefined") &&
    typeof state === "string" &&
    typeof countryId === "number"
  ) {
    createNewShippingAddress(
      req.user.accountTypeId,
      areaCode,
      firstAddressLine,
      state,
      countryId,
      secondAddressLine
    )
      .then((databaseCode) => {
        switch (databaseCode) {
          case EDatabaseResponses.OK:
            res
              .status(EResponseStatusCodes.CREATED_CODE)
              .send(ETextResponse.ADDRESS_CREATED);
            break;
          case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
            res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.ADDRESS_COUNTRY_ID_INVALID);
            break;
          default:
            res
              .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
              .send(ETextResponse.INTERNAL_ERROR);
        }
      })
      .catch((_) => {
        res
          .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
          .send(ETextResponse.INTERNAL_ERROR);
      });
  } else {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
});
