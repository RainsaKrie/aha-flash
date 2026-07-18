import {
  clearPublicBetaData,
  createInvite,
  listInvites,
  revokeInvite,
} from "../src/lib/public-beta/repository.ts";

function option(name: string) {
  const prefix = "--" + name + "=";
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function printUsage() {
  console.log([
    "Public beta admin",
    "",
    "Commands:",
    "  create-invite --label=friend --max-uses=20 --days=14",
    "  list-invites",
    "  revoke-invite --code=aha_xxx",
    "  revoke-invite --hash=<sha256>",
    "  clear --confirm=yes",
  ].join("\n"));
}

async function main() {
  const command = process.argv[2];
  if (command === "create-invite") {
    const maxUses = Number.parseInt(option("max-uses") || "20", 10);
    const days = Number.parseInt(option("days") || "14", 10);
    const expiresAt = new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString();
    const created = await createInvite({
      label: option("label"),
      maxUses: Number.isFinite(maxUses) ? maxUses : 20,
      expiresAt,
    });
    console.log("Invite created. This plaintext code is shown once:");
    console.log(created.code);
    console.log(JSON.stringify({
      hash: created.record.hash,
      label: created.record.label,
      maxUses: created.record.maxUses,
      expiresAt: created.record.expiresAt,
    }, null, 2));
    return;
  }
  if (command === "list-invites") {
    console.log(JSON.stringify(await listInvites(), null, 2));
    return;
  }
  if (command === "revoke-invite") {
    const codeOrHash = option("code") || option("hash");
    if (!codeOrHash) throw new Error("Pass --code=... or --hash=...");
    console.log(await revokeInvite(codeOrHash) ? "Invite revoked." : "Invite not found.");
    return;
  }
  if (command === "clear") {
    if (option("confirm") !== "yes") {
      throw new Error("Refusing to clear data without --confirm=yes");
    }
    console.log("Cleared " + await clearPublicBetaData() + " public-beta keys.");
    return;
  }
  printUsage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
