import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";

const {
  SLACK_SIGNING_SECRET,
  SLACK_BOT_TOKEN,
  PLAIN_USER_ID,
  PORT = 4014,
} = process.env;

const app = express();
app.use(bodyParser.json());

// Verify Slack requests
const verifySlackRequest = (req) => {
  const slackSignature = req.headers["x-slack-signature"];
  const requestTimestamp = req.headers["x-slack-request-timestamp"];
  const body = JSON.stringify(req.body);
  const baseString = `v0:${requestTimestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", SLACK_SIGNING_SECRET)
      .update(baseString)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(slackSignature, "utf8")
  );
};

// Handle Slack events
app.post("/slack/events", async (req, res) => {
  console.log("Hello");

  if (!verifySlackRequest(req)) {
    return res.status(400).send("Verification failed");
  }

  const { type, challenge, event } = req.body;

  // Slack verification challenge
  if (type === "url_verification") {
    return res.json({ challenge });
  }

  // Handle new channel creation
  if (event?.type === "channel_created") {
    const { id: channelId, name: channelName } = event.channel;

    // TODO: we don't need to log this, but might be good for initial testing
    console.log(`New channel created: ${channelName} (${channelId})`);

    // If channel name starts with "sp-", invite a specific user
    if (channelName.startsWith("test-")) {
      try {
        const response = await fetch(
          "https://slack.com/api/conversations.invite",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: channelId,
              users: PLAIN_USER_ID,
            }),
          }
        );

        const result = await response.json();
        if (!result.ok) {
          throw new Error(`Slack API error: ${result.error}`);
        }

        console.log(`✅ Invited user ${PLAIN_USER_ID} to ${channelName}`);
      } catch (error) {
        console.error("❌ Error inviting user:", error.message);
      }
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Fallback route
app.use((req, res) => res.status(404).send("👋"));

// Start the server
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
