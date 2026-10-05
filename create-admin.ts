import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { adminUsers } from "../src/db/schema";
import { hashPassword } from "../src/lib/admin-auth";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase("pt-BR");
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrador Lagos Hoje";

  if (!email || !password) {
    console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o administrador.");
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("Use uma senha administrativa com no mínimo 10 caracteres.");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  const passwordHash = await hashPassword(password);

  if (existing) {
    await db
      .update(adminUsers)
      .set({ passwordHash, name })
      .where(eq(adminUsers.id, existing.id));
    console.log(`Administrador ${email} atualizado.`);
  } else {
    await db.insert(adminUsers).values({ email, passwordHash, name });
    console.log(`Administrador ${email} criado.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
