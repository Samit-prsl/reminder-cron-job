import express, { type Request, type Response } from "express";
import Twilio from "twilio";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const pendingReplies: Map<string, NodeJS.Timeout> = new Map();

const isWithinTimeRange = (): boolean => {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 9 && hours < 24; 
};
const sendReminder = async () => {
  if (!isWithinTimeRange()) return; 

  try {
    await client.messages.create({
      body: "My Sweet Babygurl Sanyaee pleaseeeee have waterrrrr 🥺",
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: process.env.USER_PHONE_NUMBER!,
    });

    console.log("Reminder sent successfully!");

    const timeout = setTimeout(async () => {
      await client.messages.create({
        body: "Sanyaee did not reply to the last reminder.",
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: process.env.YOUR_PHONE_NUMBER!,
      });
      console.log("No reply notification sent!");
    }, 30 * 60 * 1000);
    pendingReplies.set(process.env.USER_PHONE_NUMBER!, timeout as any);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

cron.schedule("0 */2 * * *", sendReminder);

app.post("/sms", async (req: Request, res: Response) => {
  const messageBody = req.body.Body.trim().toLowerCase();
  const fromNumber = req.body.From;

  console.log(`Received reply: "${messageBody}" from ${fromNumber}`);

  if (pendingReplies.has(fromNumber)) {
    clearTimeout(pendingReplies.get(fromNumber)!); 
    pendingReplies.delete(fromNumber);
  }

  if (messageBody === "yes" || messageBody === "no") {
    try {
      await client.messages.create({
        body: `User replied '${messageBody}'.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: process.env.YOUR_PHONE_NUMBER!,
      });
      console.log("Notification sent for reply!");
    } catch (error) {
      console.error("Error sending reply notification:", error);
    }
  }

  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
