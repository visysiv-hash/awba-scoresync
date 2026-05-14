Deno.serve(async (req) => {
  try {
    const { pin } = await req.json();
    const correctPin = Deno.env.get("ADMIN_PIN");

    if (!correctPin || pin !== correctPin) {
      return Response.json({ success: false });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});