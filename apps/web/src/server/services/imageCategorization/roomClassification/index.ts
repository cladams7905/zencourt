import { RoomClassification } from "./service";
import { AIVisionError } from "./errors";

const roomClassificationService = new RoomClassification();

export default roomClassificationService;
export { RoomClassification, AIVisionError };
