/**
 * Admin accounts for /admin. There is no sign-up page: accounts exist only through this script, run by someone with
 * the database credentials.
 *
 *   npm run admin -- create you@company.com "Your Name"   new admin: prints a password, once
 *   npm run admin -- reset you@company.com                new password; signs them out everywhere
 *   npm run admin -- disable you@company.com              blocks sign-in and ends their sessions (enable undoes it)
 *   npm run admin -- enable you@company.com
 *   npm run admin -- list
 *   npm run admin -- sign-out-all                         ends every admin session
 *
 * Needs MONGODB_URI (.env.local).
 */
import { MongoClient } from "mongodb";
import { hashPassword, newPassword } from "../src/lib/admin/crypto.ts";

const [cmd, emailIn, name = ""] = process.argv.slice(2);
const { MONGODB_URI: uri, MONGODB_DB: dbName = "chimelong" } = process.env;
if (!uri) throw new Error("Set MONGODB_URI in .env.local");
const email = emailIn?.trim().toLowerCase();
const needsEmail = ["create", "reset", "disable", "enable"].includes(cmd);
if (!cmd || (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? ""))) {
  console.log("Usage: npm run admin -- create|reset|disable|enable <email> [name]   |   list   |   sign-out-all");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
const db = client.db(dbName);
const admins = db.collection("admins");
const sessions = db.collection("admin_sessions");
const audit = (action, detail) => db.collection("admin_audit").insertOne({ at: new Date(), adminId: null, email, action, detail, ip: "cli" });

/** The one time this is shown: it isn't stored in a readable form anywhere. */
function show(password) {
  console.log(`
  Email      ${email}
  Password   ${password}

  Sign in at /admin/login. Store the password in a password manager; it isn't shown again.
`);
}

try {
  if (cmd === "create") {
    if (await admins.findOne({ email })) throw new Error(`${email} is already an admin (use reset)`);
    const password = newPassword();
    await admins.insertOne({
      email,
      name: name.slice(0, 80),
      passwordHash: await hashPassword(password),
      disabled: false,
      createdAt: new Date(),
      lastLoginAt: null,
    });
    await audit("admin_created");
    show(password);
  } else if (cmd === "reset") {
    const password = newPassword();
    const r = await admins.findOneAndUpdate(
      { email },
      { $set: { passwordHash: await hashPassword(password), disabled: false }, $unset: { totpSealed: "", lastTotpStep: "" } },
    );
    if (!r) throw new Error(`${email} isn't an admin`);
    const { deletedCount } = await sessions.deleteMany({ adminId: r._id });
    await audit("admin_reset", `${deletedCount} sessions ended`);
    show(password);
  } else if (cmd === "disable" || cmd === "enable") {
    const r = await admins.findOneAndUpdate({ email }, { $set: { disabled: cmd === "disable" } });
    if (!r) throw new Error(`${email} isn't an admin`);
    const ended = cmd === "disable" ? (await sessions.deleteMany({ adminId: r._id })).deletedCount : 0;
    await audit(`admin_${cmd}d`, ended ? `${ended} sessions ended` : undefined);
    console.log(`${email} ${cmd}d${ended ? `, ${ended} sessions ended` : ""}`);
  } else if (cmd === "list") {
    const all = await admins.find({}, { projection: { email: 1, name: 1, disabled: 1, lastLoginAt: 1 } }).sort({ email: 1 }).toArray();
    for (const a of all) console.log(`${a.disabled ? "disabled" : "active  "}  ${a.email}  ${a.name ?? ""}  last sign-in ${a.lastLoginAt?.toISOString() ?? "never"}`);
    if (!all.length) console.log("No admins yet: npm run admin -- create you@company.com");
  } else if (cmd === "sign-out-all") {
    const { deletedCount } = await sessions.deleteMany({});
    await audit("sign_out_all", `${deletedCount} sessions ended`);
    console.log(`${deletedCount} sessions ended`);
  } else {
    throw new Error(`Unknown command "${cmd}"`);
  }
} finally {
  await client.close();
}
