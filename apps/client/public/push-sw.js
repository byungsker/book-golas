self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "Bookgolas";
  const body = typeof payload.body === "string" && payload.body.trim() ? payload.body : "You have a new reading update.";
  const data = {
    bookId: typeof payload.bookId === "string" ? payload.bookId : null,
    locale: payload.locale === "ko" ? "ko" : "en",
  };
  event.waitUntil(self.registration.showNotification(title, { body, data, tag: typeof payload.tag === "string" ? payload.tag : "bookgolas" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const bookId = typeof data.bookId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.bookId)
    ? data.bookId
    : null;
  const locale = data.locale === "ko" ? "ko" : "en";
  const target = new URL(bookId ? `/${locale}/books/${bookId}` : `/${locale}/home`, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(target);
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
