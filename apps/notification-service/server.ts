import app from "./src/app";
import { connectDatabase } from "./src/config/database";
import { seedDefaultTemplates } from "./src/config/seedTemplates";
import { env } from "./src/config/env";

const start = async (): Promise<void> => {
  await connectDatabase();
  await seedDefaultTemplates();

  app.listen(env.port, () => {
    console.log(
      `[NotificationService] Running on port ${env.port} (${env.nodeEnv})`,
    );
    console.log(
      `[NotificationService] Email provider: ${env.sendgrid.enabled ? "SendGrid (live)" : "stub (console)"}`,
    );
  });
};

start().catch((err) => {
  console.error("[NotificationService] Failed to start:", err);
  process.exit(1);
});
