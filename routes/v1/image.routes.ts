import { Router } from "express";
import multer from "multer";
import path from "path";
import fileSystem from "fs";
import {
  EResponseStatusCodes,
  ETextResponse,
} from "../../common/response-types";
import {
  addImageForProduct,
  deleteImageForProduct,
  getImagesForProduct,
} from "../../models/images.models";
import { EDatabaseResponses } from "../../data/data";
import { deleteSavedFile } from "../../common/image";
import { EAccountTypes, verifyToken } from "../../security/security";

// The express url path to find images
export const expressProductImagePath = "/images/products";

// The multer storage setup for product images
const productImageStorage = multer.diskStorage({
  destination: function (req, _, cb) {
    // Validate the product Id, as this is part of the folder name
    const { id } = req.params;
    if (!Number.isNaN(Number(id))) {
      const imageDestinationPath = path.join(
        __dirname,
        `../../product-images/${id}`
      );
      // Make the directory to the image if it doesn't already exists
      fileSystem.mkdirSync(imageDestinationPath, { recursive: true });
      cb(null, imageDestinationPath);
    } else {
      cb(new Error("Product id not specified"), "../../product-images/");
    }
  },
  filename: function (_, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    // Validate the file is an image
    if (extension === ".png" || extension === ".jpeg" || extension === ".jpg") {
      cb(null, file.fieldname + "-" + uniqueSuffix + extension);
    } else {
      cb(new Error("Invalid file type"), "");
    }
  },
});
const productImageUpload = multer({ storage: productImageStorage });

export const imageRouter = Router();

/**
 * @swagger
 * /images/product/{id}:
 *   post:
 *     tags: [Products, Images]
 *     summary: Add a new image to a product
 *     description: Upload a new image to a product.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to add the image to
 *         schema:
 *           type: integer
 *       - in: body
 *         name: image
 *         required: true
 *         description: The image file to upload for the product
 *         schema:
 *           type: file
 *     responses:
 *       201:
 *         description: Image was uploaded for the product
 *       409:
 *          description: Should not occur
 *       400:
 *          description: Missing required fields, or product id is not valid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
imageRouter.post("/product/:id", verifyToken, (req, res) => {
  // Validate permissions
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  productImageUpload.single("image")(req, res, async function (err) {
    if (req.file === undefined) {
      return res
        .status(EResponseStatusCodes.BAD_REQUEST_CODE)
        .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
    }
    if (err instanceof multer.MulterError) {
      console.error(`Multer error: ${err}`);
      return res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    } else if (err) {
      if (err.message === "Invalid file type") {
        return res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(ETextResponse.INVALID_FILE_TYPE);
      } else {
        console.error(`My error: ${err}`);
        return res
          .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
          .send(ETextResponse.INTERNAL_ERROR);
      }
    } else {
      // Image was saved on to the server
      try {
        const added = await addImageForProduct(Number(id), req.file.filename);
        switch (added) {
          case EDatabaseResponses.OK:
            return res
              .status(EResponseStatusCodes.CREATED_CODE)
              .send(ETextResponse.FILE_UPLOADED);
          case EDatabaseResponses.CONFLICT:
            await deleteSavedFile(req.file.path);
            return res
              .status(EResponseStatusCodes.CONFLICT_CODE)
              .send(ETextResponse.INTERNAL_ERROR);
          case EDatabaseResponses.FOREIGN_KEY_VIOLATION:
            await deleteSavedFile(req.file.path);
            return res
              .status(EResponseStatusCodes.BAD_REQUEST_CODE)
              .send(ETextResponse.PRODUCT_ID_NOT_EXISTS);
          default:
            await deleteSavedFile(req.file.path);
            return res
              .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
              .send(ETextResponse.INTERNAL_ERROR);
        }
      } catch (_) {
        try {
          await deleteSavedFile(req.file.path);
        } catch (err) {
          console.error("Failed to delete file");
        } finally {
          return res
            .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
            .send(ETextResponse.INTERNAL_ERROR);
        }
      }
    }
  });
});

/**
 * @swagger
 * /images/product:
 *   delete:
 *     tags: [Products, Images]
 *     summary: Delete an image for a product
 *     description: Delete an image for a product using the image id.
 *     parameters:
 *       - in: body
 *         name: image-id
 *         required: true
 *         description: The id of the image to remove
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Image was deleted
 *       400:
 *          description: Missing required fields, or image id is not valid
 *       401:
 *          description: Account lacks required permissions
 *       500:
 *          description: Internal server error
 */
imageRouter.delete("/product", verifyToken, async (req, res) => {
  // Validate permissions
  if (
    !req.user ||
    (req.user.accountType !== EAccountTypes.admin &&
      req.user.accountType !== EAccountTypes.sales)
  ) {
    return res
      .status(EResponseStatusCodes.UNAUTHORIZED_CODE)
      .send(ETextResponse.UNAUTHORIZED_REQUEST);
  }
  const { "image-id": imageId } = req.body;
  if (typeof imageId !== "number") {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.MISSING_FIELD_IN_REQ_BODY);
  }
  try {
    const deleted = await deleteImageForProduct(imageId);
    switch (deleted) {
      case EDatabaseResponses.OK:
        return res.send(ETextResponse.FILE_REMOVED);
      case EDatabaseResponses.DOES_NOT_EXIST:
        return res
          .status(EResponseStatusCodes.BAD_REQUEST_CODE)
          .send(ETextResponse.FILE_ID_NOT_VALID);
      default:
        return res.status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    }
  } catch (_) {
    res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});

/**
 * @swagger
 * /images/product/{id}:
 *   get:
 *     tags: [Products, Images]
 *     summary: Get all images for a product
 *     description: Get all images for a product, sorted by their sort position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the product to get the images for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: An object with details of the products.
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The id of the image.
 *             fileName:
 *               type: string
 *               description: The filename of the image
 *       500:
 *          description: Internal server error
 */
imageRouter.get("/product/:id", async (req, res) => {
  const { id } = req.params;
  if (Number.isNaN(Number(id))) {
    return res
      .status(EResponseStatusCodes.BAD_REQUEST_CODE)
      .send(ETextResponse.ID_INVALID_IN_REQ);
  }
  try {
    const images = await getImagesForProduct(Number(id));
    res.json(images);
  } catch (_) {
    return res
      .status(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE)
      .send(ETextResponse.INTERNAL_ERROR);
  }
});
