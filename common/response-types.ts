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
  PRODUCT_TYPE_ALREADY_EXISTS = "Product type name already exists",
  PRODUCT_TYPE_ID_NOT_EXIST = "Product does not exist",
  PRODUCT_TYPE_CREATED = "Product type created",
  PRODUCT_TYPE_UPDATED = "Product type updated",
  PRODUCT_TYPE_DELETED = "Product type removed",
  // Brands
  BRAND_ALREADY_EXISTS = "Brand already exists",
  BRAND_ID_NOT_EXIST = "Brand does not exist",
  BRAND_CREATED = "Brand created",
  BRAND_UPDATED = "Brand updated",
  BRAND_DELETED = "Brand deleted",
  // Products
  PRODUCT_ID_NOT_EXISTS = "Product does not exist",
  PRODUCT_CREATED = "Product created",
  PRODUCT_UPDATED = "Product updated",
  PRODUCT_DELETED = "Product deleted",
  // Authentication
  INVALID_AUTH_TOKEN = "Invalid token",
  ACCOUNT_DETAILS_INVALID = "Account details invalid",
  ACCOUNT_TYPE_INVALID = "Incorrect account login",
  ACCOUNT_ALREADY_EXISTS = "Account already exists",
  UNAUTHORIZED_REQUEST = "Account lacks required permissions",
  ACCOUNT_PASS_UPDATED = "Account password updated",
}
