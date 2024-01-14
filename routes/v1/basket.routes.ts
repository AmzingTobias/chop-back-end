import { Router } from "express";
import basketWebSockets from "../../data/websockets";
import { EAccountTypes, verifyToken } from "../../security/security";
import { EResponseStatusCodes } from "../../common/response-types";
import { getAllProductsInBasket } from "../../models/basket.models";
import WebSocket from "ws";

const basketRouter = Router();

// Create an express-ws instance for the router
require("express-ws")(basketRouter);

basketRouter.ws("/updates", (ws, req) => {
  const sessionId: string | undefined = req.sessionId;
  if (
    req.user &&
    req.user.accountType === EAccountTypes.customer &&
    typeof sessionId === "string"
  ) {
    const customerId: number = req.user.accountTypeId;
    // Check if a customer already has a Map for their session ids
    if (!basketWebSockets.has(customerId)) {
      // If not, create one
      basketWebSockets.set(customerId, new Map<string, WebSocket>());
    }
    // Then add to the customer's map their current session id
    basketWebSockets.get(customerId)!.set(sessionId, ws);
    ws.on("close", () => {
      basketWebSockets.get(customerId)!.delete(sessionId);
      if (basketWebSockets.size <= 0) {
        basketWebSockets.delete(customerId);
      }
    });
  }
});

basketRouter.get("/", verifyToken, (req, res) => {
  if (!req.user || req.user.accountType !== EAccountTypes.customer) {
    return res.sendStatus(EResponseStatusCodes.UNAUTHORIZED_CODE);
  }
  const customerId = req.user.accountTypeId;
  getAllProductsInBasket(customerId)
    .then((basketContents) => {
      const allCustomerSockets = basketWebSockets.get(customerId);
      return res.json(basketContents);
    })
    .catch((_) => {
      res.sendStatus(EResponseStatusCodes.INTERNAL_SERVER_ERROR_CODE);
    });
});

export default basketRouter;
