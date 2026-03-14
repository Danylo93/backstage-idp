var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/ready", () => Results.Ok(new { status = "ready" }));
app.MapGet(
  "/info",
  () =>
    Results.Ok(
      new
      {
        service = "${{ values.name }}",
        owner = "${{ values.owner }}",
        system = "${{ values.system }}",
      }
    )
);

app.Run();
