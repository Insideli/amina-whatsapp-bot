export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ==========================================
    // 1. ПРОВЕРКА WEBHOOK ОТ META
    // ==========================================
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (
        mode === "subscribe" &&
        token === process.env.VERIFY_TOKEN
      ) {
        console.log("Webhook verified successfully");
        return new Response(challenge, {
          status: 200,
        });
      }

      return new Response("Forbidden", {
        status: 403,
      });
    }

    // ==========================================
    // 2. ПОЛУЧАЕМ СООБЩЕНИЯ ИЗ WHATSAPP
    // ==========================================
    if (request.method === "POST") {
      try {
        const body = await request.json();

        console.log(
          "WHATSAPP WEBHOOK:",
          JSON.stringify(body, null, 2)
        );

        const value =
          body?.entry?.[0]?.changes?.[0]?.value;

        const message =
          value?.messages?.[0];

        // Meta также присылает статусы:
        // sent / delivered / read.
        // На них отвечать не надо.
        if (!message) {
          console.log("No incoming user message");
          return new Response("EVENT_RECEIVED", {
            status: 200,
          });
        }

        // Номер человека, который написал боту
        const customerNumber = message.from;

        // Текст сообщения клиента
        const customerText =
          message?.text?.body || "";

        console.log(
          "CUSTOMER NUMBER:",
          customerNumber
        );

        console.log(
          "CUSTOMER MESSAGE:",
          customerText
        );

        // ==========================================
        // 3. АВТООТВЕТ
        // ==========================================

        const response = await fetch(
          `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${process.env.WHATSAPP_TOKEN}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              messaging_product: "whatsapp",

              recipient_type: "individual",

              to: customerNumber,

              type: "text",

              text: {
                body:
                  "Здравствуйте! 👋\n\n" +
                  "Добро пожаловать в кафе «Амина».\n\n" +
                  "Сейчас отправим вам наше меню 🍽",
              },
            }),
          }
        );

        const resultText =
          await response.text();

        console.log(
          "META SEND STATUS:",
          response.status
        );

        console.log(
          "META SEND RESULT:",
          resultText
        );

        if (!response.ok) {
          console.error(
            "WHATSAPP SEND ERROR:",
            resultText
          );
        } else {
          console.log(
            "WHATSAPP MESSAGE SENT SUCCESSFULLY"
          );
        }

        // Meta должна быстро получить HTTP 200
        return new Response(
          "EVENT_RECEIVED",
          {
            status: 200,
          }
        );
      } catch (error) {
        console.error(
          "WEBHOOK ERROR:",
          error
        );

        return new Response(
          "EVENT_RECEIVED",
          {
            status: 200,
          }
        );
      }
    }

    return new Response(
      "Method Not Allowed",
      {
        status: 405,
      }
    );
  },
};