export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Проверка webhook со стороны Meta
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (
        mode === "subscribe" &&
        token === process.env.VERIFY_TOKEN
      ) {
        return new Response(challenge, { status: 200 });
      }

      return new Response("Forbidden", { status: 403 });
    }

    // Входящие события WhatsApp
    if (request.method === "POST") {
      try {
        const body = await request.json();

        console.log(
          "WhatsApp webhook:",
          JSON.stringify(body, null, 2)
        );

        const value =
          body.entry?.[0]?.changes?.[0]?.value;

        const message = value?.messages?.[0];

        // Некоторые webhook-события — это просто статусы
        // sent / delivered / read, поэтому сообщения там может не быть
        if (!message) {
          return new Response("EVENT_RECEIVED", {
            status: 200,
          });
        }

        const customerNumber = message.from;

        await fetch(
          `https://graph.facebook.com/v26.0/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: customerNumber,
              type: "text",
              text: {
                body:
                  "Здравствуйте! 👋\n\n" +
                  "Добро пожаловать в кафе «Амина».\n" +
                  "Сейчас отправим вам наше меню 🍽",
              },
            }),
          }
        );

        return new Response("EVENT_RECEIVED", {
          status: 200,
        });
      } catch (error) {
        console.error("Webhook error:", error);

        return new Response("EVENT_RECEIVED", {
          status: 200,
        });
      }
    }

    return new Response("Method Not Allowed", {
      status: 405,
    });
  },
};