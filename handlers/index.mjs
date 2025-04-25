// handlers/index.js
import auth from "./auth/index.mjs";
import booking from "./booking/index.mjs";
import assignment from "./assignment/index.mjs";

export const handlers = {
  auth,
  booking,
  assignment,
};