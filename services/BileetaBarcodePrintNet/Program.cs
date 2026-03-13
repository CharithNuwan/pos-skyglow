var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:8080");

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

if (OperatingSystem.IsWindows())
    builder.Host.UseWindowsService();

var app = builder.Build();

app.UsePathBase("/Xprinter");
app.UseCors();
app.MapControllers();

app.Run();
