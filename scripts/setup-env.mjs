import { existsSync, copyFileSync } from "node:fs";

const files = [
  [".env.example", ".env"],
  ["apps/web/.env.example", "apps/web/.env"],
];

for (const [src, dst] of files) {
  if (existsSync(dst)) {
    console.log(`kept existing ${dst}`);
  } else {
    copyFileSync(src, dst);
    console.log(`created ${dst} - edit it with your database credentials`);
  }
}

console.log("\nDone. Next steps:");
console.log("  1. Edit .env and apps/web/.env with your DATABASE_URL and JWT_SECRET");
console.log("  2. npm run db:generate");
console.log("  3. npm run db:migrate");
console.log("  4. npm run db:seed");
console.log("  5. npm run dev");
