import { RoomClassification } from "./service";
import { RoomClassificationError } from "./errors";

const roomClassificationService = new RoomClassification();

export default roomClassificationService;
export { RoomClassification, RoomClassificationError };
