import {
  EOrderEmailTypes,
  TProductsInOrderForEmail,
  sendOrderUpdateEmail,
} from "../email/EmailClient";
import { getAddressWithId } from "../models/auth/address-book.model";
import { getAccountEmailWithCustomerId } from "../models/auth/auth.models";
import { getImagesForProduct } from "../models/images.models";
import {
  getCustomerIdForOrderId,
  getDiscountsUsedForOrder,
  getOrderDetails,
  getProductsInOrder,
} from "../models/orders.models";

/**
 * Send an email for the order
 * @param orderId The id of the order the email is for
 * @param emailType The type of email being sent for an order
 */
export const sendOrderEmail = async (
  orderId: number,
  emailType: EOrderEmailTypes
) => {
  try {
    const customerId = await getCustomerIdForOrderId(orderId);

    if (customerId !== null) {
      // Get customer's email
      const email = await getAccountEmailWithCustomerId(customerId);
      // Get the price paid and total price of the order
      const orderDetails = await getOrderDetails(orderId);
      // Get the products that are included in the order
      const productsInOrder = await getProductsInOrder(orderId);

      const productsForEmail: TProductsInOrderForEmail[] = await Promise.all(
        productsInOrder.map(async (product) => {
          const productImages = await getImagesForProduct(product.productId);
          const productDetails: TProductsInOrderForEmail = {
            name: product.productName,
            quantity: product.quantity,
            price: product.price.toFixed(2),
            image:
              productImages.length > 0
                ? `${process.env.HOST_ADDRESS_FOR_IMAGES}/images/products/${product.productId}/${productImages[0].fileName}`
                : `${process.env.HOST_ADDRESS_FOR_IMAGES}/images/products/no-product.png`,
          };
          return productDetails;
        })
      );
      // Get the disocunt codes used if any
      const discountsUsedInOrder = await getDiscountsUsedForOrder(orderId);
      // Get address that was used in the order
      if (orderDetails !== null) {
        const addressUsed = await getAddressWithId(
          orderDetails.shippingAddressId
        );
        if (addressUsed !== null && email !== null) {
          sendOrderUpdateEmail(
            email,
            {
              address: {
                firstAddressLine: addressUsed.firstAddressLine,
                secondAddressLine:
                  addressUsed.secondAddressLine === undefined ||
                  addressUsed.secondAddressLine === null
                    ? ""
                    : addressUsed.secondAddressLine,
                areaCode: addressUsed.areaCode,
                countryState: addressUsed.countryState,
                countryName:
                  addressUsed.countryName === undefined ||
                  addressUsed.countryName === null
                    ? ""
                    : addressUsed.countryName,
              },
              orderId: orderId,
              discountsUsed: discountsUsedInOrder,
              orderStatus: orderDetails.status,
              products: productsForEmail,
              total: orderDetails.total,
              pricePaid: orderDetails.pricePaid,
            },
            emailType
          );
        } else {
          console.error("Failed to get address and email for email");
        }
      } else {
        console.error("Failed to get order details for email");
      }
    } else {
      console.error("Failed to get customer Id for email");
    }
  } catch (err) {
    console.error(err);
  }
};
