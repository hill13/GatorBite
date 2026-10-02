import { seed } from "./db.js";

seed().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
