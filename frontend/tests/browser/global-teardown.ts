import { execFileSync } from "node:child_process";

export default function globalTeardown() {
  execFileSync("bash", ["tests/browser/drop-isolated-db.sh"], {
    stdio: "inherit",
  });
}
