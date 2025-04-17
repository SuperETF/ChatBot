// handlers/index.js
import auth from "./auth/index.mjs";
import booking from "./booking/index.mjs";
import assignment from "./assignment/index.mjs";
import workout from "./workout/index.mjs";

export const handlers = {
  auth,
  booking,
  assignment,
  workout
};