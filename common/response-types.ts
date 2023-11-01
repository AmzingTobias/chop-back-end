export enum EResponseStatusCodes {
  INTERNAL_SERVER_ERROR_CODE = 500,
  BAD_REQUEST_CODE = 400,
  CREATED_CODE = 201,
  CONFLICT_CODE = 409,
}

export enum ETextResponse {
  INTERNAL_ERROR = "Internal error",
  PRODUCT_TYPE_ALREADY_EXISTS = "Product type name already exists",
  PRODUCT_TYPE_ID_NOT_EXIST = "Product type does not exist",
  MISSING_FIELD_IN_REQ_BODY = "Missing field in request body",
  ID_INVALID_IN_REQ = "Id invalid",
  PRODUCT_TYPE_CREATED = "Product type created",
  PRODUCT_TYPE_UPDATED = "Product type updated",
  PRODUCT_TYPE_DELETED = "Product type removed",
  BRAND_ALREADY_EXISTS = "Brand already exists",
  BRAND_CREATED = "Brand created",
}
