const appInternalUrl = process.env.APP_INTERNAL_URL;
const cronSecret = process.env.CRON_SECRET;

if (!appInternalUrl) {
  console.error("APP_INTERNAL_URL is required");
  process.exit(1);
}

if (!cronSecret) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}

const endpoint = new URL("/api/cron/generate-daily", appInternalUrl).toString();

try {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          endpoint,
          status: response.status,
          body,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint,
        status: response.status,
        body,
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        endpoint,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : { message: String(error) },
      },
      null,
      2
    )
  );
  process.exit(1);
}
