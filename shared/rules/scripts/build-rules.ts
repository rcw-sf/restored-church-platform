import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RULES_FRAGMENTS = [
  "helpers.rules",
  "admins.rules",
  "members.rules",
  "finance.rules",
];

const srcDir = path.join(__dirname, "..", "src");
const outputFilePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "firestore.rules",
);

function buildRules() {
  try {
    const mainRulesPath = path.join(srcDir, "main.rules");
    if (!fs.existsSync(mainRulesPath)) {
      throw new Error(`Entrypoint rule file not found: ${mainRulesPath}`);
    }
    const mainContent = fs.readFileSync(mainRulesPath, "utf8");

    const combinedFragments = RULES_FRAGMENTS.map((fileName) => {
      const filePath = path.join(srcDir, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required rule fragment file not found: ${filePath}`);
      }
      return fs.readFileSync(filePath, "utf8");
    }).join("\n");

    const finalContent = mainContent.replace(
      "// {{RULES_CONTENT}}",
      combinedFragments,
    );

    fs.writeFileSync(outputFilePath, finalContent, "utf8");
    console.log(`Successfully compiled firestore.rules -> ${outputFilePath}`);
  } catch (error) {
    console.error("Failed to build rules:", error);
    process.exit(1);
  }
}

buildRules();
