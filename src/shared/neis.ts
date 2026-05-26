import { NeisClient } from "@timeforschool/client";
import { NEIS_API_KEY } from "../config.js";

export function createNeisClient(): NeisClient {
  return new NeisClient({ key: NEIS_API_KEY });
}
