# tavern

import { Package } from "./src/package-json";
import { waitRandomly } from "./src/utils";

<Package name="tavern" version="0.0.1" />

<Task name="hello" onRun={waitRandomly} />
