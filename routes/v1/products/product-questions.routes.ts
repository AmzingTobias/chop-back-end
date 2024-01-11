import { Router } from "express";
import { EAccountTypes, verifyToken } from "../../../security/security";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../../common/response-types";
import {
  createNewProductQuestion,
  deleteProductQuestion,
  deleteRatingToProductQuestion,
  editProductQuestion,
  getAnswersForQuestion,
  getQuestionsAskedAboutProduct,
  getRatingForAnswerToProductQuestion,
  newRatingForAnswerToProductQuestion,
  provideAnswerToProductQuestion,
  updateRatingForAnswerToProductQuestion,
} from "../../../models/products/product-questions.models";
import { EDatabaseResponses } from "../../../data/data";

export const productQuestionsRouter = Router();

/**
 * @swagger
 * /product/:
 *   put:
 *     tags: [Product questions]
 *     summary: Update a question that has been asked already
 *     parameters:
 *       - in: body
 *         name: questionId
 *         required: true
 *         description: The id of the question to update
 *         schema:
 *           type: number
 *       - in: alteredQuestion
 *         name: helpful
 *         required: true
 *         description: The new version of the question
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *          description: Question updated
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.put("/", verifyToken, (req, res) => {
  // User must be an admin
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { questionId, alteredQuestion } = req.body;

  if (typeof questionId !== "number" || typeof alteredQuestion !== "string") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  editProductQuestion(questionId, alteredQuestion)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_QUESTION_EDITED);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/:
 *   delete:
 *     tags: [Product questions]
 *     summary: Delete a question that has been asked already
 *     parameters:
 *       - in: body
 *         name: questionId
 *         required: true
 *         description: The id of the question to update
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *          description: Question deleted
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.delete("/", verifyToken, (req, res) => {
  // User must be an admin
  if (!req.user || req.user.accountType !== EAccountTypes.admin) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { questionId } = req.body;

  if (typeof questionId !== "number") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  deleteProductQuestion(questionId)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_QUESTION_DELETED);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/answer/rating:
 *   get:
 *     tags: [Product questions]
 *     summary: Get the ratings of all answers for an answer
 *     parameters:
 *       - in: params
 *         name: answerId
 *         required: true
 *         description: The id of the answer to get the ratings of
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: The ratings of the answer
 *         schema:
 *          type: object
 *          properties:
 *            rating:
 *              type: integer
 *              description: The rating of the answer
 *            userFoundReviewHelpful:
 *              type: boolean | undefined
 *              description: If the currently logged in user has rated this answer before, and if they found it helpful
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.get("/answer/rating/:id", verifyToken, (req, res) => {
  if (!req.user) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  getRatingForAnswerToProductQuestion(
    req.params.id,
    req.user.accountType === EAccountTypes.customer
      ? req.user.accountTypeId
      : undefined
  )
    .then((rating) => {
      res.json(rating);
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/answer/rating:
 *   post:
 *     tags: [Product questions]
 *     summary: Give a rating given to an answer
 *     parameters:
 *       - in: body
 *         name: answerId
 *         required: true
 *         description: The id of the question to post the rating of
 *         schema:
 *           type: number
 *       - in: body
 *         name: helpful
 *         required: true
 *         description: If the answer was found helpful or not
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *          description: Answer rating added
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.post("/answer/rating", verifyToken, (req, res) => {
  // User must be a customer to leave a rating for a product
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { answerId, helpful } = req.body;
  if (typeof answerId !== "number" || typeof helpful !== "boolean") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  newRatingForAnswerToProductQuestion(answerId, req.user.accountTypeId, helpful)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res
            .status(EResponseStatusCodes.CREATED_CODE)
            .send(ETextResponse.PRODUCT_QUESTION_ANSWER_RATED);
        case EDatabaseResponses.CONFLICT:
          return res.sendStatus(EResponseStatusCodes.CONFLICT_CODE);
        case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_QUESTION_ANSWER_ID_NOT_EXIST);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/answer/rating:
 *   put:
 *     tags: [Product questions]
 *     summary: Update a rating given to an answer
 *     parameters:
 *       - in: body
 *         name: answerId
 *         required: true
 *         description: The id of the question to update the rating of
 *         schema:
 *           type: number
 *       - in: body
 *         name: helpful
 *         required: true
 *         description: If the answer was found helpful or not
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *          description: Answer rating was updated
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.put("/answer/rating", verifyToken, (req, res) => {
  // User must be a customer to leave a rating for a product
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { answerId, helpful } = req.body;
  if (typeof answerId !== "number" || typeof helpful !== "boolean") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  updateRatingForAnswerToProductQuestion(
    answerId,
    req.user.accountTypeId,
    helpful
  )
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_QUESTION_ANSWER_RATED);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/answer/rating:
 *   delete:
 *     tags: [Product questions]
 *     summary: Remove a rating given to an answer
 *     parameters:
 *       - in: body
 *         name: answerId
 *         required: true
 *         description: The id of the question to remove the rating of
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *          description: Answer rating was removed
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.delete("/answer/rating", verifyToken, (req, res) => {
  // User must be a customer to leave a rating for a product
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { answerId } = req.body;
  if (typeof answerId !== "number") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  deleteRatingToProductQuestion(answerId, req.user.accountTypeId)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res.send(ETextResponse.PRODUCT_QUESTION_ANSWER_RATED_REMOVED);
        case EDatabaseResponses.DOES_NOT_EXIST:
          return res.sendStatus(EResponseStatusCodes.BAD_REQUEST_CODE);
        default:
          return res.sendStatus(
            EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE
          );
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /products/questions/answer/{id}:
 *   get:
 *     tags: [Product questions]
 *     summary: Retrieve a list of all answers to a question
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the question to get the answers for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of all answers to a question
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the answer
 *                 example: 1
 *               answer:
 *                 type: string
 *                 description: The answer to the question
 *               answeredBy:
 *                 type: number
 *                 description: The id of the user who answered the question
 *               answeredOn:
 *                 type: date
 *                 description: The date the answer was created
 *               overallRating:
 *                 type: string
 *                 description: The overall rating of the answer
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.get("/answer/:id", (req, res) => {
  getAnswersForQuestion(req.params.id)
    .then((json) => {
      res.json(json);
    })
    .catch((err) => {
      res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/questions/answer:
 *   post:
 *     tags: [Product questions]
 *     summary: Answer a question
 *     description: Provide an answer to an existing question
 *     parameters:
 *       - in: body
 *         name: questionId
 *         required: true
 *         description: The id of the question the answer is for
 *         schema:
 *           type: number
 *       - in: body
 *         name: answer
 *         required: true
 *         description: A possible answer to the question
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Answer was created for the question
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.post("/answer", verifyToken, (req, res) => {
  // Check shouldn't be needed, but prevents error further down when id is accessed
  if (!req.user) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }

  const { questionId, answer } = req.body;
  if (typeof questionId !== "number" && typeof answer !== "string") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  provideAnswerToProductQuestion(questionId, req.user.user_id, answer)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res
            .status(EResponseStatusCodes.CREATED_CODE)
            .send(ETextResponse.PRODUCT_QUESTION_ANSWER_PROVIDED);
        case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(`${ETextResponse.PRODUCT_QUESTION_ID_NOT_EXISTS}`);
        default:
          return res
            .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
            .send(ETextResponse.INTERNAL_ERROR);
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /product/questions/{id}:
 *   post:
 *     tags: [Product questions]
 *     summary: Ask a new question
 *     description: Ask a new question regarding a product
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the product the question is for
 *         schema:
 *           type: string
 *       - in: body
 *         name: question
 *         required: true
 *         description: The question being asked
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *          description: Question was asked
 *       400:
 *          description: Fields missing in request, or fields invalid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.post("/:id", verifyToken, (req, res) => {
  // Check account permissions, only customers can create questions
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  // Check request body has a question in it
  const { question } = req.body;
  if (typeof question !== "string") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }

  createNewProductQuestion(req.params.id, req.user.accountTypeId, question)
    .then((databaseResponse) => {
      switch (databaseResponse) {
        case EDatabaseResponses.OK:
          return res
            .status(EResponseStatusCodes.CREATED_CODE)
            .send(ETextResponse.PRODUCT_QUESTION_CREATED);
        case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
          return res
            .status(EResponseStatusCodes.BAD_REQUEST_CODE)
            .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
        default:
          return res
            .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
            .send(ETextResponse.INTERNAL_ERROR);
      }
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});

/**
 * @swagger
 * /products/questions/{id}:
 *   get:
 *     tags: [Product questions]
 *     summary: Retrieve a list of questions for a product
 *     parameters:
 *       - in: params
 *         name: id
 *         required: true
 *         description: The id of the product to get the questions for
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of questions
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The id of the question
 *                 example: 1
 *               answer:
 *                 type: string
 *                 description: The question
 *               answeredBy:
 *                 type: number
 *                 description: The id of the customer who asked the question
 *               answeredOn:
 *                 type: date
 *                 description: The date the question was asked
 *       500:
 *          description: Internal server error
 */
productQuestionsRouter.get("/:id", (req, res) => {
  getQuestionsAskedAboutProduct(req.params.id)
    .then((questions) => {
      return res.json(questions);
    })
    .catch((_) => {
      return res
        .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
        .send(ETextResponse.INTERNAL_ERROR);
    });
});
