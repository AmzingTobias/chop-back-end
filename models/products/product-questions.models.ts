import {
  FOREIGN_KEY_VIOLATION,
  UNIQUE_CONSTRAINT_FAILED,
} from "../../common/postgresql-error-codes";
import pool, { EDatabaseResponses, ICustomError } from "../../data/data";

type TProductQuestionAnswers = {
  // The id of the answer
  id: number;
  // The id of the user who answered the question
  answeredBy: number;
  // The answer provided by the user
  answer: string;
  // When the answer provided
  answeredOn: Date;
  overallRating: number;
};

type TProductQuestion = {
  id: number;
  question: string;
  // The id of the user who asked the question
  askedBy: number;
  askedOn: Date;
};

/**
 * Get all questions asked about a product
 * @param productId The id of thg product to get the questions for
 * @returns A list of questions that have been asked regarding the product
 */
export const getQuestionsAskedAboutProduct = (
  productId: number | string
): Promise<TProductQuestion[]> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT id, question, asked_by AS "askedBy", asked_on AS "askedOn" FROM product_questions WHERE product_id = $1`,
      [productId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(res.rows);
        }
      }
    );
  });
};

/**
 * Ask a new question regarding a product
 * @param productId The id of the product the question is for
 * @param customerId The id of the customer who asked the question
 * @param question The question itself being asked
 * @returns EDatabaseResponses.OK if the question is added to the database.
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the product does not exist or
 * if the customer asking the question does not exist. Rejects on database errors
 */
export const createNewProductQuestion = (
  productId: number | string,
  customerId: number,
  question: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO product_questions(product_id, asked_by, question) VALUES ($1, $2, $3)",
      [productId, customerId, question],
      (err: ICustomError, _) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(err);
            reject(err);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};

/**
 * Provide an answer to an asked question
 * @param questionId The id of the question being answered
 * @param accountId The Id of the account that answered the question
 * @param answer The answer provided
 * @returns EDatabaseResponses.OK if the answer is added to the database.
 * EDatabaseResponses.FOREIGN_KEY_VIOLATION if the question does not exist or
 * if the account answering the question does not exist. Rejects on database errors
 */
export const provideAnswerToProductQuestion = (
  questionId: string | number,
  accountId: number,
  answer: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO product_question_answers(question_id, answered_by, answer) VALUES ($1, $2, $3)",
      [questionId, accountId, answer],
      (err: ICustomError, _) => {
        if (err) {
          if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(err);
            reject(err);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};

/**
 * Get all the answers for a question
 * @param questionId The Id of the question to get the answers for
 * @returns TProductQuestionAnswers[] or rejects on database errors
 */
export const getAnswersForQuestion = (
  questionId: number | string
): Promise<TProductQuestionAnswers[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await pool.connect();
      let questionAnswers: TProductQuestionAnswers[] = [];
      let allOkay = true;
      try {
        await client.query("BEGIN");
        const res = await client.query(
          "SELECT id, answer, answered_by AS answeredBy, answered_on AS answeredOn FROM product_question_answers WHERE question_id = $1",
          [questionId]
        );
        questionAnswers = await Promise.all(
          // Loop through each answer to get the overall rating
          res.rows.map(async (answer) => {
            const ratingQuery = `
          SELECT product_question_answers_rating.helpful , COUNT(*) AS count
          FROM product_question_answers_rating
          WHERE answer_id = $1
          GROUP BY product_question_answers_rating.helpful
          `;
            // Format from the query will be
            // [helpful: true, count: 0, helpful:false, count: 0]
            // But not guaranteed that both rows will exist, hence the need for a find and to check if undefined
            const ratingRes = await client.query(ratingQuery, [answer.id]);
            let totalHelpful = 0;
            const helpful = ratingRes.rows.find((row) => row.helpful === true);
            const unhelpful = ratingRes.rows.find(
              (row) => row.helpful === false
            );
            if (helpful !== undefined) {
              totalHelpful += Number(helpful.count);
            }
            if (unhelpful !== undefined) {
              totalHelpful -= Number(unhelpful.count);
            }
            return {
              id: answer.id,
              answer: answer.answer,
              answeredBy: answer.answeredBy,
              answeredOn: answer.answeredOn,
              overallRating: totalHelpful,
            };
          })
        );
        // Sort the answers from most helpful to least
        questionAnswers = questionAnswers.sort(
          (a, b) => b.overallRating - a.overallRating
        );
        await client.query("COMMIT");
      } catch (err) {
        // Probably not needed as nothing in the database is actually changing?
        await client.query("ROLLBACK");
        console.error(err);
        allOkay = false;
      } finally {
        client.release();
        if (allOkay) {
          resolve(questionAnswers);
        } else {
          reject();
        }
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

export const getRatingForAnswerToProductQuestion = (
  answerId: number | string,
  customerId?: number
): Promise<{ rating: number; userFoundReviewHelpful?: boolean }> => {
  return new Promise((resolve, reject) => {
    pool.query(
      `
    SELECT product_question_answers_rating.helpful , COUNT(*) AS count
    FROM product_question_answers_rating
    WHERE answer_id = $1
    GROUP BY product_question_answers_rating.helpful
    `,
      [answerId],
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          let totalHelpful = 0;
          const helpful = res.rows.find((row) => row.helpful === true);
          const unhelpful = res.rows.find((row) => row.helpful === false);
          if (helpful !== undefined) {
            totalHelpful += Number(helpful.count);
          }
          if (unhelpful !== undefined) {
            totalHelpful -= Number(unhelpful.count);
          }
          if (customerId !== undefined) {
            pool.query(
              "SELECT id, helpful FROM product_question_answers_rating WHERE answer_id = $1 AND customer_id = $2",
              [answerId, customerId],
              (err, res) => {
                if (err) {
                  console.error(err);
                  reject(err);
                } else {
                  resolve({
                    rating: totalHelpful,
                    userFoundReviewHelpful:
                      res.rowCount > 0
                        ? (res.rows[0].helpful as boolean)
                        : undefined,
                  });
                }
              }
            );
          } else {
            resolve({ rating: totalHelpful });
          }
        }
      }
    );
  });
};

/**
 * Enter a new rating for a product question answer
 * @param answerId The id of the answer to rate
 * @param customerId The id of the customer rating the answer
 * @param answerWasHelpful True if the answer was helpful, false if not
 * @returns EDatabaseResponses.OK if inserted, EDatabaseResponses.UNIQUE_CONSTRAINT_FAILED if a rating already exists for the user
 * on this answer, EDatabaseResponses.FOREIGN_KEY_VIOLATION if the customer or answer does not exist. Rejects on database errors
 */
export const newRatingForAnswerToProductQuestion = (
  answerId: number,
  customerId: number,
  answerWasHelpful: boolean
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO product_question_answers_rating(answer_id, customer_id, helpful) VALUES ($1, $2, $3)",
      [answerId, customerId, answerWasHelpful],
      (err: ICustomError, _) => {
        if (err) {
          if (err.code === UNIQUE_CONSTRAINT_FAILED) {
            resolve(EDatabaseResponses.CONFLICT);
          } else if (err.code === FOREIGN_KEY_VIOLATION) {
            resolve(EDatabaseResponses.FOREIGN_KEY_VIOLATION);
          } else {
            console.error(err);
            reject(err);
          }
        } else {
          resolve(EDatabaseResponses.OK);
        }
      }
    );
  });
};

/**
 * Update the rating for an answer to a product question
 * @param answerId The id of the answer to rate
 * @param customerId The id of the customer rating the answer
 * @param answerWasHelpful True if the answer was helpful, false if not
 * @returns EDatabaseResponses.OK if updated, EDatabaseResponses.DOES_NOT_EXIST if the rating does not
 * exist to update. Rejects on database errors
 */
export const updateRatingForAnswerToProductQuestion = (
  answerId: number,
  customerId: number,
  answerWasHelpful: boolean
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE product_question_answers_rating SET helpful = $3 WHERE answer_id = $1 AND customer_id = $2",
      [answerId, customerId, answerWasHelpful],
      (err: ICustomError, res) => {
        if (err) {
          console.error(err);
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
 * Delete the rating for an answer to a product question
 * @param answerId
 * @param customerId The id of the customer deleting their rating to an answer
 * @returns EDatabaseResponses.OK if deleted, EDatabaseResponses.DOES_NOT_EXIST if the rating does not
 * exist to delete. Rejects on database errors
 */
export const deleteRatingToProductQuestion = (
  answerId: number,
  customerId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM product_question_answers_rating WHERE answer_id = $1 AND customer_id = $2",
      [answerId, customerId],
      (err, res) => {
        if (err) {
          console.error(err);
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
 * Delete a question asked about a product
 * @param questionId The id of the question to delete
 * @returns EDatabaseResponses.OK if the question is deleted, EDatabaseResponses.DOES_NOT_EXIST if the question
 * does not exist to delete. Rejects on database errors
 */
export const deleteProductQuestion = (
  questionId: number
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM product_questions WHERE id = $1",
      [questionId],
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
 * Edit the question asked about a product
 * @param questionId The id of the question to edit
 * @param updatedQuestion The new question that has been asked
 * @returns EDatabaseResponses.OK if the question is updated, EDatabaseResponses.DOES_NOT_EXIST if the question
 * does not exist to update. Rejects on database errors
 */
export const editProductQuestion = (
  questionId: number,
  updatedQuestion: string
): Promise<EDatabaseResponses> => {
  return new Promise((resolve, reject) => {
    pool.query(
      "UPDATE product_questions SET question = $1 WHERE id = $1",
      [updatedQuestion, questionId],
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
