import fs from "node:fs";
import path from "node:path";
import { KNOWLEDGE_SKILL_PACKS } from "../../src/lib/content/skill-packs.ts";

interface BlueprintCase {
  id: string;
  topic: string;
  expectedStructure: string;
  expectedPatterns: string[];
}

function slug(structureType: string) {
  return "aha-" + structureType.replaceAll("_", "-");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = new Map<string, string>();
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return fields;
}

const root = process.cwd();
const skillRoot = path.join(root, "docs", "knowledge-skills");
const cases = readJson<BlueprintCase[]>(path.join(root, "tests", "fixtures", "blueprint-cases.json"));
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

for (const pack of KNOWLEDGE_SKILL_PACKS) {
  const skillName = slug(pack.structure_type);
  const skillDir = path.join(skillRoot, skillName);
  const skillPath = path.join(skillDir, "SKILL.md");
  const evalPath = path.join(skillDir, "evals", "evals.json");

  if (!fs.existsSync(skillPath)) {
    fail(skillName + ": missing SKILL.md");
    continue;
  }
  if (!fs.existsSync(evalPath)) {
    fail(skillName + ": missing evals/evals.json");
    continue;
  }

  const extraDocs = fs.readdirSync(skillDir).filter((entry) =>
    ["README.md", "CHANGELOG.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md"].includes(entry),
  );
  if (extraDocs.length > 0) fail(skillName + ": contains non-skill auxiliary docs: " + extraDocs.join(", "));

  const markdown = fs.readFileSync(skillPath, "utf8");
  const frontmatter = parseFrontmatter(markdown);
  if (!frontmatter) {
    fail(skillName + ": missing YAML frontmatter");
  } else {
    if (frontmatter.get("name") !== skillName) fail(skillName + ": frontmatter name mismatch");
    const description = frontmatter.get("description") ?? "";
    if (description.length < 80) fail(skillName + ": description is too weak for triggering");
    if (!description.includes(pack.structure_type)) fail(skillName + ": description does not mention structure type");
  }

  if (!markdown.includes("Structure type: `" + pack.structure_type + "`")) fail(skillName + ": missing structure type in body");
  for (const pattern of pack.suitable_patterns) {
    if (!markdown.includes("`" + pattern + "`")) fail(skillName + ": missing suitable Pattern " + pattern);
  }
  for (const pattern of pack.unsuitable_patterns) {
    if (!markdown.includes("`" + pattern + "`")) fail(skillName + ": missing unsuitable Pattern " + pattern);
  }
  for (const step of pack.required_teaching_steps) {
    if (!markdown.includes(step)) fail(skillName + ": missing teaching step " + step);
  }

  const evals = readJson<{
    skill_name: string;
    evals: Array<{ id: number; prompt: string; expected_output: string; files: string[]; expectations: string[] }>;
  }>(evalPath);
  if (evals.skill_name !== skillName) fail(skillName + ": eval skill_name mismatch");

  const expectedCases = cases.filter((item) => item.expectedStructure === pack.structure_type);
  if (evals.evals.length !== expectedCases.length) {
    fail(skillName + ": expected " + expectedCases.length + " evals, got " + evals.evals.length);
  }

  for (const item of expectedCases) {
    const evalItem = evals.evals.find((entry) => entry.prompt.includes(item.topic));
    if (!evalItem) {
      fail(skillName + ": missing eval for topic " + item.topic);
      continue;
    }
    const expectedChain = item.expectedPatterns.join(" -> ");
    if (!evalItem.expected_output.includes(item.expectedStructure)) fail(skillName + ": eval " + item.id + " missing expected structure");
    if (!evalItem.expected_output.includes(expectedChain)) fail(skillName + ": eval " + item.id + " missing expected Pattern chain");
    if (!Array.isArray(evalItem.expectations) || evalItem.expectations.length < 4) fail(skillName + ": eval " + item.id + " has weak expectations");
  }

  console.log(skillName + ": pass (" + expectedCases.length + " evals)");
}

const expectedSkillNames = new Set(KNOWLEDGE_SKILL_PACKS.map((pack) => slug(pack.structure_type)));
if (fs.existsSync(skillRoot)) {
  for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !expectedSkillNames.has(entry.name)) fail("unexpected skill directory: " + entry.name);
  }
}

console.log("skills: " + KNOWLEDGE_SKILL_PACKS.length);
console.log("overall: " + (failures.length === 0 ? 1 : 0));
if (failures.length > 0) {
  console.log("failed_checks:");
  for (const failure of failures) console.log("- " + failure);
  process.exit(1);
}
