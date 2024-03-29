export enum EResponseStatusCodes {
  INTERNAL_SERVER_ERROR_CODE = 500,
  CREATED_CODE = 201,
  BAD_REQUEST_CODE = 400,
  UNAUTHORIZED_CODE = 401,
  CONFLICT_CODE = 409,
}

export enum ETextResponse {
  INTERNAL_ERROR = "Internal error",
  MISSING_FIELD_IN_REQ_BODY = "Missing field in request body",
  ID_INVALID_IN_REQ = "Id invalid",
  // Product types
  PRODUCT_TYPE_REMOVED_FROM_PRODUCT = "Product type no longer assigned",
  PRODUCT_TYPE_ASSIGNED = "Product type assigned",
  PRODUCT_TYPE_ALREADY_ASSIGNED = "Product type already assigned to product",
  PRODUCT_TYPE_ALREADY_EXISTS = "Product type name already exists",
  PRODUCT_TYPE_ID_NOT_EXIST = "Product type does not exist",
  PRODUCT_TYPE_CREATED = "Product type created",
  PRODUCT_TYPE_UPDATED = "Product type updated",
  PRODUCT_TYPE_DELETED = "Product type removed",
  // Brands
  BRAND_ALREADY_EXISTS = "Brand already exists",
  BRAND_ID_NOT_EXIST = "Brand does not exist",
  BRAND_CREATED = "Brand created",
  BRAND_UPDATED = "Brand updated",
  BRAND_DELETED = "Brand deleted",
  // Base products
  BASE_PRODUCT_CREATED = "Base product created",
  BASE_PRODUCT_UPDATED = "Base product updated",
  BASE_PRODUCT_ID_NOT_EXIST = "Base product does not exist",
  BASE_PRODUCT_DELETED = "Base product deleted",
  // Products
  PRODUCT_ID_NOT_EXISTS = "Product does not exist",
  PRODUCT_CREATED = "Product created",
  PRODUCT_UPDATED = "Product updated",
  PRODUCT_DELETED = "Product deleted",
  PRODUCT_PRICE_SET = "Product price set",
  // Product favourites
  PRODUCT_FAVOURITE_SET = "Product marked as favourite",
  PRODUCT_ALREADY_FAVOURITE = "Product already marked as favourite",
  PRODUCT_FAVOURITE_NOT_SET = "Product was never set as favourite",
  PRODUCT_FAVOURITE_REMOVED = "Product no longer favourited",
  // Product reviews
  PRODUCT_REVIEW_CREATED = "Product review created",
  PRODUCT_REVIEWED_ALREADY = "You've already reviewed this product",
  PRODUCT_REVIEW_UPDATED = "Product review updated",
  PRODUCT_REVIEW_DELETE = "Product review deleted",
  PRODUCT_REVIEW_ID_NOT_EXIST = "Review doesn't exist",
  PRODUCT_REVIEW_NOT_PURCHASED = "Product has not been purchased",
  // Product questions
  PRODUCT_QUESTION_CREATED = "Question created",
  PRODUCT_QUESTION_ID_NOT_EXISTS = "Question does not exist",
  PRODUCT_QUESTION_ANSWER_PROVIDED = "Answer provided",
  PRODUCT_QUESTION_ANSWER_RATED = "Answer rated",
  PRODUCT_QUESTION_ANSWER_RATED_REMOVED = "Answer rating removed",
  PRODUCT_QUESTION_EDITED = "Product question altered",
  PRODUCT_QUESTION_DELETED = "Product question deleted",
  PRODUCT_QUESTION_ANSWER_ID_NOT_EXIST = "Question answer does not exist",
  // Product view history
  PRODUCT_NOT_IN_HISTORY = "Product not in view history",
  // Customer basket
  PRODUCT_ALREADY_IN_BASKET = "Product already in basket",
  PRODUCT_NOT_IN_BASKET = "Product not in basket",
  // Authentication
  INVALID_AUTH_TOKEN = "Invalid token",
  ACCOUNT_DETAILS_INVALID = "Account details invalid",
  ACCOUNT_TYPE_INVALID = "Incorrect account login",
  ACCOUNT_ALREADY_EXISTS = "Account already exists",
  UNAUTHORIZED_REQUEST = "Account lacks required permissions",
  ACCOUNT_PASS_UPDATED = "Account password updated",
  LOGOUT_SUCCESFUL = "Logout succesful",
  // Files
  INVALID_FILE_TYPE = "Invalid file type",
  FILE_UPLOADED = "File uploaded",
  FILE_REMOVED = "File removed",
  FILE_ID_NOT_VALID = "File id not valid",
  IMAGE_SORT_ORDER_UPDATED = "Image sort order updated",
  // Addresses
  ADDRESS_CREATED = "Address created",
  ADDRESS_REMOVED = "Address deleted",
  ADDRESS_UPDATED = "Address updated",
  ADDRESS_ID_NOT_EXIST = "Address does not exist",
  SET_DEFAULT_ADDRESS = "Default address set",
  DEFAULT_ADDRESS_REMOVED = "Default address removed",
  DEFAULT_ADDRESS_NOT_EXIST = "No default address is set",
  ADDRESS_COUNTRY_ID_INVALID = "Country Id is not supported",
  // Orders
  BASKET_INVALID_FOR_ORDER = "Basket contains products no longer available",
  ORDER_CONFIRMED = "Order placed",
  // Discount codes
  DISCOUNT_CODE_NOT_EXIST = "Discount code does not exist",
}
